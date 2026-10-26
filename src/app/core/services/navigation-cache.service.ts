import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { UserService } from './user.service';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';

/** Lo que cada pantalla privada le pide al backend y que vale la pena recordar al volver. */
export const NAVIGATION_CACHE_KEYS = {
  myDetections: 'my-detections',
  myStats: 'my-stats',
  personalFeed: 'personal-feed',
  publicFeed: 'public-feed',
} as const;

export type NavigationCacheKey = (typeof NAVIGATION_CACHE_KEYS)[keyof typeof NAVIGATION_CACHE_KEYS];

// Todo lo que depende de las detecciones: lo invalido junto cada vez que cambia una.
export const DETECTION_CACHE_KEYS: NavigationCacheKey[] = Object.values(NAVIGATION_CACHE_KEYS);

interface CacheEntry {
  value: unknown;
  /** Dueño de los datos: nunca le sirvo a una cuenta lo que pidió otra. */
  userId: string | null;
  storedAt: number;
}

/**
 * Recuerdo en memoria la última respuesta de cada pantalla para mostrarla al instante al volver,
 * mientras pido la nueva en segundo plano. Solo en el navegador y nunca en localStorage.
 */
@Injectable({ providedIn: 'root' })
export class NavigationCacheService {
  private readonly user = inject(UserService);
  private readonly logger = inject(LoggerService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly maxAgeMs = environment.navigationCache.maxAgeMs;
  private readonly entries = signal(new Map<NavigationCacheKey, CacheEntry>());

  constructor() {
    // Al cerrar sesión o entrar con otra cuenta descarto todo lo guardado.
    let lastUserId: string | null | undefined;
    effect(() => {
      const userId = this.user.currentUser()?.id ?? null;
      if (lastUserId !== undefined && userId !== lastUserId) this.clear();
      lastUserId = userId;
    });
  }

  peek<T>(key: NavigationCacheKey): T | undefined {
    const entry = this.entries().get(key);
    if (!entry || entry.userId !== this.currentUserId()) return undefined;
    if (Date.now() - entry.storedAt > this.maxAgeMs) return undefined;
    return entry.value as T;
  }

  /** Pido al backend y guardo la respuesta, salvo que la sesión haya cambiado mientras llegaba. */
  async fetch<T>(key: NavigationCacheKey, loader: () => Promise<T>): Promise<T> {
    const userId = this.currentUserId();
    const value = await loader();
    if (this.isBrowser && userId === this.currentUserId()) {
      this.entries.update((map) => new Map(map).set(key, { value, userId, storedAt: Date.now() }));
    }
    return value;
  }

  /**
   * Entrego primero lo guardado (si hay) y luego lo fresco. Solo fallo si no tenía nada que mostrar;
   * si ya mostré algo, un fallo de red deja esos datos en pantalla.
   */
  async staleWhileRevalidate<T>(key: NavigationCacheKey, loader: () => Promise<T>, apply: (value: T) => void): Promise<void> {
    const cached = this.peek<T>(key);
    if (cached !== undefined) apply(cached);
    try {
      apply(await this.fetch(key, loader));
    } catch (error) {
      if (cached === undefined) throw error;
      this.logger.warn('NavigationCache', `could not refresh ${key}, keeping the last data`, error);
    }
  }

  invalidate(keys: NavigationCacheKey[]): void {
    this.entries.update((map) => {
      const next = new Map(map);
      keys.forEach((key) => next.delete(key));
      return next;
    });
  }

  clear(): void {
    this.entries.set(new Map());
  }

  private currentUserId(): string | null {
    return this.user.currentUser()?.id ?? null;
  }
}
