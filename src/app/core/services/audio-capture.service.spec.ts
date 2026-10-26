import { TestBed } from '@angular/core/testing';
import { AudioCaptureService, AudioWorkerUnavailableError } from './audio-capture.service';

/** Worker falso que falla al cerrar la grabación, como cuando su script no carga. */
class FailingWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  postMessage(message: { type: string }): void {
    if (message.type === 'finalize-recording') setTimeout(() => this.onerror?.(new Event('error')));
  }

  terminate(): void {}
}

describe('AudioCaptureService without a usable worker', () => {
  const globalScope = window as unknown as { Worker: unknown };
  const originalWorker = globalScope.Worker;
  let getUserMedia: jasmine.Spy;
  let service: AudioCaptureService;

  beforeEach(() => {
    getUserMedia = spyOn(navigator.mediaDevices, 'getUserMedia').and.callFake(async () => new AudioContext().createMediaStreamDestination().stream);
    service = TestBed.inject(AudioCaptureService);
  });

  afterEach(() => (globalScope.Worker = originalWorker));

  it('fails with a clear error and never opens the microphone when Worker is not supported', async () => {
    globalScope.Worker = undefined;

    await expectAsync(service.start()).toBeRejectedWithError(AudioWorkerUnavailableError);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(service.isRecording()).toBeFalse();
  });

  it('fails the same way when the worker cannot be created', async () => {
    globalScope.Worker = function () {
      throw new DOMException('blocked', 'SecurityError');
    };

    await expectAsync(service.start()).toBeRejectedWithError(AudioWorkerUnavailableError);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('rejects stop() instead of waiting forever when the worker errors', async () => {
    globalScope.Worker = FailingWorker;
    await service.start();
    expect(service.isRecording()).toBeTrue();

    await expectAsync(service.stop()).toBeRejectedWithError(AudioWorkerUnavailableError);
    expect(service.isRecording()).toBeFalse();
  });
});
