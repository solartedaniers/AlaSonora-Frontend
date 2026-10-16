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

Si no existen, el login muestra los placeholders genéricos y el build no falla.

## Pruebas

```bash
npm ci
npx ng test --watch=false --browsers=ChromeHeadless
```

Usan Karma + Jasmine (ya incluidos) y el Chrome instalado en la máquina (`CHROME_BIN` si no lo
encuentra). Cubren validadores, pipes, guards, el interceptor de autenticación, el servicio de
i18n, la barra de progreso de la clasificación y los placeholders del login. El workflow
`.github/workflows/ci.yml` corre el build y las pruebas en cada push a `main`.
