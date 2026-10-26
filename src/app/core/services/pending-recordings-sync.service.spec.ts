import { TestBed } from '@angular/core/testing';
import { ClassificationService } from './classification.service';
import { DetectionsService } from './detections.service';
import { LoggerService } from './logger.service';
import { OfflineStorageService } from './offline-storage.service';
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
