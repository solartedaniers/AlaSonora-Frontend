import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { DetectionsService } from '../../../core/services/detections.service';
import { I18nService } from '../../../core/services/i18n.service';
import { LoggerService } from '../../../core/services/logger.service';
import { OfflineRecordingsLogService } from '../../../core/services/offline-recordings-log.service';
import { ToastService } from '../../../core/services/toast.service';
import { DeleteDetectionButtonComponent } from './delete-detection-button.component';

describe('DeleteDetectionButtonComponent', () => {
  let fixture: ComponentFixture<DeleteDetectionButtonComponent>;
  let online: ReturnType<typeof signal<boolean>>;
  let detections: jasmine.SpyObj<DetectionsService>;
  let offlineLog: jasmine.SpyObj<OfflineRecordingsLogService>;
  let toast: jasmine.SpyObj<ToastService>;
  let deletedIds: string[];

  const element = () => fixture.nativeElement as HTMLElement;
  const trashButton = () => element().querySelector<HTMLButtonElement>('.delete-detection')!;
  const dialog = () => element().querySelector('[role="alertdialog"]');
  const dialogButton = (label: string) =>
    [...element().querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')].find((b) => b.textContent!.includes(label))!;

  beforeEach(() => {
    online = signal(true);
    detections = jasmine.createSpyObj<DetectionsService>('DetectionsService', ['deleteMine']);
    offlineLog = jasmine.createSpyObj<OfflineRecordingsLogService>('OfflineRecordingsLogService', ['forgetDetection']);
    offlineLog.forgetDetection.and.resolveTo();
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    TestBed.configureTestingModule({
      providers: [
        { provide: ConnectivityService, useValue: { online } },
        { provide: DetectionsService, useValue: detections },
        { provide: OfflineRecordingsLogService, useValue: offlineLog },
        { provide: ToastService, useValue: toast },
        { provide: LoggerService, useValue: { error: () => undefined } },
        { provide: I18nService, useValue: { lang: signal('es'), translate: (key: string) => key } },
      ],
    });
    fixture = TestBed.createComponent(DeleteDetectionButtonComponent);
    fixture.componentRef.setInput('detectionId', 'd1');
    deletedIds = [];
    fixture.componentInstance.deleted.subscribe((id) => deletedIds.push(id));
    fixture.detectChanges();
  });

  it('opens the confirmation and cancelling deletes nothing', () => {
    trashButton().click();
    fixture.detectChanges();
    expect((dialog() as HTMLDialogElement).open).toBeTrue();
    expect(document.activeElement).toBe(dialogButton('common.cancel'));

    dialogButton('common.cancel').click();
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect(detections.deleteMine).not.toHaveBeenCalled();
    expect(deletedIds).toEqual([]);
  });

  it('closes with Escape without deleting', () => {
    trashButton().click();
    fixture.detectChanges();

    // Así entrega el navegador un Escape a un <dialog> abierto con showModal().
    dialog()!.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();

    expect(dialog()).toBeNull();
    expect(detections.deleteMine).not.toHaveBeenCalled();
  });

  it('deletes on accept, blocks a second click meanwhile, cleans the offline log and confirms with a toast', async () => {
    let finish!: () => void;
    detections.deleteMine.and.returnValue(new Promise<void>((resolve) => (finish = resolve)));
    trashButton().click();
    fixture.detectChanges();

    dialogButton('history.delete.confirm').click();
    fixture.detectChanges();
    expect(dialogButton('history.delete.deleting').disabled).toBeTrue();
    expect(trashButton().disabled).toBeTrue();
    dialogButton('history.delete.deleting').click();

    finish();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(detections.deleteMine).toHaveBeenCalledOnceWith('d1');
    expect(offlineLog.forgetDetection).toHaveBeenCalledWith('d1');
    expect(toast.show).toHaveBeenCalledWith('history.delete.success', { icon: 'check_circle' });
    expect(deletedIds).toEqual(['d1']);
    expect(dialog()).toBeNull();
  });

  it('keeps the recording and shows the error when deleting fails', async () => {
    detections.deleteMine.and.rejectWith(new Error('500'));
    trashButton().click();
    fixture.detectChanges();

    dialogButton('history.delete.confirm').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(deletedIds).toEqual([]);
    expect(offlineLog.forgetDetection).not.toHaveBeenCalled();
    expect(toast.show).not.toHaveBeenCalled();
    expect(element().querySelector('[role="alert"]')?.textContent).toContain('history.delete.error');
    expect(dialogButton('history.delete.confirm').disabled).toBeFalse();
  });

  it('is disabled without a connection and explains why', () => {
    online.set(false);
    fixture.detectChanges();

    expect(trashButton().disabled).toBeTrue();
    const hintId = trashButton().getAttribute('aria-describedby')!;
    expect(element().querySelector(`#${hintId}`)?.textContent).toContain('history.delete.offlineHint');
  });
});
