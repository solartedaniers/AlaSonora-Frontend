import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';
import { NAVIGATION_CACHE_KEYS, NavigationCacheService } from './navigation-cache.service';
import { UserService } from './user.service';

describe('NavigationCacheService', () => {
  const key = NAVIGATION_CACHE_KEYS.myDetections;
  let currentUser: ReturnType<typeof signal<{ id: string } | null>>;
  let cache: NavigationCacheService;

  const setUp = (platform = 'browser') => {
    currentUser = signal<{ id: string } | null>({ id: 'user-1' });
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: UserService, useValue: { currentUser } },
        { provide: LoggerService, useValue: { warn: () => undefined } },
      ],
    });
    cache = TestBed.inject(NavigationCacheService);
    TestBed.tick();
  };

  afterEach(() => jasmine.clock().uninstall());

  it('shows the saved data at once and then the fresh data', async () => {
    setUp();
    await cache.fetch(key, async () => ['old']);
    const shown: string[][] = [];

    await cache.staleWhileRevalidate(key, async () => ['new'], (value) => shown.push(value));

    expect(shown).toEqual([['old'], ['new']]);
    expect(cache.peek(key)).toEqual(['new']);
  });

  it('keeps the saved data on screen when the refresh fails', async () => {
    setUp();
    await cache.fetch(key, async () => ['old']);
    const shown: string[][] = [];

    await cache.staleWhileRevalidate(key, () => Promise.reject(new Error('offline')), (value) => shown.push(value));

    expect(shown).toEqual([['old']]);
  });

  it('fails like before when there is nothing saved yet', async () => {
    setUp();

    await expectAsync(cache.staleWhileRevalidate(key, () => Promise.reject(new Error('offline')), () => undefined)).toBeRejected();
  });

  it('forgets the data after the configured lifetime', async () => {
    setUp();
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-10-26T10:00:00Z'));
    await cache.fetch(key, async () => ['old']);

    jasmine.clock().tick(environment.navigationCache.maxAgeMs + 1);

    expect(cache.peek(key)).toBeUndefined();
  });

  it('drops the given keys when the data changes', async () => {
    setUp();
    await cache.fetch(key, async () => ['old']);
    await cache.fetch(NAVIGATION_CACHE_KEYS.myStats, async () => ({ total: 1 }));

    cache.invalidate([key]);

    expect(cache.peek(key)).toBeUndefined();
    expect(cache.peek(NAVIGATION_CACHE_KEYS.myStats)).toEqual({ total: 1 });
  });

  it('wipes everything when the session closes, so another account never sees it', async () => {
    setUp();
    await cache.fetch(key, async () => ['mine']);

    currentUser.set(null);
    TestBed.tick();
    currentUser.set({ id: 'user-2' });
    TestBed.tick();

    expect(cache.peek(key)).toBeUndefined();
  });

  it('does not keep a response that arrives after the account changed', async () => {
    setUp();
    let resolve!: (value: string[]) => void;
    const pending = cache.fetch(key, () => new Promise<string[]>((r) => (resolve = r)));

    currentUser.set({ id: 'user-2' });
    resolve(['from user-1']);
    await pending;

    expect(cache.peek(key)).toBeUndefined();
  });

  it('never stores anything on the server', async () => {
    setUp('server');

    await cache.fetch(key, async () => ['ssr']);

    expect(cache.peek(key)).toBeUndefined();
  });
});
