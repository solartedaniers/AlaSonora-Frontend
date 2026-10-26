import { Injectable, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import breakpoints from '../../theme/breakpoints.json';

/** Ancho de la ventana como signal con los cortes de Tailwind; arranco en false para hidratar el mismo HTML del servidor. */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly document = inject(DOCUMENT);

  /** Ventana de tableta o más ancha (corte md). */
  readonly mdUp = signal(false);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    afterNextRender(() => {
      const query = this.document.defaultView?.matchMedia(`(min-width: ${breakpoints.md})`);
      if (!query) return;
      this.mdUp.set(query.matches);
      query.addEventListener('change', (event) => this.mdUp.set(event.matches));
    });
  }
}
