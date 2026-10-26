import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { I18nService } from '../../../core/services/i18n.service';
import { OfflineRecordingLogEntry, OfflineRecordingsLogService } from '../../../core/services/offline-recordings-log.service';
import { OfflineStorageService, PendingRecordingSummary } from '../../../core/services/offline-storage.service';
import { PendingRecordingsSyncService } from '../../../core/services/pending-recordings-sync.service';
import { OfflineRecordingsComponent } from './offline-recordings.component';

describe('OfflineRecordingsComponent', () => {
  const pending = signal<PendingRecordingSummary[]>([]);
  const entries = signal<OfflineRecordingLogEntry[]>([]);
  const online = signal(false);
  let syncNow: jasmine.Spy;

  beforeEach(() => {
    pending.set([]);
    entries.set([]);
    online.set(false);
    syncNow = jasmine.createSpy('syncNow').and.resolveTo();
    TestBed.configureTestingModule({
      imports: [OfflineRecordingsComponent],
      providers: [
        provideRouter([]),
        { provide: OfflineStorageService, useValue: { pending } },
        { provide: OfflineRecordingsLogService, useValue: { entries } },
        { provide: PendingRecordingsSyncService, useValue: { syncNow } },
        { provide: ConnectivityService, useValue: { online } },
        { provide: I18nService, useValue: { lang: signal('es'), translate: (key: string) => `t:${key}` } },
      ],
    });
  });

  const render = () => {
    const fixture = TestBed.createComponent(OfflineRecordingsComponent);
    fixture.detectChanges();
    return fixture;
  };
  const rows = (element: HTMLElement) => Array.from(element.querySelectorAll<HTMLElement>('.offline-log__row'));
  const synced = (id: string): OfflineRecordingLogEntry => ({
    id,
    recordedAt: '2026-10-20T10:00:00.000Z',
    processedAt: '2026-10-20T10:05:00.000Z',
    outcome: 'synced',
    detectionId: 'detection-1',
    species: { commonName: 'Copetón', commonNameEn: 'Rufous-collared Sparrow', scientificName: 'Zonotrichia capensis' },
  });

  it('shows the pending recordings from the device without a connection', () => {
    pending.set([{ id: 'r1', recordedAt: '2026-10-20T10:00:00.000Z' }]);

    const element: HTMLElement = render().nativeElement;

    expect(element.textContent).toContain('t:history.offline.title');
    expect(rows(element)[0].dataset['status']).toBe('pending');
    expect(rows(element)[0].textContent).toContain('t:history.offline.status.pending');
    expect(rows(element)[0].textContent).toContain('schedule');
    // Sin conexión no ofrezco reintentar.
    expect(element.querySelector('button')).toBeNull();
  });

  it('turns a pending row into a synced one with its species and link, without reloading', () => {
    pending.set([{ id: 'r1', recordedAt: '2026-10-20T10:00:00.000Z' }]);
    const fixture = render();

    // El sync anota el resultado antes de borrar el audio: un instante están ambos y no debo duplicar la fila.
    entries.set([synced('r1')]);
    fixture.detectChanges();
    expect(rows(fixture.nativeElement).length).toBe(1);

    pending.set([]);
    fixture.detectChanges();

    const [row] = rows(fixture.nativeElement);
    expect(row.dataset['status']).toBe('synced');
    expect(row.textContent).toContain('t:history.offline.status.synced');
    expect(row.textContent).toContain('Copetón');
    expect(row.querySelector('a')?.getAttribute('href')).toBe('/result/detection-1');
  });

  it('shows a rejected recording as failed', () => {
    entries.set([{ ...synced('r2'), outcome: 'failed', detectionId: undefined, species: undefined }]);

    const [row] = rows(render().nativeElement);

    expect(row.dataset['status']).toBe('failed');
    expect(row.textContent).toContain('t:history.offline.failedHint');
    expect(row.querySelector('a')).toBeNull();
  });

  it('retries the existing sync when there is a connection', () => {
    pending.set([{ id: 'r1', recordedAt: '2026-10-20T10:00:00.000Z' }]);
    online.set(true);

    render().nativeElement.querySelector('button').click();

    expect(syncNow).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when there are no offline recordings', () => {
    expect(render().nativeElement.querySelector('section')).toBeNull();
  });
});
