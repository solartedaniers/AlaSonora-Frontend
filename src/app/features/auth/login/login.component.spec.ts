import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AiEngineStatusService } from '../../../core/services/ai-engine-status.service';
import { I18nService } from '../../../core/services/i18n.service';
import { ProfileService } from '../../../core/services/profile.service';
import { UserService } from '../../../core/services/user.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LoginComponent } from './login.component';

describe('LoginComponent placeholders', () => {
  const original = { ...environment.demoAccount };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: {} },
        { provide: ProfileService, useValue: {} },
        { provide: AiEngineStatusService, useValue: {} },
        { provide: I18nService, useValue: { lang: signal('es'), translate: (key: string) => `t:${key}` } },
      ],
    });
    // La cabecera y el panel no influyen en el formulario: los dejo como elementos vacíos.
    TestBed.overrideComponent(LoginComponent, {
      set: { imports: [ReactiveFormsModule, RouterLink, TranslatePipe], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  afterEach(() => Object.assign(environment.demoAccount, original));

  const render = (account: { email: string; password: string }) => {
    Object.assign(environment.demoAccount, account);
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const placeholder = (id: string) => element.querySelector<HTMLInputElement>(`#${id}`)!.placeholder;
    return { email: placeholder('email'), password: placeholder('password'), hint: element.querySelector('#login-demo-hint') };
  };

  it('shows the demo account injected at build time, with its hint', () => {
    const view = render({ email: 'demo@example.org', password: 'Example123*' });
    expect(view.email).toBe('demo@example.org');
    expect(view.password).toBe('Example123*');
    expect(view.hint).not.toBeNull();
  });

  it('falls back to the generic translated placeholders without a demo account', () => {
    const view = render({ email: '', password: '' });
    expect(view.email).toBe('t:auth.login.emailPlaceholder');
    expect(view.password).toBe('t:auth.passwordPlaceholder');
    expect(view.hint).toBeNull();
  });
});
