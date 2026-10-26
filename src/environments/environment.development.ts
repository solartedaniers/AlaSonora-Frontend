import { demoAccount } from './demo-account';
import { siteUrl } from './site-url';

export const environment = {
  production: false,
  supabaseUrl: 'https://pfwvhdtygwvrbdvmbywk.supabase.co',
  supabasePublishableKey: 'sb_publishable_P3y3pPV_uvjd4iZuR2izEw_v8xryM97',
  apiBaseUrl: 'http://localhost:8083/api',
  // Oculto a propósito la identificación por foto: es una mejora futura, fuera del
  // alcance actual. El backend la conserva (PHOTO_CLASSIFICATION_ENABLED), así que
  // basta poner esto en true para reactivarla.
  photoIdentificationEnabled: false,
  // Ilustración de la app cuando una especie no tiene foto o su foto no carga.
  speciesImageFallback: 'images/sketch.webp',
  // Motor de IA dormido (Render gratis): cada cuánto pregunto si despertó, cuánto espero a que responda
  // el backend (también puede estar dormido, ~2 min), cuánto espero al motor desde esa respuesta y por
  // cuánto tiempo confío en un "listo" antes de volver a preguntar.
  aiEngine: {
    statusPollMs: 3000,
    backendWakeTimeoutMs: 240000,
    wakeTimeoutMs: 300000,
    readyFreshMs: 600000,
    // Render no deja que el backend lo despierte (429): mientras sigue encendiendo, el navegador visita
    // este /health público cada browserWakeIntervalMs y abandona cada visita a los browserWakeTimeoutMs.
    healthUrl: 'http://localhost:8000/health',
    browserWakeIntervalMs: 60000,
    browserWakeTimeoutMs: 30000,
  },
  // Nombre de usuario: solo letras y números; los mismos límites que profile.username.* del backend.
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[A-Za-z0-9]+$/,
    checkDebounceMs: 400,
  },
  // Audio que acepto subir: el mismo tope que audio.upload.max-bytes del backend (10 MB).
  audioUpload: {
    maxBytes: 10485760,
    extensions: ['wav', 'flac', 'mp3'],
  },
  // Barra de progreso al clasificar (en %): la subida real llega hasta uploadEnd, la verificación hasta
  // verifyEnd y el análisis avanza estimado (sin dato real del servidor) sin pasar de estimateCap hasta
  // que llega la respuesta. estimateTauMs marca qué tan rápido se acerca a ese tope.
  classificationProgress: {
    uploadEnd: 60,
    verifyEnd: 70,
    estimateCap: 95,
    estimateTauMs: 15000,
    tickMs: 200,
  },
  // Duración de los avisos breves (p. ej. "Confirma en tu correo" al registrarse).
  toastMs: 3000,
  demoAccount,
  // Lo uso para el link canonical y og:url (ver site-url.ts).
  siteUrl,
  // Con estas rutas los correos de Supabase Auth vuelven al origen actual del navegador.
  authRedirectPaths: {
    emailConfirmation: '/',
    passwordReset: '/reset-password',
  },
};
