import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateDetectionRequest, Detection } from '../models';
import { SupabaseClientService } from './supabase-client.service';
import { storageObjectName } from './storage-object-name';
import { DETECTION_CACHE_KEYS, NavigationCacheService } from './navigation-cache.service';

/** Detección tal como la devuelve el backend, sin el estado de sincronización offline. */
type DetectionApiResponse = Omit<Detection, 'syncStatus'>;

const OBSERVER_PHOTOS_BUCKET = 'observer-photos';

/** Cuaderno de campo: getAll() es el feed público del mapa y getMine() el historial del usuario. */
@Injectable({ providedIn: 'root' })
export class DetectionsService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseClientService).client;
  private readonly cache = inject(NavigationCacheService);
  private readonly baseUrl = `${environment.apiBaseUrl}/detections`;

  /** fresh salta la caché de transferencia del SSR: sin esto, una detección guardada después de cargar no aparecería. */
  async getAll(fresh = false): Promise<Detection[]> {
    const params = new HttpParams().set('visibility', 'public');
    const detections = await firstValueFrom(
      this.http.get<DetectionApiResponse[]>(this.baseUrl, { params, transferCache: !fresh })
    );
    return detections.map((d) => this.withSyncStatus(d));
  }

  /** Con sesión: las públicas más mis privadas (GET /api/detections/feed); nunca pasa por la caché del SSR. */
  async getFeed(): Promise<Detection[]> {
    const detections = await firstValueFrom(this.http.get<DetectionApiResponse[]>(`${this.baseUrl}/feed`));
    return detections.map((d) => this.withSyncStatus(d));
  }

  async create(request: CreateDetectionRequest): Promise<Detection> {
    const created = await firstValueFrom(
      this.http.post<DetectionApiResponse>(this.baseUrl, request)
    );
    // Sirve igual para el guardado en línea y para la sincronización offline: ambos pasan por aquí.
    this.cache.invalidate(DETECTION_CACHE_KEYS);
    return this.withSyncStatus(created);
  }

  async getMine(): Promise<Detection[]> {
    const detections = await firstValueFrom(
      this.http.get<DetectionApiResponse[]>(`${this.baseUrl}/mine`)
    );
    return detections.map((d) => this.withSyncStatus(d));
  }

  // Uso el endpoint dedicado porque el backend firma una URL de audio nueva en cada solicitud.
  async getById(id: string): Promise<Detection | undefined> {
    try {
      const detection = await firstValueFrom(
        this.http.get<DetectionApiResponse>(`${this.baseUrl}/${id}`)
      );
      return this.withSyncStatus(detection);
    } catch {
      return undefined;
    }
  }

  /** Todo mi historial, de la más reciente a la más antigua (una sola petición a /mine). */
  async getMineNewestFirst(): Promise<Detection[]> {
    return DetectionsService.newestFirst(await this.getMine());
  }

  static newestFirst(detections: Detection[]): Detection[] {
    return [...detections].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }

  /** Historial de cualquier usuario, solo para el panel de administración (GET /api/admin/users/{id}/detections). */
  async getForUser(userId: string): Promise<Detection[]> {
    const detections = await firstValueFrom(
      this.http.get<DetectionApiResponse[]>(`${environment.apiBaseUrl}/admin/users/${userId}/detections`)
    );
    return detections.map((d) => this.withSyncStatus(d));
  }

  /** Subo la foto del observador al bucket privado observer-photos y guardo el path en el backend, que la firma como el audio. */
  async uploadObserverPhoto(detectionId: string, userId: string, file: File): Promise<Detection> {
    // Nombre único sin upsert: con upsert Storage exige también SELECT y la política no lo tenía.
    const path = `${userId}/${storageObjectName(file, detectionId)}`;
    const { error } = await this.supabase.storage
      .from(OBSERVER_PHOTOS_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (error) throw error;

    const updated = await firstValueFrom(
      this.http.put<DetectionApiResponse>(`${this.baseUrl}/${detectionId}/observer-photo`, {
        observerPhotoStoragePath: path,
      })
    );
    this.cache.invalidate(DETECTION_CACHE_KEYS);
    return this.withSyncStatus(updated);
  }

  /** Borra cualquier detección (pública o privada), solo para el panel de administración. */
  /** Solo borra si soy el dueño: si es de otro o ya no existe, el backend responde 404. */
  async deleteMine(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${environment.apiBaseUrl}/detections/${id}`));
    this.cache.invalidate(DETECTION_CACHE_KEYS);
  }

  async deleteAsAdmin(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${environment.apiBaseUrl}/admin/detections/${id}`));
    this.cache.invalidate(DETECTION_CACHE_KEYS);
  }

  // Toda detección que viene del backend ya está persistida, así que su
  // estado de sincronización offline es siempre "synced".
  private withSyncStatus(detection: DetectionApiResponse): Detection {
    return { ...detection, syncStatus: 'synced' };
  }
}
