import { SharedWorkerDetectionBroadcast, SharedWorkerInboundMessage, SharedWorkerOutboundMessage } from './messages';

/** Lo mínimo que uso de un MessagePort: así pruebo el hub sin un Shared Worker real. */
export interface SyncPort {
  postMessage(message: SharedWorkerOutboundMessage): void;
}

/** Llevo las pestañas conectadas al Shared Worker: reenvío detecciones y aviso cuántas hay. */
export class SyncHub {
  private readonly ports = new Set<SyncPort>();

  get tabCount(): number {
    return this.ports.size;
  }

  connect(port: SyncPort): void {
    this.ports.add(port);
    this.broadcastTabCount();
  }

  receive(port: SyncPort, message: SharedWorkerInboundMessage): void {
    if (message.type === 'hello') this.connect(port);
    else if (message.type === 'goodbye') this.disconnect(port);
    else if (message.type === 'detection-broadcast') this.broadcastToOthers(port, message);
  }

  disconnect(port: SyncPort): void {
    if (this.ports.delete(port)) this.broadcastTabCount();
  }

  private broadcastToOthers(origin: SyncPort, message: SharedWorkerDetectionBroadcast): void {
    for (const port of this.ports) {
      if (port !== origin) port.postMessage(message);
    }
  }

  private broadcastTabCount(): void {
    const message: SharedWorkerOutboundMessage = { type: 'tab-count', count: this.ports.size };
    for (const port of this.ports) port.postMessage(message);
  }
}
