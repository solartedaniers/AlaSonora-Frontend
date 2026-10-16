import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { I18nService } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(I18nService);
    TestBed.inject(HttpTestingController).match(() => true).forEach((request) => request.flush({}));
    service.dict.set({ notifications: { near: 'cerca de {area}', count: '{total} avisos' } });
  });

  it('resolves dotted keys and replaces the named parameters', () => {
    expect(service.translate('notifications.near', { area: 'Pasto' })).toBe('cerca de Pasto');
    expect(service.translate('notifications.count', { total: 3 })).toBe('3 avisos');
  });

  it('returns the key itself when it is missing or not a text, so gaps stay visible', () => {
    expect(service.translate('notifications.unknown')).toBe('notifications.unknown');
    expect(service.translate('notifications')).toBe('notifications');
  });

  it('keeps a placeholder untouched when its parameter is not provided', () => {
    expect(service.translate('notifications.near', {})).toBe('cerca de {area}');
  });

  it('toggles between Spanish and English', () => {
    service.setLang('es');
    service.toggleLang();
    expect(service.lang()).toBe('en');
    service.toggleLang();
    expect(service.lang()).toBe('es');
  });
});
