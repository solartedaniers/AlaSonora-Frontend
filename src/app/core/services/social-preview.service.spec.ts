import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { BRAND_ASSETS } from '../../shared/brand/brand-assets';
import { SITE_ORIGIN } from './canonical-url.service';
import { I18nService } from './i18n.service';
import { SocialPreviewService } from './social-preview.service';

const SITE = 'https://alasonora.example';

describe('SocialPreviewService', () => {
  const tags = ['property="og:image"', 'property="og:image:width"', 'property="og:image:height"', 'property="og:image:alt"', 'property="og:image:type"', 'name="twitter:image"', 'name="twitter:image:alt"'];

  const setUp = (siteOrigin: string) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SITE_ORIGIN, useValue: siteOrigin },
        { provide: I18nService, useValue: { lang: signal('es'), translate: (key: string) => `t:${key}` } },
      ],
    });
    TestBed.inject(SocialPreviewService);
    return TestBed.inject(Meta);
  };

  afterEach(() => tags.forEach((tag) => TestBed.inject(Meta).removeTag(tag)));

  it('publishes the absolute 1200x630 share image with its translated alt', () => {
    const meta = setUp(SITE);

    expect(meta.getTag('property="og:image"')?.content).toBe(`${SITE}/${BRAND_ASSETS.socialImage.path}`);
    expect(meta.getTag('property="og:image:width"')?.content).toBe('1200');
    expect(meta.getTag('property="og:image:height"')?.content).toBe('630');
    expect(meta.getTag('property="og:image:alt"')?.content).toBe('t:brand.socialImageAlt');
    expect(meta.getTag('name="twitter:image"')?.content).toBe(`${SITE}/${BRAND_ASSETS.socialImage.path}`);
  });

  it('publishes nothing when SITE_URL was not configured', () => {
    const meta = setUp('');
    expect(meta.getTag('property="og:image"')).toBeNull();
  });
});
