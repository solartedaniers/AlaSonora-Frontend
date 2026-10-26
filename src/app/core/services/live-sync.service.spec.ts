import { TestBed } from '@angular/core/testing';
import { LiveSyncService } from './live-sync.service';

/** Shared Worker falso: guardo lo que la pestaña le manda a su puerto. */
class FakeSharedWorker {
  static last?: FakeSharedWorker;
  readonly sent: { type: string }[] = [];
  closed = false;
  readonly port = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    start: () => undefined,
    postMessage: (message: { type: string }) => this.sent.push(message),
    close: () => (this.closed = true),
  };

  constructor() {
    FakeSharedWorker.last = this;
  }
}

describe('LiveSyncService', () => {
  const globalScope = window as unknown as { SharedWorker: unknown };
  const originalSharedWorker = globalScope.SharedWorker;
  let worker: FakeSharedWorker;
  let service: LiveSyncService;

  beforeEach(() => {
    globalScope.SharedWorker = FakeSharedWorker;
    service = TestBed.inject(LiveSyncService);
    worker = FakeSharedWorker.last!;
  });

  afterEach(() => (globalScope.SharedWorker = originalSharedWorker));

  const types = () => worker.sent.map((message) => message.type);

  it('says hello on start and goodbye when the page is hidden, then hello again when it comes back', () => {
    expect(types()).toEqual(['hello']);

    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));

    expect(types()).toEqual(['hello', 'goodbye', 'hello']);
  });

  it('says goodbye, closes the port and removes its listeners when destroyed', () => {
    service.ngOnDestroy();

    expect(types()).toEqual(['hello', 'goodbye']);
    expect(worker.closed).toBeTrue();
    expect(worker.port.onmessage).toBeNull();

    window.dispatchEvent(new PageTransitionEvent('pagehide'));
    service.broadcastDetection({ detectionId: 'd1', speciesCommonName: 'x', latitude: 0, longitude: 0, confidence: 1 });
    expect(types()).toEqual(['hello', 'goodbye']);
  });

  it('updates the tab count from the worker', () => {
    worker.port.onmessage!(new MessageEvent('message', { data: { type: 'tab-count', count: 3 } }));
    expect(service.activeTabCount()).toBe(3);
  });
});
