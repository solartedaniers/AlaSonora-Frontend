// Genero robots.txt y sitemap.xml con el origen público a partir de seo/. Sin SITE_URL omito sitemap.xml,
// porque exige URLs absolutas.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROBOTS_FILE = 'robots.txt';
const SITEMAP_FILE = 'sitemap.xml';
const SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';

export class SeoFiles {
  #siteUrl;
  #robotsRulesPath;
  #sitemapRoutesPath;

  constructor(siteUrl, { robotsRulesPath, sitemapRoutesPath }) {
    this.#siteUrl = siteUrl;
    this.#robotsRulesPath = robotsRulesPath;
    this.#sitemapRoutesPath = sitemapRoutesPath;
  }

  robots() {
    const rules = readFileSync(this.#robotsRulesPath, 'utf8').trimEnd();
    if (!this.#siteUrl.isConfigured) return `${rules}\n`;
    return `${rules}\n\nSitemap: ${this.#siteUrl.resolve(`/${SITEMAP_FILE}`)}\n`;
  }

  sitemap() {
    const routes = JSON.parse(readFileSync(this.#sitemapRoutesPath, 'utf8'));
    const entries = routes.map(({ path, changefreq, priority }) => [
      '  <url>',
      `    <loc>${this.#siteUrl.resolve(path)}</loc>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n'));
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<urlset xmlns="${SITEMAP_NAMESPACE}">`,
      ...entries,
      '</urlset>',
      '',
    ].join('\n');
  }

  /** Escribo los archivos en la carpeta pública del build y devuelvo cuáles escribí. */
  writeTo(directory) {
    const written = [ROBOTS_FILE];
    writeFileSync(join(directory, ROBOTS_FILE), this.robots());
    if (this.#siteUrl.isConfigured) {
      writeFileSync(join(directory, SITEMAP_FILE), this.sitemap());
      written.push(SITEMAP_FILE);
    }
    return written;
  }
}
