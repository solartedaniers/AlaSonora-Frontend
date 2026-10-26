import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ClassificationService } from './classification.service';
import { DetectionsService } from './detections.service';
import { LoggerService } from './logger.service';
import { OfflineStorageService, PendingRecording } from './offline-storage.service';
import { OfflineRecordingsLogService } from './offline-recordings-log.service';
import { PendingRecordingsSyncService } from './pending-recordings-sync.service';
import { UserService } from './user.service';

describe('PendingRecordingsSyncService listeners and locking', () => {
  let getUserId: jasmine.Spy;
  let service: PendingRecordingsSyncService;

  beforeEach(() => {
    // Sin sesión, drain() termina sin tocar la cola: aquí solo pruebo cuándo y cómo se dispara.
    getUserId = jasmine.createSpy('getUserId').and.resolveTo(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { getUserId } },
        { provide: OfflineStorageService, useValue: { listPending: async () => [] } },
        { provide: ClassificationService, useValue: {} },
        { provide: DetectionsService, useValue: {} },
        { provide: LoggerService, useValue: {} },
        { provide: OfflineRecordingsLogService, useValue: {} },
      ],
    });
    service = TestBed.inject(PendingRecordingsSyncService);
  });

  const onlineListenerCalls = (spy: jasmine.Spy) => spy.calls.allArgs().filter(([type]) => type === 'online').length;

  it('installs the global listeners once even if start() runs twice', () => {
    const add = spyOn(window, 'addEventListener').and.callThrough();

    service.start();
    service.start();

    expect(onlineListenerCalls(add)).toBe(1);
  });

  it('removes the same listeners when it is destroyed', async () => {
    const add = spyOn(window, 'addEventListener').and.callThrough();
    const remove = spyOn(window, 'removeEventListener').and.callThrough();
    service.start();
    await Promise.resolve();
    getUserId.calls.reset();

    service.ngOnDestroy();
    window.dispatchEvent(new Event('online'));

    const installed = add.calls.allArgs().find(([type]) => type === 'online')![1];
    expect(remove).toHaveBeenCalledWith('online', installed);
    expect(getUserId).not.toHaveBeenCalled();
  });

  it('still syncs one at a time when navigator.locks does not exist', async () => {
    spyOnProperty(navigator, 'locks').and.returnValue(undefined as unknown as LockManager);
    let running = 0;
    let maxRunning = 0;
    getUserId.and.callFake(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      return null;
    });

    await Promise.all([service.syncNow(), service.syncNow(), service.syncNow()]);

    expect(getUserId).toHaveBeenCalledTimes(3);
    expect(maxRunning).toBe(1);
  });
});

describe('PendingRecordingsSyncService drain', () => {
  const recording: PendingRecording = {
    id: 'r1',
    recordedAt: '2026-10-20T10:00:00.000Z',
    audioBlob: new Blob(['wav']),
    durationSeconds: 5,
    peakFrequencyHz: 3000,
  };
  const species = { id: 's1', commonName: 'Copetón', commonNameEn: 'Rufous-collared Sparrow', scientificName: 'Zonotrichia capensis' };
  let calls: string[];
  let create: jasmine.Spy;
  let record: jasmine.Spy;
  let remove: jasmine.Spy;
  let service: PendingRecordingsSyncService;

  beforeEach(() => {
    calls = [];
    create = jasmine.createSpy('create').and.callFake(async () => {
      calls.push('create');
      return { id: 'detection-1', species };
    });
    record = jasmine.createSpy('record').and.callFake(async () => void calls.push('record'));
    remove = jasmine.createSpy('remove').and.callFake(async () => void calls.push('remove'));
    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: { getUserId: async () => 'user-1', currentUser: () => null } },
        { provide: OfflineStorageService, useValue: { listPending: async () => [recording], remove } },
        {
          provide: ClassificationService,
          useValue: {
            uploadRecording: async () => ({ storagePath: 'user-1/r1.wav', signedUrl: 'https://signed' }),
            classify: async () => ({ species, confidence: 90, alternatives: [] }),
          },
        },
        { provide: DetectionsService, useValue: { create } },
        { provide: LoggerService, useValue: { warn: () => undefined } },
        { provide: OfflineRecordingsLogService, useValue: { record } },
      ],
    });
    service = TestBed.inject(PendingRecordingsSyncService);
  });

  it('keeps the order: create the detection, note it, then delete the audio', async () => {
    await service.syncNow();

    expect(calls).toEqual(['create', 'record', 'remove']);
    expect(remove).toHaveBeenCalledWith('r1');
    const [entry] = record.calls.mostRecent().args;
    expect(entry).toEqual(jasmine.objectContaining({ id: 'r1', outcome: 'synced', detectionId: 'detection-1' }));
    expect(entry.species).toEqual({ commonName: 'Copetón', commonNameEn: 'Rufous-collared Sparrow', scientificName: 'Zonotrichia capensis' });
    expect(Object.keys(entry)).not.toContain('audioBlob');
  });

  it('notes a 422 as failed and still drops it from the queue as before', async () => {
    create.and.rejectWith(new HttpErrorResponse({ status: 422 }));

    await service.syncNow();

    expect(record.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ id: 'r1', outcome: 'failed' }));
    expect(remove).toHaveBeenCalledWith('r1');
  });

  it('leaves a network failure in the queue without noting anything', async () => {
    create.and.rejectWith(new HttpErrorResponse({ status: 0 }));

    await service.syncNow();

    expect(record).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
