import { demoAccount } from './demo-account';
import { siteUrl } from './site-url';

export const environment = {
  production: false,
  supabaseUrl: 'https://pfwvhdtygwvrbdvmbywk.supabase.co',
  supabasePublishableKey: 'sb_publishable_P3y3pPV_uvjd4iZuR2izEw_v8xryM97',
  apiBaseUrl: 'http://localhost:8083/api',
  // Oculto la identificación por foto, que queda como mejora futura; el backend la conserva, así que basta ponerla en true.
  photoIdentificationEnabled: false,
  // Ilustración de la app cuando una especie no tiene foto o su foto no carga.
  speciesImageFallback: 'images/sketch.webp',
  // Motor dormido (Render gratis): cada cuánto pregunto, cuánto espero al backend (~2 min si duerme) y al motor,
  // y cuánto confío en un "listo".
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
  // Barra de progreso (%): la subida real llega a uploadEnd, la verificación a verifyEnd y el análisis estimado no pasa de estimateCap;
  // estimateTauMs marca qué tan rápido se acerca.
  classificationProgress: {
    uploadEnd: 60,
    verifyEnd: 70,
    estimateCap: 95,
    estimateTauMs: 15000,
    tickMs: 200,
  },
  // Caché en memoria al cambiar de pantalla: muestro lo último que vi y lo actualizo en segundo plano.
  // Pasado maxAgeMs lo descarto y vuelvo a mostrar la carga.
  navigationCache: {
    maxAgeMs: 300000,
  },
  // Registro liviano de las grabaciones offline ya enviadas (sin audio): cuántas guardo y por cuántos días.
  offlineRecordingsLog: {
    maxEntries: 20,
    maxAgeDays: 30,
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
