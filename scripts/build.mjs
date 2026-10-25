// Corro ng build inyectando DEMO_ACCOUNT_* y SITE_URL (entorno o .env) y luego genero robots.txt y sitemap.xml.
// Si falta alguna variable, omito lo que depende de ella; el build nunca falla por eso.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SeoFiles } from './seo-files.mjs';
import { SiteUrl } from './site-url.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const NG_CLI = fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url));
const DEMO_ACCOUNT_VARIABLES = ['DEMO_ACCOUNT_EMAIL', 'DEMO_ACCOUNT_PASSWORD'];
const SITE_URL_VARIABLE = 'SITE_URL';
const ANGULAR_PROJECT = 'frontend';
const BROWSER_OUTPUT_FOLDER = 'browser';

// Las variables reales del entorno (Render) mandan sobre las del .env local.
if (existsSync(`${ROOT}.env`)) {
  process.loadEnvFile(`${ROOT}.env`);
}

const siteUrl = new SiteUrl(process.env[SITE_URL_VARIABLE]);
if (!siteUrl.isConfigured) {
  console.warn(`${SITE_URL_VARIABLE} is empty or invalid: building without canonical, og:url or sitemap.xml.`);
}

const define = (name, value) => ['--define', `${name}=${JSON.stringify(value)}`];
const defines = [
  ...DEMO_ACCOUNT_VARIABLES.flatMap((name) => define(name, process.env[name] ?? '')),
  ...define(SITE_URL_VARIABLE, siteUrl.origin),
];

const { status } = spawnSync(process.execPath, [NG_CLI, 'build', ...defines, ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
});

if (status === 0) {
  const angularJson = JSON.parse(readFileSync(join(ROOT, 'angular.json'), 'utf8'));
  const { outputPath } = angularJson.projects[ANGULAR_PROJECT].architect.build.options;
  const seoFiles = new SeoFiles(siteUrl, {
    robotsRulesPath: join(ROOT, 'seo/robots.txt'),
    sitemapRoutesPath: join(ROOT, 'seo/sitemap-routes.json'),
  });
  const written = seoFiles.writeTo(join(ROOT, outputPath, BROWSER_OUTPUT_FOLDER));
  console.log(`SEO files written: ${written.join(', ')}${siteUrl.isConfigured ? ` for ${siteUrl.origin}` : ''}.`);
}
process.exit(status ?? 1);
