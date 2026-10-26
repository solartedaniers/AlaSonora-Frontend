import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DetectionsService } from '../../core/services/detections.service';
import { I18nService } from '../../core/services/i18n.service';
import { LoggerService } from '../../core/services/logger.service';
import { OfflineStorageService } from '../../core/services/offline-storage.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { HistoryComponent } from './history.component';

describe('HistoryComponent without a connection', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DetectionsService, useValue: { getMine: () => Promise.reject(new Error('offline')) } },
        { provide: LoggerService, useValue: { error: () => undefined } },
        { provide: OfflineStorageService, useValue: { pendingCount: signal(1) } },
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
