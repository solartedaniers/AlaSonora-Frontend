import { SharedWorkerOutboundMessage } from './messages';
import { SyncHub, SyncPort } from './sync-hub';

class FakePort implements SyncPort {
  readonly received: SharedWorkerOutboundMessage[] = [];

  postMessage(message: SharedWorkerOutboundMessage): void {
    this.received.push(message);
  }

  lastTabCount(): number | undefined {
    const counts = this.received.filter((message) => message.type === 'tab-count');
    return counts.length ? (counts[counts.length - 1] as { count: number }).count : undefined;
  }
}

describe('SyncHub', () => {
  const broadcast = {
    type: 'detection-broadcast' as const,
    detectionId: 'd1',
    speciesCommonName: 'Barranquero',
    latitude: 4.6,
    longitude: -74.1,
    confidence: 92,
    originTabId: 'tab-a',
  };

  it('counts tabs as they connect and lowers the count when one says goodbye', () => {
    const hub = new SyncHub();
    const [a, b, c] = [new FakePort(), new FakePort(), new FakePort()];
    hub.connect(a);
    hub.connect(b);
    hub.connect(c);
    expect(a.lastTabCount()).toBe(3);

    hub.receive(b, { type: 'goodbye', tabId: 'tab-b' });

    expect(hub.tabCount).toBe(2);
    expect(a.lastTabCount()).toBe(2);
    expect(c.lastTabCount()).toBe(2);
  });

  it('does not count a tab twice when its port both says goodbye and closes', () => {
    const hub = new SyncHub();
    const [a, b] = [new FakePort(), new FakePort()];
    hub.connect(a);
    hub.connect(b);
    hub.receive(b, { type: 'goodbye', tabId: 'tab-b' });
    const messagesBefore = a.received.length;

    hub.disconnect(b);

    expect(hub.tabCount).toBe(1);
    expect(a.received.length).toBe(messagesBefore);
  });

  it('counts a tab again when it comes back with hello, without duplicating it', () => {
    const hub = new SyncHub();
    const a = new FakePort();
    hub.connect(a);
    hub.receive(a, { type: 'goodbye', tabId: 'tab-a' });
    hub.receive(a, { type: 'hello', tabId: 'tab-a' });
    hub.receive(a, { type: 'hello', tabId: 'tab-a' });

    expect(hub.tabCount).toBe(1);
  });

  it('forwards a detection only to the other tabs', () => {
    const hub = new SyncHub();
    const [a, b] = [new FakePort(), new FakePort()];
    hub.connect(a);
    hub.connect(b);

    hub.receive(a, broadcast);

    expect(b.received).toContain(broadcast);
    expect(a.received).not.toContain(broadcast);
  });
});
