import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { CreateDetectionRequest } from '../models';
import { DetectionsService } from './detections.service';
import { LoggerService } from './logger.service';
import { NAVIGATION_CACHE_KEYS, NavigationCacheService } from './navigation-cache.service';
import { SupabaseClientService } from './supabase-client.service';
import { UserService } from './user.service';

describe('DetectionsService and the navigation cache', () => {
  let http: HttpTestingController;
  let cache: NavigationCacheService;
  let service: DetectionsService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SupabaseClientService, useValue: { client: {} } },
        { provide: UserService, useValue: { currentUser: signal({ id: 'user-1' }) } },
        { provide: LoggerService, useValue: { warn: () => undefined } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    cache = TestBed.inject(NavigationCacheService);
    service = TestBed.inject(DetectionsService);
    for (const key of Object.values(NAVIGATION_CACHE_KEYS)) await cache.fetch(key, async () => ['saved']);
  });

  afterEach(() => http.verify());

  // Tanto el guardado en línea como la sincronización offline crean la detección por aquí.
  it('forgets the saved history, stats and feeds after a detection is saved', async () => {
    const saving = service.create({} as CreateDetectionRequest);
    http.expectOne(`${environment.apiBaseUrl}/detections`).flush({ id: 'd1' });
    await saving;

    for (const key of Object.values(NAVIGATION_CACHE_KEYS)) expect(cache.peek(key)).withContext(key).toBeUndefined();
  });

  it('keeps the saved data when saving fails', async () => {
    const saving = service.create({} as CreateDetectionRequest);
    http.expectOne(`${environment.apiBaseUrl}/detections`).flush(null, { status: 500, statusText: 'Server Error' });
    await expectAsync(saving).toBeRejected();

    expect(cache.peek(NAVIGATION_CACHE_KEYS.myDetections)).toEqual(['saved']);
  });

  it('deletes my own detection and forgets the saved history, stats and feeds', async () => {
    const deleting = service.deleteMine('d1');
    const request = http.expectOne(`${environment.apiBaseUrl}/detections/d1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await deleting;

    for (const key of Object.values(NAVIGATION_CACHE_KEYS)) expect(cache.peek(key)).withContext(key).toBeUndefined();
  });

  it('keeps the saved data when deleting fails', async () => {
    const deleting = service.deleteMine('d1');
    http.expectOne(`${environment.apiBaseUrl}/detections/d1`).flush(null, { status: 404, statusText: 'Not Found' });
    await expectAsync(deleting).toBeRejected();

    expect(cache.peek(NAVIGATION_CACHE_KEYS.myDetections)).toEqual(['saved']);
  });
});
