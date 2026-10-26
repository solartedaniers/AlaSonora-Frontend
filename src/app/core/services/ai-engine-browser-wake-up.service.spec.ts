import { PLATFORM_ID } from '@angular/core';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AiEngineBrowserWakeUpService } from './ai-engine-browser-wake-up.service';

describe('AiEngineBrowserWakeUpService', () => {
  const { healthUrl, browserWakeTimeoutMs } = environment.aiEngine;
  let fetchSpy: jasmine.Spy;

  const service = (platform: 'browser' | 'server') => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
    return TestBed.inject(AiEngineBrowserWakeUpService);
  };

  beforeEach(() => {
    fetchSpy = spyOn(window, 'fetch').and.returnValue(new Promise<Response>(() => undefined));
  });

  it('sends a silent no-cors GET to the public /health, bypassing the Service Worker', () => {
    service('browser').wake();

    const [url, init] = fetchSpy.calls.mostRecent().args as [URL, RequestInit];
    expect(`${url.origin}${url.pathname}`).toBe(healthUrl);
    expect(url.searchParams.get('ngsw-bypass')).toBe('true');
    expect(init.mode).toBe('no-cors');
    expect(init.cache).toBe('no-store');
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('gives up on the request after the configured timeout', fakeAsync(() => {
    service('browser').wake();
    const { signal } = fetchSpy.calls.mostRecent().args[1] as RequestInit;

    tick(browserWakeTimeoutMs - 1);
    expect(signal!.aborted).toBeFalse();
    tick(1);
    expect(signal!.aborted).toBeTrue();
  }));

  it('ignores any network error', fakeAsync(() => {
    fetchSpy.and.returnValue(Promise.reject(new TypeError('Failed to fetch')));

    expect(() => service('browser').wake()).not.toThrow();
    flushMicrotasks();
    tick(browserWakeTimeoutMs);
  }));

  it('never runs during SSR', () => {
    service('server').wake();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
