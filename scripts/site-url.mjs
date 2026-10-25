// Me quedo solo con el origen de SITE_URL; un valor vacío o inválido queda como "sin configurar".
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

export class SiteUrl {
  #origin;

  constructor(rawValue) {
    this.#origin = SiteUrl.#originOf(rawValue);
  }

  get origin() {
    return this.#origin;
  }

  get isConfigured() {
    return this.#origin !== '';
  }

  /** Devuelvo la URL absoluta de una ruta (p. ej. "/map" → "https://alasonora.com/map"). */
  resolve(path) {
    return new URL(path, this.#origin).href;
  }

  static #originOf(rawValue) {
    const value = rawValue?.trim();
    if (!value) return '';
    try {
      const url = new URL(value);
      return ALLOWED_PROTOCOLS.includes(url.protocol) ? url.origin : '';
    } catch {
      return '';
    }
  }
}
