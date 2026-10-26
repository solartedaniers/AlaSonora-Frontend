import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Clave de localStorage de la sesión, la misma que deriva el SDK; la escribo para que UserService la lea sin conexión
 * sin pasar por getSession(), que intenta refrescar un token vencido.
 */
export const SUPABASE_SESSION_STORAGE_KEY = `sb-${new URL(environment.supabaseUrl).hostname.split('.')[0]}-auth-token`;

/** Único cliente de Supabase: Auth, Storage y Realtime comparten conexión y sesión. */
@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  // En el servidor no hay sesión que guardar ni refrescar; en el navegador quedan en true como en el SDK.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        persistSession: this.isBrowser,
        autoRefreshToken: this.isBrowser,
        detectSessionInUrl: this.isBrowser,
        storageKey: SUPABASE_SESSION_STORAGE_KEY,
      },
    }
  );
}
