// Build de producción (npm run build): corre ng build e inyecta la cuenta de ejemplo del login desde
// DEMO_ACCOUNT_EMAIL y DEMO_ACCOUNT_PASSWORD (variables de entorno o .env). Si no existen, inyecto
// cadenas vacías y el login muestra sus placeholders genéricos; el build nunca falla por eso.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const NG_CLI = fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url));
const DEMO_ACCOUNT_VARIABLES = ['DEMO_ACCOUNT_EMAIL', 'DEMO_ACCOUNT_PASSWORD'];

// Las variables reales del entorno (Render) mandan sobre las del .env local.
if (existsSync(`${ROOT}.env`)) {
  process.loadEnvFile(`${ROOT}.env`);
}

const defines = DEMO_ACCOUNT_VARIABLES.flatMap((name) => [
  '--define',
  `${name}=${JSON.stringify(process.env[name] ?? '')}`,
]);

const { status } = spawnSync(process.execPath, [NG_CLI, 'build', ...defines, ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
});
process.exit(status ?? 1);
