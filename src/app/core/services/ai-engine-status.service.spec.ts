import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AiEngineStatusService } from './ai-engine-status.service';
import { SupabaseClientService } from './supabase-client.service';
import { environment } from '../../../environments/environment';

describe('AiEngineStatusService', () => {
  const statusUrl = `${environment.apiBaseUrl}/ai/status`;
  const { statusPollMs, backendWakeTimeoutMs } = environment.aiEngine;
  let http: HttpTestingController;
  let emitAuthEvent: (event: string) => void;
  let service: AiEngineStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: SupabaseClientService,
          useValue: { client: { auth: { onAuthStateChange: (listener: (event: string) => void) => (emitAuthEvent = listener) } } },
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
});
