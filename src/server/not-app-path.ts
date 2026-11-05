export interface NotAppPathConfig {
  /** Carpetas con punto que sí pueden existir (por ejemplo .well-known). */
  allowedDotSegments: string[];
  /** Primer segmento de rutas que solo piden los escáneres (wp-admin, cgi-bin…). */
  scannerSegments: string[];
}

/**
 * Decido si una ruta no es de la app. Lo uso después de los archivos estáticos: si una ruta con
 * extensión llegó hasta aquí es porque el archivo no existe, así que respondo 404 sin pasar por Angular.
 */
export class NotAppPathFilter {
  private readonly allowedDotSegments: Set<string>;
  private readonly scannerSegments: Set<string>;

  constructor(config: NotAppPathConfig) {
    this.allowedDotSegments = new Set(config.allowedDotSegments.map((segment) => segment.toLowerCase()));
    this.scannerSegments = new Set(config.scannerSegments.map((segment) => segment.toLowerCase()));
  }

  matches(path: string): boolean {
    const segments = path.toLowerCase().split('/').filter(Boolean);
    if (segments.length === 0) return false;
    if (this.scannerSegments.has(segments[0])) return true;
    if (segments.some((segment) => segment.startsWith('.') && !this.allowedDotSegments.has(segment))) return true;
    // Ninguna ruta de Angular lleva punto: un punto en el último segmento es un archivo (.json, .php, go.mod…).
    return segments[segments.length - 1].lastIndexOf('.') > 0;
  }
}
