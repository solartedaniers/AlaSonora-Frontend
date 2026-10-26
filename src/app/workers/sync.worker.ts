/// <reference lib="webworker" />

import { SharedWorkerInboundMessage } from './messages';
import { SyncHub } from './sync-hub';

/**
 * Shared Worker: una sola instancia para todas las pestañas de AlaSonora del mismo navegador. Sincroniza
 * las detecciones en vivo entre pestañas y cuenta cuántas hay abiertas (la lógica vive en SyncHub).
 */

declare const self: SharedWorkerGlobalScope;

const hub = new SyncHub();

self.addEventListener('connect', (event: MessageEvent) => {
  const port = (event as unknown as { ports: MessagePort[] }).ports[0];
  port.addEventListener('message', ({ data }: MessageEvent<SharedWorkerInboundMessage>) => hub.receive(port, data));
  // Solo algunos navegadores emiten close; por eso cada pestaña también manda goodbye al irse.
  port.addEventListener('close', () => hub.disconnect(port));
  port.start();
  hub.connect(port);
});
