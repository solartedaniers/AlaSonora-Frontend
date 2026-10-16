import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { UserService } from '../services/user.service';
import { ProfileService } from '../services/profile.service';
import { LoggerService } from '../services/logger.service';
import { authGuard } from './auth.guard';
import { adminGuard } from './admin.guard';

describe('route guards', () => {
  const user = jasmine.createSpyObj<UserService>('UserService', ['isAuthenticated']);
  const profiles = jasmine.createSpyObj<ProfileService>('ProfileService', ['getMine']);
  const logger = jasmine.createSpyObj<LoggerService>('LoggerService', ['error']);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UserService, useValue: user },
        { provide: ProfileService, useValue: profiles },
        { provide: LoggerService, useValue: logger },
      ],
    });
  });

  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() => guard({} as never, {} as never)) as Promise<boolean | UrlTree>;
  const urlOf = (result: boolean | UrlTree) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  it('authGuard lets a signed-in user through and sends guests to /login', async () => {
    user.isAuthenticated.and.resolveTo(true);
    expect(await run(authGuard)).toBeTrue();
    user.isAuthenticated.and.resolveTo(false);
    expect(urlOf(await run(authGuard))).toBe('/login');
  });

  it('adminGuard only lets admins through', async () => {
    user.isAuthenticated.and.resolveTo(true);
    profiles.getMine.and.resolveTo({ systemRole: 'admin' } as never);
    expect(await run(adminGuard)).toBeTrue();
    profiles.getMine.and.resolveTo({ systemRole: 'user' } as never);
    expect(urlOf(await run(adminGuard))).toBe('/dashboard');
  });

  it('adminGuard redirects guests to /login and falls back to /dashboard when the role check fails', async () => {
    user.isAuthenticated.and.resolveTo(false);
    expect(urlOf(await run(adminGuard))).toBe('/login');
    user.isAuthenticated.and.resolveTo(true);
    profiles.getMine.and.rejectWith(new Error('network'));
    expect(urlOf(await run(adminGuard))).toBe('/dashboard');
    expect(logger.error).toHaveBeenCalled();
  });
});
