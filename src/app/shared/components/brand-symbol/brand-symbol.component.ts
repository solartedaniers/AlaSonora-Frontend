import { Component, ChangeDetectionStrategy, booleanAttribute, input } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { BRAND_ASSETS } from '../../brand/brand-assets';

/** Símbolo de AlaSonora (el ave con las ondas, sin texto). El tamaño lo pone quien lo usa con clases. */
@Component({
  selector: 'app-brand-symbol',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
  styles: `
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `,
  template: `
    <img
      [src]="symbol.path"
      [width]="symbol.width"
      [height]="symbol.height"
      [alt]="decorative() ? '' : ('brand.symbolAlt' | translate)"
      decoding="async"
    />
  `,
})
export class BrandSymbolComponent {
  /** Junto al nombre escrito el símbolo es decorativo: el lector de pantalla no lo repite. */
  readonly decorative = input(false, { transform: booleanAttribute });
  protected readonly symbol = BRAND_ASSETS.symbol;
}
