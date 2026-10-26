import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DetectionsService } from '../../core/services/detections.service';
import { I18nService } from '../../core/services/i18n.service';
import { LoggerService } from '../../core/services/logger.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';
import { UserService } from '../../core/services/user.service';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { SpeciesNamePipe } from '../../shared/pipes/species-name.pipe';
import { NAVIGATION_CACHE_KEYS, NavigationCacheService } from '../../core/services/navigation-cache.service';
import { Detection } from '../../core/models';
import { HistoryComponent } from './history.component';

describe('HistoryComponent without a connection', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DetectionsService, useValue: { getMine: () => Promise.reject(new Error('offline')) } },
        { provide: LoggerService, useValue: { error: () => undefined } },
        { provide: OfflineStorageService, useValue: { pendingCount: signal(1) } },
        { provide: UserService, useValue: { currentUser: signal(null) } },
        { provide: I18nService, useValue: { lang: signal('es'), translate: (key: string) => `t:${key}` } },
      ],
    });
    // Dejo la sección offline como elemento sin resolver: aquí solo pruebo que la página la incluya.
    TestBed.overrideComponent(HistoryComponent, {
      set: { imports: [TranslatePipe], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  it('still shows the offline recordings section when the backend history fails', async () => {
    const fixture = TestBed.createComponent(HistoryComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(fixture.componentInstance.loadState()).toBe('error');
    expect(element.textContent).toContain('t:history.errorTitle');
    expect(element.querySelector('app-offline-recordings')).not.toBeNull();
  });
});

describe('HistoryComponent when coming back', () => {
  const detection = (id: string) =>
    ({
      id,
      recordedAt: '2026-10-20T10:00:00.000Z',
      location: {},
      species: { commonName: id, commonNameEn: id, scientificName: id },
    }) as unknown as Detection;
  let resolveFresh!: (detections: Detection[]) => void;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DetectionsService,
          useValue: { getMine: () => new Promise<Detection[]>((resolve) => (resolveFresh = resolve)) },
        },
        { provide: LoggerService, useValue: { error: () => undefined, warn: () => undefined } },
        { provide: OfflineStorageService, useValue: { pendingCount: signal(0) } },
        { provide: UserService, useValue: { currentUser: signal({ id: 'user-1' }) } },
        { provide: I18nService, useValue: { lang: signal('es'), translate: (key: string) => `t:${key}` } },
      ],
    });
    TestBed.overrideComponent(HistoryComponent, {
      set: { imports: [TranslatePipe, SpeciesNamePipe, DatePipe], schemas: [NO_ERRORS_SCHEMA] },
    });
  });

  it('shows the saved history at once, without the loading state, and then refreshes it', async () => {
    await TestBed.inject(NavigationCacheService).fetch(NAVIGATION_CACHE_KEYS.myDetections, async () => [detection('saved')]);

    const fixture = TestBed.createComponent(HistoryComponent);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.componentInstance.loadState()).toBe('ready');
    expect(fixture.nativeElement.querySelector('app-loading-state')).toBeNull();
    expect(fixture.componentInstance.all().map((d) => d.id)).toEqual(['saved']);

    resolveFresh([detection('saved'), detection('new')]);
    await fixture.whenStable();

    expect(fixture.componentInstance.all().map((d) => d.id)).toEqual(['saved', 'new']);
  });

  it('shows the loading state only the first time, when nothing is saved', () => {
    const fixture = TestBed.createComponent(HistoryComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.loadState()).toBe('loading');
    expect(fixture.nativeElement.querySelector('app-loading-state')).not.toBeNull();
  });
});
