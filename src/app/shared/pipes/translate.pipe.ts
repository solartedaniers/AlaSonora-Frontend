import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';

/** Pipe impuro a propósito: la clave no cambia al cambiar el idioma, así que lo reevalúo siempre; el costo es mínimo. */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string | undefined | null, params?: Record<string, string | number>): string {
    if (!key) return '';
    // Leer el signal aquí asegura que Angular detecte la dependencia.
    this.i18n.lang();
    return this.i18n.translate(key, params);
  }
}
