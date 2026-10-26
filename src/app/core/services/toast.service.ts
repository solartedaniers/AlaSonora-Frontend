import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

const DEFAULT_TOAST = { icon: 'mark_email_read' };

/** Aviso breve que sobrevive a la navegación (lo pinta ToastComponent en la raíz). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /** Clave i18n del aviso visible, o null. */
  readonly messageKey = signal<string | null>(null);
  /** Ícono de Material Symbols que acompaña al aviso. */
  readonly icon = signal(DEFAULT_TOAST.icon);
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(messageKey: string, { icon = DEFAULT_TOAST.icon, durationMs = environment.toastMs } = {}): void {
    clearTimeout(this.timer);
    this.icon.set(icon);
    this.messageKey.set(messageKey);
    this.timer = setTimeout(() => this.messageKey.set(null), durationMs);
  }
}
