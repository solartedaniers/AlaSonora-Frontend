import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { BrandSymbolComponent } from '../brand-symbol/brand-symbol.component';

/** Logo: el símbolo del ave más el nombre escrito con la tipografía de la app. */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  imports: [RouterLink, TranslatePipe, BrandSymbolComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <a routerLink="/" class="inline-flex items-center gap-2 min-h-touch rounded-md text-on-surface">
      <app-brand-symbol decorative class="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
      <span class="font-display text-lg sm:text-xl font-extrabold tracking-display leading-none">{{ 'app.name' | translate }}</span>
    </a>
  `,
})
export class BrandMarkComponent {}
