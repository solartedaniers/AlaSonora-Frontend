import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { xenoCantoVocalizationLabelKey } from '../../core/models';

/** Pipe impuro como TranslatePipe: traduzco el tipo de vocalización de Xeno-canto si lo conozco y si no lo muestro tal cual. */
@Pipe({
  name: 'vocalizationTag',
  standalone: true,
  pure: false,
})
export class VocalizationTagPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(rawType: string): string {
    this.i18n.lang();
    const key = xenoCantoVocalizationLabelKey(rawType);
    return key ? this.i18n.translate(key) : rawType;
  }
}
