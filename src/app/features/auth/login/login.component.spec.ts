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

describe('LoginComponent demo account', () => {
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
    const input = (id: string) => element.querySelector<HTMLInputElement>(`#${id}`)!;
    return {
      form: fixture.componentInstance.form,
      email: input('email'),
      password: input('password'),
      hint: element.querySelector('#login-demo-hint'),
    };
  };

  it('fills the fields with the demo account injected at build time, ready to submit', () => {
    const view = render({ email: 'demo@example.org', password: 'Example123*' });
    expect(view.email.value).toBe('demo@example.org');
    expect(view.password.value).toBe('Example123*');
    expect(view.form.valid).toBeTrue();
    expect(view.hint).not.toBeNull();
  });

  it('keeps the generic placeholders, so a cleared field still guides the user', () => {
    const view = render({ email: 'demo@example.org', password: 'Example123*' });
    expect(view.email.placeholder).toBe('t:auth.login.emailPlaceholder');
    expect(view.password.placeholder).toBe('t:auth.passwordPlaceholder');
  });

  it('leaves the fields empty and without hint when the build has no demo account', () => {
    const view = render({ email: '', password: '' });
    expect(view.email.value).toBe('');
    expect(view.password.value).toBe('');
    expect(view.form.valid).toBeFalse();
    expect(view.hint).toBeNull();
  });
});
