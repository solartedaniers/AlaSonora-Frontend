import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * ISR para las rutas SSR públicas: sirvo el HTML guardado al instante y, si pasó ISR_REVALIDATE_MS, lo regenero en segundo plano.
 * ponytail: caché en memoria por proceso; con varias instancias la muevo a Redis o a un CDN.
 */
const ISR_ROUTES = new Set(['/map']);
const ISR_REVALIDATE_MS = 60_000;
// Pasado este tiempo ya no sirvo la copia vieja: renderizo de nuevo y espero. Coincide con stale-while-revalidate=300.
const ISR_MAX_STALE_MS = 300_000;
const ISR_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

interface IsrEntry {
  html: string;
  renderedAt: number;
}

const isrCache = new Map<string, IsrEntry>();
// Evita que varias visitas simultáneas regeneren la misma página a la vez.
const isrInFlight = new Map<string, Promise<string | null>>();

function regenerate(req: express.Request): Promise<string | null> {
  const key = req.path;
  const pending = isrInFlight.get(key);
  if (pending) return pending;

  const render = angularApp
    .handle(req)
    .then(async (response) => {
      // Errores (4xx/5xx) no se cachean: se deja que el handler normal responda.
      if (!response || response.status !== 200) return null;
      const html = await response.text();
      isrCache.set(key, { html, renderedAt: Date.now() });
      return html;
    })
    .finally(() => isrInFlight.delete(key));

  isrInFlight.set(key, render);
  return render;
}

app.get(/.*/, (req, res, next) => {
  if (!ISR_ROUTES.has(req.path)) return next();

  const cached = isrCache.get(req.path);
  const age = cached ? Date.now() - cached.renderedAt : Infinity;
  if (cached && age <= ISR_MAX_STALE_MS) {
    res.setHeader('Cache-Control', ISR_CACHE_CONTROL);
    res.setHeader('X-ISR-Cache', 'HIT');
    res.type('html').send(cached.html);
    if (age > ISR_REVALIDATE_MS) {
      regenerate(req).catch((error) => console.error('ISR: falló la regeneración de', req.path, error));
    }
    return;
  }

  regenerate(req)
    .then((html) => {
      if (html === null) return next();
      res.setHeader('Cache-Control', ISR_CACHE_CONTROL);
      res.setHeader('X-ISR-Cache', 'MISS');
      res.type('html').send(html);
    })
    .catch(next);
});

// Solo los archivos con hash en el nombre se guardan un año; el resto (sw.js, ngsw.json, i18n, íconos…) se revalida en cada visita.
const HASHED_ASSET = /(^|[\\/])(chunk|main|polyfills|styles|worker)-[\w-]{8,9}\.(js|css)$|[\\/]media[\\/]/;
const REVALIDATE = 'no-cache';

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      if (!HASHED_ASSET.test(path)) res.setHeader('Cache-Control', REVALIDATE);
    },
  }),
);

// El resto de rutas: SSG sirve el HTML prerenderizado y CSR el index.csr.html,
// según el renderMode de app.routes.server.ts.
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Lo usa el Angular CLI en `ng serve` y en el prerender de `ng build`.
export const reqHandler = createNodeRequestHandler(app);
