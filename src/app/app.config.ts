import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withXhr, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
  withIncrementalHydration,
} from '@angular/platform-browser';
import { isDevMode, inject } from '@angular/core';

import { routes } from './app.routes';
import { I18nService } from './core/services/i18n.service';
import { ThemeService } from './core/services/theme.service';
import { I18nTitleStrategy } from './core/services/i18n-title.strategy';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Transición nativa entre rutas (View Transitions); el estilo y el movimiento reducido viven en styles.scss.
    provideRouter(routes, withComponentInputBinding(), withViewTransitions({ skipInitialTransition: true })),
    { provide: TitleStrategy, useClass: I18nTitleStrategy },
    provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
    // sw.js = ngsw-worker.js (caché del app shell) + manejador de Background Sync.
    provideServiceWorker('sw.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Creo ThemeService/I18nService temprano y espero el diccionario: si no, el HTML del servidor sale con claves crudas.
    provideAppInitializer(() => {
      inject(ThemeService);
      return inject(I18nService).ready;
    }),
    // Hidrato reutilizando el DOM del servidor; withEventReplay guarda los clics previos y @defer se hidrata cuando hace falta.
    // includeNonCacheableRequests pasa al cliente las respuestas no-store de Spring; es seguro porque en el servidor nunca hay sesión.
    provideClientHydration(
      withEventReplay(),
      withIncrementalHydration(),
      withHttpTransferCacheOptions({ includeNonCacheableRequests: true })
    ),
  ],
};
