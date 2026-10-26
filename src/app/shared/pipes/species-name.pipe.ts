import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { Species, speciesDisplayName } from '../../core/models';

/** Pipe impuro a propósito, como TranslatePipe: se reevalúa al cambiar el idioma. */
@Pipe({
  name: 'speciesName',
  standalone: true,
  pure: false,
})
export class SpeciesNamePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(species: Species | null | undefined): string {
    if (!species) return '';
    return speciesDisplayName(species, this.i18n.lang());
  }
}
