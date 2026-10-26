import { Injectable, NgZone, OnDestroy, signal } from '@angular/core';
import {
  SharedWorkerDetectionBroadcast,
  SharedWorkerInboundMessage,
  SharedWorkerOutboundMessage,
} from '../../workers/messages';

/**
 * Envuelvo el Shared Worker (`sync.worker.ts`) para que la app lo use como un servicio más: comparto las
 * detecciones en vivo y el número de pestañas abiertas entre pestañas del mismo navegador.
 */
@Injectable({ providedIn: 'root' })
export class LiveSyncService implements OnDestroy {
  readonly activeTabCount = signal(1);
  readonly lastBroadcast = signal<SharedWorkerDetectionBroadcast | null>(null);

  private port?: MessagePort;
  private readonly tabId = crypto.randomUUID();
  // Al ocultarse la página aviso que me voy; si vuelve desde la caché del navegador, me presento otra vez.
  private readonly onPageHide = () => this.send({ type: 'goodbye', tabId: this.tabId });
  private readonly onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) this.send({ type: 'hello', tabId: this.tabId });
  };

  constructor(private readonly zone: NgZone) {
    if (typeof SharedWorker === 'undefined') return; // no soportado (ej. algunos navegadores móviles)

    this.zone.runOutsideAngular(() => {
      const worker = new SharedWorker(new URL('../../workers/sync.worker', import.meta.url), {
        type: 'module',
      });
      this.port = worker.port;
      this.port.onmessage = ({ data }: MessageEvent<SharedWorkerOutboundMessage>) =>
        this.zone.run(() => this.onMessage(data));
      this.port.start();
      this.send({ type: 'hello', tabId: this.tabId });
      window.addEventListener('pagehide', this.onPageHide);
      window.addEventListener('pageshow', this.onPageShow);
    });
  }

  broadcastDetection(payload: Omit<SharedWorkerDetectionBroadcast, 'type' | 'originTabId'>): void {
    this.send({
      type: 'detection-broadcast',
      originTabId: this.tabId,
      ...payload,
    });
  }

  ngOnDestroy(): void {
    if (!this.port) return;
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onPageShow);
    this.send({ type: 'goodbye', tabId: this.tabId });
    this.port.onmessage = null;
    this.port.close();
    this.port = undefined;
  }

  private send(message: SharedWorkerInboundMessage): void {
    this.port?.postMessage(message);
  }

  private onMessage(data: SharedWorkerOutboundMessage): void {
    if (data.type === 'tab-count') this.activeTabCount.set(data.count);
    if (data.type === 'detection-broadcast') this.lastBroadcast.set(data);
  }
}
