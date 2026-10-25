// Recibo el origen público (p. ej. https://alasonora.com) desde SITE_URL en el build; queda vacío si falta.
declare const SITE_URL: string | undefined;

export const siteUrl = typeof SITE_URL === 'string' ? SITE_URL : '';
