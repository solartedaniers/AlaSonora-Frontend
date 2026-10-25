import { Injectable, InjectionToken, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';

export const SITE_ORIGIN = new InjectionToken<string>('SITE_ORIGIN', {
  providedIn: 'root',
  factory: () => environment.siteUrl,
});

const CANONICAL_REL = 'canonical';

/**
 * Publico el canonical y og:url de cada ruta sobre el origen público, así onrender apunta a alasonora.com.
 * Corre también en el servidor (SSG y SSR); sin SITE_URL no publico nada.
 */
@Injectable({ providedIn: 'root' })
export class CanonicalUrlService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly siteOrigin = inject(SITE_ORIGIN);

  constructor() {
    if (!this.siteOrigin) return;
    inject(Router)
      .events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(({ urlAfterRedirects }) => this.apply(urlAfterRedirects));
  }

  private apply(routerUrl: string): void {
    // Descarto la query y el #hash (p. ej. los tokens de Supabase).
    const { origin, pathname } = new URL(routerUrl, this.siteOrigin);
    const canonicalUrl = `${origin}${pathname}`;
    this.canonicalLink().setAttribute('href', canonicalUrl);
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
  }

  private canonicalLink(): HTMLLinkElement {
    const existing = this.document.head.querySelector<HTMLLinkElement>(`link[rel="${CANONICAL_REL}"]`);
    if (existing) return existing;
    const link = this.document.createElement('link');
    link.setAttribute('rel', CANONICAL_REL);
    this.document.head.appendChild(link);
    return link;
  }
}
