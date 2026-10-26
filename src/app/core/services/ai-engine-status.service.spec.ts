import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AiEngineStatusService } from './ai-engine-status.service';
import { SupabaseClientService } from './supabase-client.service';
import { AiEngineBrowserWakeUpService } from './ai-engine-browser-wake-up.service';
import { environment } from '../../../environments/environment';

describe('AiEngineStatusService', () => {
  const statusUrl = `${environment.apiBaseUrl}/ai/status`;
  const { statusPollMs, backendWakeTimeoutMs, wakeTimeoutMs, readyFreshMs, browserWakeIntervalMs } = environment.aiEngine;
  let http: HttpTestingController;
  let emitAuthEvent: (event: string, session?: object | null) => void;
  let browserWake: jasmine.Spy;
  let service: AiEngineStatusService;

  beforeEach(() => {
    browserWake = jasmine.createSpy('wake');
    TestBed.configureTestingModule({
      providers: [
        { provide: AiEngineBrowserWakeUpService, useValue: { wake: browserWake } },
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SupabaseClientService,
          useValue: { client: { auth: { onAuthStateChange: (listener: typeof emitAuthEvent) => (emitAuthEvent = listener) } } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AiEngineStatusService);
  });

  afterEach(() => http.verify());

  const answer = (body: { ready: boolean }) => {
    flushMicrotasks();
    http.expectOne(statusUrl).flush(body);
    flushMicrotasks();
  };

  it('shows "waking" while the engine starts and stops polling once it is on', fakeAsync(() => {
    service.warmUp();
    expect(service.status()).toBe('waking');
    answer({ ready: false });

    tick(statusPollMs);
    answer({ ready: true });
    expect(service.ready()).toBeTrue();

    tick(statusPollMs * 10);
    service.warmUp();
    http.expectNone(statusUrl);
  }));

  it('stops polling on SIGNED_OUT and resumes on the next sign-in', fakeAsync(() => {
    service.warmUp();
    answer({ ready: false });

    emitAuthEvent('SIGNED_OUT');
    tick(statusPollMs * 10);
    http.expectNone(statusUrl);
    expect(service.status()).toBe('unknown');

    service.warmUp();
    answer({ ready: true });
    expect(service.status()).toBe('ready');
  }));

  it('treats a 401 as signed out, not as ready, and stops polling', fakeAsync(() => {
    let result: boolean | undefined;
    void service.whenReady().then((ready) => (result = ready));
    flushMicrotasks();
    http.expectOne(statusUrl).flush(null, { status: 401, statusText: 'Unauthorized' });
    flushMicrotasks();

    expect(result).toBeFalse();
    expect(service.ready()).toBeFalse();
    tick(statusPollMs * 10);
    http.expectNone(statusUrl);
  }));

  it('gives the engine its own window once a sleeping backend finally answers', fakeAsync(() => {
    service.warmUp();
    // El backend tarda casi todo su plazo en despertar: la primera respuesta llega al final.
    tick(backendWakeTimeoutMs - 1000);
    answer({ ready: false });

    tick(statusPollMs);
    answer({ ready: false });
    expect(service.status()).toBe('waking');

    emitAuthEvent('SIGNED_OUT');
    tick(statusPollMs);
  }));

  /** El backend sigue diciendo que no durante ms milisegundos. */
  const keepWaking = (ms: number) => {
    for (let waited = 0; waited < ms; waited += statusPollMs) {
      tick(statusPollMs);
      answer({ ready: false });
    }
  };

  describe('browser wake-up', () => {
    it('wakes the engine from the browser at once and every interval while waking, and stops once it is on', fakeAsync(() => {
      service.warmUp();
      expect(browserWake).toHaveBeenCalledTimes(1);
      answer({ ready: false });

      keepWaking(browserWakeIntervalMs);
      expect(browserWake).toHaveBeenCalledTimes(2);

      tick(statusPollMs);
      answer({ ready: true });
      tick(browserWakeIntervalMs * 5);
      expect(browserWake).toHaveBeenCalledTimes(2);
    }));

    it('stops on SIGNED_OUT', fakeAsync(() => {
      service.warmUp();
      answer({ ready: false });

      emitAuthEvent('SIGNED_OUT');
      tick(browserWakeIntervalMs * 5);
      expect(browserWake).toHaveBeenCalledTimes(1);
      http.expectNone(statusUrl);
    }));

    it('stops when the wake-up window runs out', fakeAsync(() => {
      service.warmUp();
      answer({ ready: false });
      // La última espera llega al plazo: ya no pregunta más.
      keepWaking(wakeTimeoutMs - statusPollMs);
      tick(statusPollMs);
      expect(service.status()).toBe('unavailable');

      const calls = browserWake.calls.count();
      tick(browserWakeIntervalMs * 5);
      expect(browserWake).toHaveBeenCalledTimes(calls);
      http.expectNone(statusUrl);
    }));

    it('wakes it when a saved session is restored, not when there is none', fakeAsync(() => {
      emitAuthEvent('INITIAL_SESSION', null);
      expect(browserWake).not.toHaveBeenCalled();

      emitAuthEvent('INITIAL_SESSION', { user: {} });
      expect(browserWake).toHaveBeenCalledTimes(1);
      answer({ ready: true });
    }));

    it('wakes it at once when a classification found it asleep', fakeAsync(() => {
      service.warmUp();
      answer({ ready: true });
      browserWake.calls.reset();

      service.markAsleep();
      void service.whenReady();
      expect(browserWake).toHaveBeenCalledTimes(1);
      answer({ ready: true });
    }));

    it('does not ping an engine it believes on: it asks the backend first', fakeAsync(() => {
      service.warmUp();
      answer({ ready: true });
      browserWake.calls.reset();

      tick(readyFreshMs);
      service.warmUp();
      answer({ ready: true });
      expect(browserWake).not.toHaveBeenCalled();
    }));
  });
});
