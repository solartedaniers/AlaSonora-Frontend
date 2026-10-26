import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../core/services/i18n.service';
import { LoggerService } from '../../core/services/logger.service';
import { PhotoClassificationService } from '../../core/services/photo-classification.service';
import { PhotoIdComponent } from './photo-id.component';

describe('PhotoIdComponent error messages', () => {
  let component: PhotoIdComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: I18nService, useValue: { translate: (key: string) => `t:${key}` } },
        { provide: LoggerService, useValue: {} },
        { provide: PhotoClassificationService, useValue: {} },
      ],
    });
    // Solo pruebo la traducción del error, así que no renderizo la plantilla.
    component = TestBed.runInInjectionContext(() => new PhotoIdComponent());
  });

  const messageFor = (status: number, error: object | null) =>
    component['resolveErrorMessage'](new HttpErrorResponse({ status, error }));

  it('shows the i18n text for the backend photo codes', () => {
    expect(messageFor(422, { errorCode: 'NO_BIRD_IN_PHOTO' })).toBe('t:photoId.noBird');
    expect(messageFor(503, { errorCode: 'PHOTO_UNAVAILABLE' })).toBe('t:photoId.unavailable');
  });

  it('keeps working with a backend that sends no code', () => {
    expect(messageFor(422, { message: 'Texto anterior' })).toBe('Texto anterior');
    expect(messageFor(502, null)).toBe('t:photoId.unavailable');
    expect(messageFor(500, null)).toBe('t:photoId.genericError');
  });
});
