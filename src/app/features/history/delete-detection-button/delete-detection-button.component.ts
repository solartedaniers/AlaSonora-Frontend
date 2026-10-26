import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { DetectionsService } from '../../../core/services/detections.service';
import { LoggerService } from '../../../core/services/logger.service';
import { OfflineRecordingsLogService } from '../../../core/services/offline-recordings-log.service';
import { ToastService } from '../../../core/services/toast.service';

/** Botón de basura de una grabación propia: confirma, borra en el backend y limpia lo que quedó en el dispositivo. */
@Component({
  selector: 'app-delete-detection-button',
  standalone: true,
  imports: [TranslatePipe, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="delete-detection"
      [disabled]="!online() || deleting()"
      [attr.aria-label]="'history.delete.action' | translate"
      [attr.title]="(online() ? 'history.delete.action' : 'history.delete.offlineHint') | translate"
      [attr.aria-describedby]="online() ? null : hintId"
      (click)="open()"
    >
      <span class="material-symbols-outlined" aria-hidden="true">delete</span>
    </button>
    @if (!online()) {
      <span [id]="hintId" class="sr-only">{{ 'history.delete.offlineHint' | translate }}</span>
    }
    @if (dialogOpen()) {
      <app-confirm-dialog
        titleKey="history.delete.dialogTitle"
        bodyKey="history.delete.dialogBody"
        confirmKey="history.delete.confirm"
        busyKey="history.delete.deleting"
        [busy]="deleting()"
        [confirmDisabled]="!online()"
        [errorKey]="errorKey()"
        (confirmed)="confirm()"
        (cancelled)="close()"
      />
    }
  `,
  styles: `
    .delete-detection {
      display: grid;
      place-items: center;
      width: var(--touch-target);
      height: var(--touch-target);
      border-radius: var(--radius-full);
      background: var(--color-surface-container-lowest);
      color: var(--color-error);
      box-shadow: var(--shadow-md);
      transition: background-color var(--duration-fast) var(--ease-out);
    }
    .delete-detection:enabled:hover {
      background: var(--color-error-container);
      color: var(--color-on-error-container);
    }
    .delete-detection:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class DeleteDetectionButtonComponent {
  private static nextId = 0;

  private readonly detections = inject(DetectionsService);
  private readonly offlineLog = inject(OfflineRecordingsLogService);
  private readonly toast = inject(ToastService);
  private readonly logger = inject(LoggerService);
  readonly online = inject(ConnectivityService).online;

  readonly detectionId = input.required<string>();
  readonly deleted = output<string>();

  readonly dialogOpen = signal(false);
  readonly deleting = signal(false);
  readonly errorKey = signal<string | null>(null);
  readonly hintId = `delete-detection-hint-${DeleteDetectionButtonComponent.nextId++}`;

  open(): void {
    this.errorKey.set(null);
    this.dialogOpen.set(true);
  }

  close(): void {
    this.dialogOpen.set(false);
  }

  // Solo la quito de la lista cuando el backend confirma; si falla, la grabación se queda y lo digo en el diálogo.
  async confirm(): Promise<void> {
    if (this.deleting()) return;
    const id = this.detectionId();
    this.deleting.set(true);
    this.errorKey.set(null);
    try {
      await this.detections.deleteMine(id);
    } catch (error) {
      this.logger.error('History', 'could not delete the detection', error);
      this.errorKey.set('history.delete.error');
      this.deleting.set(false);
      return;
    }
    await this.offlineLog.forgetDetection(id);
    this.deleting.set(false);
    this.dialogOpen.set(false);
    this.toast.show('history.delete.success', { icon: 'check_circle' });
    this.deleted.emit(id);
  }
}
