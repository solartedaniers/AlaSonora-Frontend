import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../../core/services/i18n.service';
import { BRAND_ASSETS } from '../../brand/brand-assets';
import { BrandSymbolComponent } from './brand-symbol.component';

@Component({
  imports: [BrandSymbolComponent],
  template: `<app-brand-symbol id="informative" /><app-brand-symbol id="decorative" decorative />`,
})
class HostComponent {}

describe('BrandSymbolComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: I18nService, useValue: { lang: signal('es'), translate: (key: string) => `t:${key}` } }],
    });
  });

  const image = (id: string) => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(`#${id} img`)!;
  };

  it('uses the central symbol path and the alt text from i18n', () => {
    const img = image('informative');
    expect(img.getAttribute('src')).toBe(BRAND_ASSETS.symbol.path);
    expect(img.alt).toBe('t:brand.symbolAlt');
  });

  it('leaves the alt empty when it sits next to the written name', () => {
    expect(image('decorative').getAttribute('alt')).toBe('');
  });
});
