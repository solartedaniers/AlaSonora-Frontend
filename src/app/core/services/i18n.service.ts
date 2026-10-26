import { HttpClient } from '@angular/common/http';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type AppLang = 'es' | 'en';

const STORAGE_KEY = 'alasonora.lang';
type TranslationDict = Record<string, unknown>;

/**
 * i18n propio sin dependencias: cargo es.json/en.json en ejecución y guardo las traducciones en un signal
 * para que la UI cambie de idioma sin recargar.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  // En el servidor (SSR/prerender) no existe localStorage: se usa el idioma
  // por defecto y el cliente aplica el guardado al hidratar.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly lang = signal<AppLang>(this.readStoredLang());
  readonly dict = signal<TranslationDict>({});
  private loadedLang: AppLang | null = null;

  /** Se resuelve cuando el diccionario inicial ya está cargado (lo espera el app initializer). */
  readonly ready: Promise<void> = this.loadDictionary(this.lang());

  constructor() {
    effect(() => {
      const lang = this.lang();
      if (this.isBrowser) localStorage.setItem(STORAGE_KEY, lang);
      this.document.documentElement.lang = lang;
      if (lang !== this.loadedLang) this.loadDictionary(lang);
    });
  }

  setLang(lang: AppLang): void {
    this.lang.set(lang);
  }

  toggleLang(): void {
    this.lang.set(this.lang() === 'es' ? 'en' : 'es');
  }

  /** Resuelve una clave con notación de puntos, ej. "landing.hero.title"; `{nombre}` se cambia por params.nombre. */
  translate(key: string, params?: Record<string, string | number>): string {
    const parts = key.split('.');
    let node: unknown = this.dict();
    for (const part of parts) {
      if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[part];
      } else {
        return key; // fallback visible para detectar claves faltantes en desarrollo
      }
    }
    if (typeof node !== 'string') return key;
    return params ? node.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match)) : node;
  }

  private async loadDictionary(lang: AppLang): Promise<void> {
    this.loadedLang = lang;
    const data = this.isBrowser
      ? await firstValueFrom(this.http.get<TranslationDict>(`i18n/${lang}.json`)).catch(
          () => ({}) as TranslationDict
        )
      : await this.importDictionary(lang);
    this.dict.set(data);
  }

  // En el servidor no hay origen HTTP para pedir el JSON, así que importo el archivo de public/; en el navegador nunca corre.
  private async importDictionary(lang: AppLang): Promise<TranslationDict> {
    const module =
      lang === 'en'
        ? await import('../../../../public/i18n/en.json')
        : await import('../../../../public/i18n/es.json');
    return module.default as TranslationDict;
  }

  private readStoredLang(): AppLang {
    if (!this.isBrowser) return 'es';
    const stored = localStorage.getItem(STORAGE_KEY) as AppLang | null;
    return stored === 'en' ? 'en' : 'es';
  }
}
