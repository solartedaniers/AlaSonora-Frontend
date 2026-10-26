import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Prerender para las páginas públicas fijas, Server (SSR + ISR en server.ts) para /map y Client para las privadas:
 * la sesión vive en el localStorage y /reset-password trae el token en el #hash, que no llega al servidor.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  { path: 'forgot-password', renderMode: RenderMode.Prerender },
  { path: 'map', renderMode: RenderMode.Server },
  { path: 'reset-password', renderMode: RenderMode.Client },
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'record', renderMode: RenderMode.Client },
  { path: 'result/:id', renderMode: RenderMode.Client },
  { path: 'photo-id', renderMode: RenderMode.Client },
  { path: 'history', renderMode: RenderMode.Client },
  { path: 'profile', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  // Cualquier otra ruta es la página 404: la respondo con ese status para buscadores y caches.
  { path: '**', renderMode: RenderMode.Client, status: 404 },
];
