import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Species } from '../models';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';

// Base aparte de la cola de audios: así no toco la versión ni la migración de alasonora-offline.
const DB_NAME = 'alasonora-offline-log';
const STORE_NAME = 'recordings-log';
const DB_VERSION = 1;
const DAY_MS = 24 * 60 * 60 * 1000;

export type OfflineRecordingOutcome = 'synced' | 'failed';

/** Lo que recuerdo de una grabación offline ya procesada: nunca el audio. */
export interface OfflineRecordingLogEntry {
  /** El mismo id que tuvo en la cola, para reemplazar su fila "pendiente" sin duplicarla. */
  id: string;
  recordedAt: string;
  processedAt: string;
  outcome: OfflineRecordingOutcome;
  detectionId?: string;
  species?: Pick<Species, 'commonName' | 'commonNameEn' | 'scientificName'>;
}

/** Guardo en el dispositivo el resultado de cada grabación offline, con un tope de cantidad y antigüedad. */
@Injectable({ providedIn: 'root' })
export class OfflineRecordingsLogService {
  private readonly logger = inject(LoggerService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly limits = environment.offlineRecordingsLog;
  private dbPromise: Promise<IDBDatabase> | null = null;

  readonly entries = signal<OfflineRecordingLogEntry[]>([]);

  constructor() {
    if (this.isBrowser) void this.refresh();
  }

  /** Nunca lanza: si IndexedDB falla, la sincronización sigue igual y solo pierdo el registro. */
  async record(entry: OfflineRecordingLogEntry): Promise<void> {
    try {
      const kept = this.prune([entry, ...(await this.readAll()).filter((e) => e.id !== entry.id)]);
      await this.write((store) => {
        store.clear();
        kept.forEach((e) => store.put(e));
      });
      this.entries.set(kept);
    } catch (error) {
      this.logger.warn('OfflineLog', 'could not save the offline recording log', error);
    }
  }

  /** Al borrar una detección quito su fila para no dejar un enlace a algo que ya no existe. Nunca lanza. */
  async forgetDetection(detectionId: string): Promise<void> {
    try {
      const kept = (await this.readAll()).filter((e) => e.detectionId !== detectionId);
      await this.write((store) => {
        store.clear();
        kept.forEach((e) => store.put(e));
      });
      this.entries.set(this.prune(kept));
    } catch (error) {
      this.logger.warn('OfflineLog', 'could not remove the deleted detection from the log', error);
    }
  }

  async clear(): Promise<void> {
    this.entries.set([]);
    if (!this.isBrowser) return;
    try {
      await this.write((store) => store.clear());
    } catch (error) {
      this.logger.warn('OfflineLog', 'could not clear the offline recording log', error);
    }
  }

  async refresh(): Promise<void> {
    try {
      this.entries.set(this.prune(await this.readAll()));
    } catch (error) {
      this.logger.warn('OfflineLog', 'could not read the offline recording log', error);
    }
  }

  // Dejo las más recientes dentro del límite de días y de cantidad.
  private prune(entries: OfflineRecordingLogEntry[]): OfflineRecordingLogEntry[] {
    const oldest = Date.now() - this.limits.maxAgeDays * DAY_MS;
    return entries
      .filter((e) => Date.parse(e.processedAt) >= oldest)
      .sort((a, b) => b.processedAt.localeCompare(a.processedAt))
      .slice(0, this.limits.maxEntries);
  }

  private async readAll(): Promise<OfflineRecordingLogEntry[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as OfflineRecordingLogEntry[]);
      request.onerror = () => reject(request.error);
    });
  }

  private async write(change: (store: IDBObjectStore) => void): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      change(tx.objectStore(STORE_NAME));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }
}
