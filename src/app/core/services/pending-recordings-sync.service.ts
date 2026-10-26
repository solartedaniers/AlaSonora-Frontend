import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Detection, GeoLocation } from '../models';
import { ClassificationService } from './classification.service';
import { DetectionsService } from './detections.service';
import { OfflineStorageService, PendingRecording } from './offline-storage.service';
import { UserService } from './user.service';
import { LoggerService } from './logger.service';
import { OfflineRecordingLogEntry, OfflineRecordingOutcome, OfflineRecordingsLogService } from './offline-recordings-log.service';

/** Debe coincidir con PENDING_RECORDINGS_SYNC_TAG en public/sw.js. */
export const PENDING_RECORDINGS_SYNC_TAG = 'alasonora-pending-recordings';

// Cerros Orientales de Bogotá como ubicación de respaldo si se niega o falla la
// geolocalización: toda detección necesita un punto en el mapa.
export const FALLBACK_LOCATION: GeoLocation = { latitude: 4.6097, longitude: -74.0817 };

/**
 * Envío solas las grabaciones que quedaron en IndexedDB sin señal: al recibir el sync del service worker,
 * con el evento online (Firefox/Safari) o al arrancar la app.
 */
@Injectable({ providedIn: 'root' })
export class PendingRecordingsSyncService implements OnDestroy {
  private readonly offlineStorage = inject(OfflineStorageService);
  private readonly logger = inject(LoggerService);
  private readonly classificationService = inject(ClassificationService);
  private readonly detectionsService = inject(DetectionsService);
  private readonly userService = inject(UserService);
  private readonly offlineLog = inject(OfflineRecordingsLogService);

  private started = false;
  /** Sin Web Locks encadeno las sincronizaciones aquí: solo protege esta pestaña, no las demás. */
  private localQueue: Promise<void> = Promise.resolve();
  private readonly onOnline = () => void this.syncNow();
  private readonly onServiceWorkerMessage = async ({ data, ports }: MessageEvent) => {
    if (data?.type !== PENDING_RECORDINGS_SYNC_TAG) return;
    await this.syncNow();
    // Le digo al SW si la sincronización terminó de verdad; si no, falla el
    // evento `sync` y el navegador lo reintenta.
    ports[0]?.postMessage({ remaining: (await this.offlineStorage.listPending()).length });
  };

  /** Solo en el navegador; instalo los listeners una sola vez aunque me llamen de nuevo. */
  start(): void {
    if (this.started) return;
    this.started = true;
    window.addEventListener('online', this.onOnline);
    navigator.serviceWorker?.addEventListener('message', this.onServiceWorkerMessage);
    void this.syncNow();
  }

  ngOnDestroy(): void {
    if (!this.started) return;
    window.removeEventListener('online', this.onOnline);
    navigator.serviceWorker?.removeEventListener('message', this.onServiceWorkerMessage);
    this.started = false;
  }

  async enqueue(recording: Omit<PendingRecording, 'id'>): Promise<void> {
    await this.offlineStorage.enqueue({ id: crypto.randomUUID(), ...recording });
    const registration = await navigator.serviceWorker?.getRegistration();
    // SyncManager aún no está en la lib DOM de TypeScript; fuera de Chromium no
    // existe y el listener `online` de arriba cubre el mismo caso.
    const sync = (registration as { sync?: { register(tag: string): Promise<void> } } | undefined)?.sync;
    await sync?.register(PENDING_RECORDINGS_SYNC_TAG).catch(() => undefined);
  }

  async syncNow(): Promise<void> {
    if (!navigator.onLine) return;
    // Con el Web Lock vacío la cola de a una vez, también entre pestañas: así nunca subo ni guardo dos veces la misma grabación.
    await this.runExclusively(() => this.drain());
  }

  private runExclusively(task: () => Promise<void>): Promise<void> {
    if (navigator.locks) return navigator.locks.request(PENDING_RECORDINGS_SYNC_TAG, task);
    this.localQueue = this.localQueue.then(task, task);
    return this.localQueue;
  }

  private async drain(): Promise<void> {
    const userId = await this.userService.getUserId();
    if (!userId) return;

    for (const recording of await this.offlineStorage.listPending()) {
      let entry: OfflineRecordingLogEntry;
      try {
        entry = PendingRecordingsSyncService.logEntry(recording, 'synced', await this.send(userId, recording));
      } catch (error) {
        // Un 422 es un rechazo definitivo del audio, así que lo saco de la cola; cualquier otro fallo se reintenta luego.
        if (!(error instanceof HttpErrorResponse && error.status === 422)) return;
        this.logger.warn('PendingSync', 'queued recording rejected by the classifier, dropping it', error);
        entry = PendingRecordingsSyncService.logEntry(recording, 'failed');
      }
      // Anoto el resultado antes de borrar el audio, así la fila nunca desaparece de la vista.
      await this.offlineLog.record(entry);
      await this.offlineStorage.remove(recording.id);
    }
  }

  private static logEntry(
    recording: PendingRecording,
    outcome: OfflineRecordingOutcome,
    detection?: Detection,
  ): OfflineRecordingLogEntry {
    const species = detection?.species;
    return {
      id: recording.id,
      recordedAt: recording.recordedAt,
      processedAt: new Date().toISOString(),
      outcome,
      detectionId: detection?.id,
      species: species && {
        commonName: species.commonName,
        commonNameEn: species.commonNameEn,
        scientificName: species.scientificName,
      },
    };
  }

  // Los mismos pasos del flujo en línea (RecordingComponent → ResultComponent) sin la
  // pantalla de revisión: nadie la revisa, así que la guardo PRIVATE y aparece en el historial.
  private async send(userId: string, recording: PendingRecording): Promise<Detection> {
    const { storagePath, signedUrl } = await this.classificationService.uploadRecording(userId, recording.audioBlob);
    const result = await this.classificationService.classify(signedUrl, recording.recordedAt, recording.gpsLocation);
    return this.detectionsService.create({
      speciesId: result.species.id,
      recordedAt: recording.recordedAt,
      audioStoragePath: storagePath,
      durationSeconds: recording.durationSeconds,
      confidence: result.confidence,
      peakFrequencyHz: recording.peakFrequencyHz,
      alternatives: result.alternatives.map((a) => ({ speciesId: a.species.id, confidence: a.confidence })),
      location: recording.gpsLocation ?? FALLBACK_LOCATION,
      observerName: this.userService.currentUser()?.username,
      visibility: 'PRIVATE',
    });
  }
}
