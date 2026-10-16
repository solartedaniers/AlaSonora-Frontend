import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { TimeAgoPipe } from './time-ago.pipe';
import { TranslatePipe } from './translate.pipe';
import { VocalizationTagPipe } from './vocalization-tag.pipe';

describe('i18n pipes', () => {
  const MINUTE_MS = 60_000;
  const i18n = {
    lang: signal<'es' | 'en'>('en'),
    translate: jasmine.createSpy('translate').and.callFake((key: string) => `t:${key}`),
  };

  const create = <T>(pipe: new () => T): T => TestBed.runInInjectionContext(() => new pipe());

  beforeEach(() => {
    i18n.lang.set('en');
    TestBed.configureTestingModule({ providers: [{ provide: I18nService, useValue: i18n }] });
  });

  it('TranslatePipe delegates to the service and returns empty text for a missing key', () => {
    const pipe = create(TranslatePipe);
    expect(pipe.transform('auth.login.email')).toBe('t:auth.login.email');
    expect(pipe.transform(null)).toBe('');
  });

  it('TimeAgoPipe formats in the active language', () => {
    const pipe = create(TimeAgoPipe);
    const fiveMinutesAgo = new Date(Date.now() - 5 * MINUTE_MS);
    const english = pipe.transform(fiveMinutesAgo);
    i18n.lang.set('es');
    const spanish = pipe.transform(fiveMinutesAgo);
    expect(english).toContain('5');
    expect(spanish).toContain('5');
    expect(spanish).not.toBe(english);
    expect(pipe.transform(null)).toBe('');
  });

  it('VocalizationTagPipe translates known Xeno-canto tags and keeps unknown ones as they came', () => {
    const pipe = create(VocalizationTagPipe);
    expect(pipe.transform('Wing beats')).toBe('t:vocalizationTag.wingSound');
    expect(pipe.transform('dawn chorus remix')).toBe('dawn chorus remix');
  });
});
