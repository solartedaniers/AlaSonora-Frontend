import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * Visito el /health público del motor desde el navegador: Render no deja que el backend, que también
 * corre en Render, despierte al servicio dormido (le responde 429). La respuesta no me sirve (no-cors
 * la deja opaca); solo busco que Render lo arranque, así que ignoro cualquier error. Nunca en SSR.
 */
@Injectable({ providedIn: 'root' })
export class AiEngineBrowserWakeUpService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly config = environment.aiEngine;

  wake(): void {
    if (!this.isBrowser) return;
    const url = new URL(this.config.healthUrl);
    // Que el Service Worker no la intercepte ni la guarde.
    url.searchParams.set('ngsw-bypass', 'true');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.browserWakeTimeoutMs);
    fetch(url, { mode: 'no-cors', cache: 'no-store', credentials: 'omit', signal: controller.signal })
      .catch(() => undefined)
      .finally(() => clearTimeout(timer));
  }
}
