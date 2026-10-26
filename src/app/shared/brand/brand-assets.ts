// Único lugar con las rutas de la marca dentro de public/; index.html, el manifest y ngsw-config.json
// son estáticos y repiten las de los íconos de la app.
export const BRAND_ASSETS = {
  symbol: { path: 'images/brand/alasonora-symbol.webp', width: 288, height: 288 },
  socialImage: { path: 'images/brand/og-image.png', width: 1200, height: 630, type: 'image/png' },
} as const;
