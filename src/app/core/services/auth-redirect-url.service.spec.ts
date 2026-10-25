import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { AuthRedirectUrlService } from './auth-redirect-url.service';
import { environment } from '../../../environments/environment';

describe('AuthRedirectUrlService', () => {
  it('builds the Supabase Auth return URLs on the current browser origin', () => {
    const service = TestBed.inject(AuthRedirectUrlService);
    const { origin } = TestBed.inject(DOCUMENT).location;

    expect(service.emailConfirmation()).toBe(new URL(environment.authRedirectPaths.emailConfirmation, origin).href);
    expect(service.passwordReset()).toBe(new URL(environment.authRedirectPaths.passwordReset, origin).href);
    expect(service.passwordReset().startsWith(origin)).toBeTrue();
  });
});
