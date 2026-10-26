import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { User } from '@supabase/supabase-js';
import { AppUser, ObserverRole, UserStats } from '../models';
import { SUPABASE_SESSION_STORAGE_KEY, SupabaseClientService } from './supabase-client.service';
import { AuthRedirectUrlService } from './auth-redirect-url.service';
import { environment } from '../../../environments/environment';

const DEFAULT_ROLE: ObserverRole = 'hobbyist';

/** Estado de sesión sobre Supabase Auth; los campos que no están en user_metadata vienen del Profile del backend. */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly http = inject(HttpClient);
  private readonly authRedirectUrls = inject(AuthRedirectUrlService);

  readonly currentUser = signal<AppUser | null>(null);

  constructor() {
    this.supabase.auth.getSession().then(({ data }) => {
      this.currentUser.set(this.toAppUser(data.session?.user ?? this.storedSession()?.user ?? null));
    });
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(this.toAppUser(session?.user ?? null));
    });
  }

  /** Leo la sesión local directamente y no currentUser, que se llena después: si no, los guards sacarían al usuario al recargar. */
  async isAuthenticated(): Promise<boolean> {
    // Sin conexión no puedo refrescar un token vencido y getSession() tardaría ~25 s en rendirse: me basta la sesión guardada
    // y al volver la conexión se refresca como siempre.
    if (!navigator.onLine) return this.storedSession() !== null;
    const { data } = await this.supabase.auth.getSession();
    return data.session !== null;
  }

  /** Token de acceso (JWT) de la sesión actual, si la hay; lo usa authInterceptor. */
  async getAccessToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  /** Igual que {@link isAuthenticated}: leo la sesión directamente y no el signal `currentUser`. */
  async getUserId(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession();
    return data.session?.user.id ?? null;
  }

  /** Pregunto al backend si el nombre de usuario tiene formato válido y está libre. */
  async checkUsername(username: string): Promise<{ valid: boolean; available: boolean }> {
    return firstValueFrom(
      this.http.get<{ valid: boolean; available: boolean }>(`${environment.apiBaseUrl}/usernames/availability`, {
        params: { username },
      })
    );
  }

  // Se envía la zona horaria del navegador para que la racha cuente días
  // del calendario del usuario, no del servidor.
  async getStats(): Promise<UserStats> {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return firstValueFrom(
      this.http.get<UserStats>(`${environment.apiBaseUrl}/detections/mine/stats`, { params: { zone } })
    );
  }

  async login(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  /** Devuelve true si la cuenta quedó con sesión (sin confirmación de correo pendiente). */
  async register(username: string, email: string, password: string, role: ObserverRole): Promise<boolean> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { username, role }, emailRedirectTo: this.authRedirectUrls.emailConfirmation() },
    });
    if (error) throw error;
    return data.session !== null;
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: this.authRedirectUrls.passwordReset(),
    });
    if (error) throw error;
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  /** Copio la edición del Profile a user_metadata para que currentUser quede al día sin una segunda fuente. */
  async syncMetadata(patch: {
    username?: string;
    avatar_url?: string;
    institution?: string;
    orcid_id?: string;
    station_name?: string;
  }): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ data: patch });
    if (error) throw error;
  }

  private storedSession(): { user: User } | null {
    try {
      return JSON.parse(localStorage.getItem(SUPABASE_SESSION_STORAGE_KEY) ?? 'null');
    } catch {
      return null;
    }
  }

  private toAppUser(user: User | null): AppUser | null {
    if (!user) return null;
    const metadata = user.user_metadata ?? {};
    return {
      id: user.id,
      fullName: metadata['full_name'] ?? user.email ?? '',
      username: metadata['username'] ?? '',
      email: user.email ?? '',
      role: (metadata['role'] as ObserverRole) ?? DEFAULT_ROLE,
      institution: metadata['institution'],
      avatarUrl: metadata['avatar_url'],
      orcidId: metadata['orcid_id'],
      stationName: metadata['station_name'],
    };
  }
}
