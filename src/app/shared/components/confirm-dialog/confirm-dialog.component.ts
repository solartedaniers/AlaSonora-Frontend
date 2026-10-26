import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, input, output, viewChild } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

let nextDialogId = 0;

/**
 * Diálogo modal para confirmar una acción destructiva. Uso <dialog> nativo con showModal(): va a la capa
 * superior (ninguna tarjeta animada lo tapa) y deja inerte el resto de la página. Escape cancela.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="confirm-dialog"
      role="alertdialog"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="bodyId"
      [attr.aria-busy]="busy()"
      (cancel)="onCancelKey($event)"
      (close)="onClosed()"
      (click)="cancelOnBackdrop($event)"
      (keydown.tab)="trapFocus($event)"
      (keydown.shift.tab)="trapFocus($event)"
    >
      <div class="confirm-dialog__body">
        <span class="material-symbols-outlined confirm-dialog__icon" aria-hidden="true">delete</span>
        <h2 [id]="titleId" class="text-2xl font-extrabold">{{ titleKey() | translate }}</h2>
        <p [id]="bodyId" class="mt-3 text-on-surface-variant">{{ bodyKey() | translate }}</p>
        @if (errorKey(); as error) {
          <p class="mt-4 field-error" role="alert">{{ error | translate }}</p>
        }
        <div class="confirm-dialog__actions">
          <button #cancelButton type="button" class="btn btn--quiet" [disabled]="busy()" (click)="cancelled.emit()">
            {{ cancelKey() | translate }}
          </button>
          <button type="button" class="btn confirm-dialog__danger" [disabled]="busy() || confirmDisabled()" (click)="confirmed.emit()">
            {{ (busy() ? busyKey() : confirmKey()) | translate }}
          </button>
        </div>
      </div>
    </dialog>
  `,
  styles: `
    .confirm-dialog {
      width: min(100% - 2 * var(--space-gutter), calc(var(--space-unit) * 112));
      max-height: calc(100% - 2 * var(--space-gutter));
      margin: auto;
      padding: 0;
      border: 0;
      border-radius: var(--radius-2xl);
      background: var(--color-surface-container-lowest);
      color: var(--color-on-surface);
      box-shadow: var(--shadow-xl);
    }
    .confirm-dialog::backdrop {
      background: color-mix(in srgb, var(--color-scrim) 60%, transparent);
    }
    .confirm-dialog__body {
      padding: calc(var(--space-unit) * 8);
    }
    .confirm-dialog__icon {
      display: block;
      font-size: calc(var(--space-unit) * 10);
      color: var(--color-error);
      margin-bottom: calc(var(--space-unit) * 3);
    }
    .confirm-dialog__actions {
      display: flex;
      flex-wrap: wrap-reverse;
      justify-content: flex-end;
      gap: calc(var(--space-unit) * 3);
      margin-top: calc(var(--space-unit) * 8);
    }
    /* En el celular los botones ocupan todo el ancho para tocarlos con facilidad. */
    .confirm-dialog__actions > .btn {
      flex: 1 1 auto;
    }
    .confirm-dialog__danger {
      background: var(--color-error);
      color: var(--color-on-error);
      box-shadow: var(--shadow-md);
    }
  `,
})
export class ConfirmDialogComponent implements AfterViewInit, OnDestroy {
  readonly titleKey = input.required<string>();
  readonly bodyKey = input.required<string>();
  readonly confirmKey = input.required<string>();
  readonly busyKey = input.required<string>();
  readonly cancelKey = input('common.cancel');
  readonly busy = input(false);
  readonly confirmDisabled = input(false);
  readonly errorKey = input<string | null>(null);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly titleId = `confirm-dialog-title-${nextDialogId}`;
  readonly bodyId = `confirm-dialog-body-${nextDialogId++}`;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly cancelButton = viewChild.required<ElementRef<HTMLButtonElement>>('cancelButton');
  private readonly opener = typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null);

  // Enfoco "Cancelar": en una acción destructiva lo seguro debe ser lo primero.
  ngAfterViewInit(): void {
    this.dialog().nativeElement.showModal();
    this.cancelButton().nativeElement.focus();
  }

  ngOnDestroy(): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) dialog.close();
    this.opener?.focus?.();
  }

  // Escape: el navegador cerraría el diálogo solo; yo decido, para no cerrarlo a mitad del borrado.
  onCancelKey(event: Event): void {
    event.preventDefault();
    if (!this.busy()) this.cancelled.emit();
  }

  // Si el navegador lo cierra igual (por ejemplo, Escape repetido), lo trato como cancelar.
  onClosed(): void {
    this.cancelled.emit();
  }

  // Un clic fuera del contenido cae sobre el propio <dialog>, es decir, sobre el velo.
  cancelOnBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement && !this.busy()) this.cancelled.emit();
  }

  // Mantengo el Tab dentro del diálogo, de un extremo al otro.
  trapFocus(event: Event): void {
    const focusable = [...this.dialog().nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])')];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const backwards = (event as KeyboardEvent).shiftKey;
    if (backwards && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!backwards && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
