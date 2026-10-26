import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { AuthRedirectUrlService } from './auth-redirect-url.service';
import { LoggerService } from './logger.service';
import { OfflineRecordingsLogService } from './offline-recordings-log.service';
import { SupabaseClientService } from './supabase-client.service';
import { UserService } from './user.service';

describe('UserService logout', () => {
  let signOut: jasmine.Spy;
  let clear: jasmine.Spy;
  let warn: jasmine.Spy;
  let service: UserService;

  beforeEach(() => {
    signOut = jasmine.createSpy('signOut').and.resolveTo({ error: null });
    clear = jasmine.createSpy('clear').and.resolveTo();
    warn = jasmine.createSpy('warn');
    const auth = {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => undefined,
      signOut,
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseClientService, useValue: { client: { auth } } },
        { provide: HttpClient, useValue: {} },
        { provide: AuthRedirectUrlService, useValue: {} },
        { provide: OfflineRecordingsLogService, useValue: { clear } },
        { provide: LoggerService, useValue: { warn } },
      ],
    });
    service = TestBed.inject(UserService);
  });

  it('wipes the offline recordings log from the device after signing out', async () => {
    await service.logout();

    expect(signOut).toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
  });

  it('completes the sign out even if the log cannot be cleared', async () => {
    clear.and.rejectWith(new Error('IndexedDB unavailable'));

    await expectAsync(service.logout()).toBeResolved();

    expect(signOut).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  it('keeps the log when Supabase could not sign out', async () => {
    signOut.and.resolveTo({ error: new Error('network') });

    await expectAsync(service.logout()).toBeRejected();

    expect(clear).not.toHaveBeenCalled();
  });
});
