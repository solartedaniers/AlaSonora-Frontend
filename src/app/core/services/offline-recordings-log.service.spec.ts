import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';
import { OfflineRecordingLogEntry, OfflineRecordingsLogService } from './offline-recordings-log.service';

describe('OfflineRecordingsLogService', () => {
  const limits = environment.offlineRecordingsLog;
  const originalLimits = { ...limits };
  let service: OfflineRecordingsLogService;

  const entry = (id: string, minutesAgo: number): OfflineRecordingLogEntry => ({
    id,
    recordedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    processedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    outcome: 'synced',
    detectionId: `detection-${id}`,
    species: { commonName: 'Tángara', commonNameEn: 'Tanager', scientificName: 'Tangara sp.' },
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LoggerService, useValue: { warn: () => undefined } }] });
    service = TestBed.inject(OfflineRecordingsLogService);
    await service.clear();
  });

  afterEach(() => Object.assign(limits, originalLimits));

  it('keeps a light record and reads it back from the device', async () => {
    await service.record(entry('a', 1));

    expect(service.entries().map((e) => e.detectionId)).toEqual(['detection-a']);
    expect(Object.keys(service.entries()[0])).not.toContain('audioBlob');

    service.entries.set([]);
    await service.refresh();
    expect(service.entries().map((e) => e.id)).toEqual(['a']);
  });

  it('keeps only the newest entries within the configured limit', async () => {
    limits.maxEntries = 2;

    await service.record(entry('old', 30));
    await service.record(entry('mid', 20));
    await service.record(entry('new', 10));

    expect(service.entries().map((e) => e.id)).toEqual(['new', 'mid']);
  });

  it('drops entries older than the configured number of days', async () => {
    limits.maxAgeDays = 1;

    await service.record(entry('stale', 2 * 24 * 60));
    await service.record(entry('fresh', 5));

    expect(service.entries().map((e) => e.id)).toEqual(['fresh']);
  });

  it('replaces the same recording instead of duplicating it', async () => {
    await service.record(entry('a', 5));
    await service.record({ ...entry('a', 1), outcome: 'failed', detectionId: undefined });

    expect(service.entries().length).toBe(1);
    expect(service.entries()[0].outcome).toBe('failed');
  });

  it('forgets only the row of a deleted detection', async () => {
    await service.record(entry('a', 2));
    await service.record(entry('b', 1));

    await service.forgetDetection('detection-a');
    await service.refresh();

    expect(service.entries().map((e) => e.id)).toEqual(['b']);
  });

  it('forgets everything on clear', async () => {
    await service.record(entry('a', 1));

    await service.clear();
    await service.refresh();

    expect(service.entries()).toEqual([]);
  });
});
