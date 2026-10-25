# AlaSonora · Frontend

PWA de AlaSonora con Angular 22, Tailwind y SSR. Graba o sube el canto de un ave, muestra el
espectrograma en vivo, envía el audio al backend para identificar la especie y presenta el mapa
de detecciones de la red de observadores. Funciona sin conexión: las grabaciones pendientes se
sincronizan al volver la red.

## Requisitos

- Node.js 24 y npm
- El backend de AlaSonora corriendo (repo AlaSonora-Backend) y un proyecto de Supabase

## Ejecución

```bash
npm ci
npm start                      # ng serve en http://localhost:4200
```

La URL del backend, la URL de Supabase y su clave *publishable* (pública por diseño, protegida por
RLS) están en `src/environments/environment*.ts`.

## Build de producción

```bash
npm run build                  # node scripts/build.mjs → ng build (SSR + prerender)
npm run serve:ssr:frontend     # servidor Node de SSR en http://localhost:4000
```

`prebuild` revisa que todos los íconos de Material Symbols usados estén en la lista central.

## Variables de entorno

Solo las lee `npm run build` (de las variables del sistema o de un `.env`, ver `.env.example`):

| Variable | Uso |
|---|---|
| `DEMO_ACCOUNT_EMAIL` | Correo de la cuenta de ejemplo que el login muestra como placeholder |
| `DEMO_ACCOUNT_PASSWORD` | Contraseña de esa cuenta de ejemplo |
| `SITE_URL` | Origen público del sitio (`https://alasonora.com`): link canonical, `og:url`, `robots.txt` y `sitemap.xml` |

Si no existen, el login muestra los placeholders genéricos y el build no falla; sin `SITE_URL`, el build sale sin
canonical ni `og:url`, `robots.txt` sin la línea `Sitemap:` y sin `sitemap.xml`. `robots.txt` y `sitemap.xml` se
generan al final del build (`scripts/seo-files.mjs`) a partir de `seo/robots.txt` y `seo/sitemap-routes.json`.

Los enlaces de los correos de Supabase Auth (confirmar la cuenta y restablecer la contraseña) vuelven al origen
actual del navegador (`AuthRedirectUrlService`), así que funcionan igual desde el dominio propio, desde onrender
y en local, siempre que ese origen esté en las Redirect URLs de Supabase.

## Pruebas

```bash
npm ci
npx ng test --watch=false --browsers=ChromeHeadless
```

Usan Karma + Jasmine (ya incluidos) y el Chrome instalado en la máquina (`CHROME_BIN` si no lo
encuentra). Cubren validadores, pipes, guards, el interceptor de autenticación, el servicio de
i18n, la barra de progreso de la clasificación y los placeholders del login. El workflow
`.github/workflows/ci.yml` corre el build y las pruebas en cada push a `main`.

## Arquitectura de rendering y workers

| Patrón | Dónde |
|---|---|
| SSG (prerender en el build) | `/`, `/login`, `/register`, `/forgot-password` |
| SSR + caché ISR (stale-while-revalidate) | `/map`, con la caché en `src/server.ts` |
| CSR | rutas privadas (`/dashboard`, `/record`, `/history`, …) y `/reset-password` |
| Hidratación incremental y replay de eventos | `provideClientHydration(withEventReplay(), withIncrementalHydration())` en `app.config.ts` |

- **Web Worker** (`workers/audio-processing.worker.ts`): calcula la FFT del audio en vivo fuera del
  hilo principal; el espectrograma se pinta en `requestAnimationFrame` (tarea) con los datos que
  llegan por mensajes del worker.
- **Shared Worker** (`workers/sync.worker.ts`): sincroniza el mapa de detecciones en vivo entre
  pestañas del mismo origen.
- **Service Worker** (`@angular/service-worker`, `ngsw-config.json` y `public/sw.js`): caché de la
  app, funcionamiento offline y sincronización diferida de las grabaciones pendientes.
- La elección de patrón por ruta está explicada en `src/app/app.routes.server.ts`.

## Despliegue en Render (Web Service de Node)

El servicio vive en la raíz de este repositorio, así que el Root Directory queda vacío.

| Ajuste | Valor |
|---|---|
| Root Directory | *(vacío)* |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm run serve:ssr:frontend` |
| Variables | `SITE_URL` (`https://alasonora.com`); `DEMO_ACCOUNT_EMAIL`, `DEMO_ACCOUNT_PASSWORD` (opcionales) |

## Proyecto AlaSonora

| Parte | Repositorio |
|---|---|
| Frontend (este repositorio) | https://github.com/solartedaniers/AlaSonora-Frontend |
| Backend (Spring Boot, API REST) | https://github.com/solartedaniers/AlaSonora-Backend |
| Motor de IA (FastAPI + BirdNET) | https://github.com/solartedaniers/AlaSonora-IA |

App desplegada: https://alasonora.com (también responde en https://alasonora-frontend.onrender.com)
