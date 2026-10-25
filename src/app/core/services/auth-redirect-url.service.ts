import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../environments/environment';

/** Armo las URLs de retorno de Supabase Auth con el origen actual, así sirven en alasonora.com, onrender y local. */
@Injectable({ providedIn: 'root' })
export class AuthRedirectUrlService {
  private readonly document = inject(DOCUMENT);

  emailConfirmation(): string {
    return this.absolute(environment.authRedirectPaths.emailConfirmation);
  }

  passwordReset(): string {
    return this.absolute(environment.authRedirectPaths.passwordReset);
  }

  private absolute(path: string): string {
    return new URL(path, this.document.location.origin).href;
  }
}
