import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseClientService } from './supabase-client.service';

export type AiEngineStatus = 'unknown' | 'waking' | 'ready' | 'unavailable';

interface AiStatusResponse {
  ready: boolean;
}

/** Resultado de una consulta: listo, el backend respondió que aún no, falló la consulta o no hay sesión. */
type StatusCheck = 'ready' | 'notReady' | 'failed' | 'signedOut';

const UNAUTHORIZED = 401;

/**
 * Estado del motor de IA, que en Render se duerme por inactividad. Pregunto al backend
 * (GET /api/ai/status), nunca al motor directo; el backend lo despierta en segundo plano.
 * Solo consulto mientras no está listo: al encender, al cerrar sesión o con un 401 dejo de preguntar.
 */
@Injectable({ providedIn: 'root' })
export class AiEngineStatusService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly config = environment.aiEngine;

  readonly status = signal<AiEngineStatus>('unknown');
  readonly ready = computed(() => this.status() === 'ready');
  private lastReadyAt = 0;
  /** Un solo sondeo a la vez, compartido por quien esté esperando. */
  private pending: Promise<boolean> | null = null;
  /** Cambia al cerrar sesión: el sondeo en curso ve que ya no es el suyo y termina. */
  private session = 0;

  constructor() {
    if (!this.isBrowser) return;
    inject(SupabaseClientService).client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') this.stop();
    });
  }

  /** Despierta el motor en silencio; no hace nada si hace poco respondió que estaba listo. */
  warmUp(): void {
    if (this.isFresh()) return;
    void this.whenReady();
  }

  /** Se resuelve en true cuando el motor responde, o en false si se agota el tiempo o se cierra la sesión. */
  whenReady(): Promise<boolean> {
    if (!this.isBrowser) return Promise.resolve(false);
    if (this.isFresh()) return Promise.resolve(true);
    if (!this.pending) {
      const pending = this.poll().finally(() => {
        if (this.pending === pending) this.pending = null;
      });
      this.pending = pending;
    }
    return this.pending;
  }

  /** El backend dijo que el motor no respondió: lo vuelvo a dar por dormido. */
  markAsleep(): void {
    this.lastReadyAt = 0;
    this.status.set('waking');
  }

  private stop(): void {
    this.session++;
    this.pending = null;
    this.lastReadyAt = 0;
    this.status.set('unknown');
  }

  private async poll(): Promise<boolean> {
    const session = this.session;
    // El backend también puede estar dormido: su plazo corre primero y el del motor desde su primera respuesta.
    let deadline = Date.now() + this.config.backendWakeTimeoutMs;
    let backendAwake = false;
    this.status.set('waking');
    while (Date.now() < deadline) {
      const check = await this.check();
      if (session !== this.session) return false;
      if (check === 'signedOut') {
        this.stop();
        return false;
      }
      if (check === 'ready') {
        this.lastReadyAt = Date.now();
        this.status.set('ready');
        return true;
      }
      if (check === 'notReady' && !backendAwake) {
        backendAwake = true;
        deadline = Date.now() + this.config.wakeTimeoutMs;
      }
      await new Promise((resolve) => setTimeout(resolve, this.config.statusPollMs));
      if (session !== this.session) return false;
    }
    this.status.set('unavailable');
    return false;
  }

  private async check(): Promise<StatusCheck> {
    try {
      const response = await firstValueFrom(this.http.get<AiStatusResponse>(`${environment.apiBaseUrl}/ai/status`));
      return response?.ready === true ? 'ready' : 'notReady';
    } catch (error) {
      // Sin conexión, un 5xx o algo que no es JSON (Render despertando el backend): sigo esperando.
      return error instanceof HttpErrorResponse && error.status === UNAUTHORIZED ? 'signedOut' : 'failed';
    }
  }

  private isFresh(): boolean {
    return this.status() === 'ready' && Date.now() - this.lastReadyAt < this.config.readyFreshMs;
  }
}
