import { Injectable, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { BRAND_ASSETS } from '../../shared/brand/brand-assets';
import { I18nService } from './i18n.service';
import { SITE_ORIGIN } from './canonical-url.service';

/**
 * Publico la imagen para compartir el link (og:image y la tarjeta grande de Twitter). Los rastreadores
 * exigen una URL absoluta, así que sin SITE_URL no publico nada. Corre también en el servidor; el
 * diccionario ya está cargado porque el app initializer lo espera.
 */
@Injectable({ providedIn: 'root' })
export class SocialPreviewService {
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18nService);
  private readonly siteOrigin = inject(SITE_ORIGIN);

  constructor() {
    if (this.siteOrigin) this.publish();
  }

  private publish(): void {
    const image = BRAND_ASSETS.socialImage;
    const url = new URL(image.path, this.siteOrigin).href;
    const alt = this.i18n.translate('brand.socialImageAlt');
    this.meta.updateTag({ property: 'og:image', content: url });
    this.meta.updateTag({ property: 'og:image:type', content: image.type });
    this.meta.updateTag({ property: 'og:image:width', content: String(image.width) });
    this.meta.updateTag({ property: 'og:image:height', content: String(image.height) });
    this.meta.updateTag({ property: 'og:image:alt', content: alt });
    this.meta.updateTag({ name: 'twitter:image', content: url });
    this.meta.updateTag({ name: 'twitter:image:alt', content: alt });
  }
}
