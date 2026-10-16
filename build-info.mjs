// Datos de la versión que se compila. astro.config.mjs los expone como __BUILD__
// a la app y al service worker (src/pages/sw.js.ts).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

function commit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try { return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return 'local'; }
}

const ahora = new Date();
const [d, m, y] = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric' })
  .format(ahora).split('/');

export const BUILD = {
  version: pkg.version,
  commit: commit(),
  fecha: `${d}-${m}-${y}`,
  // Cambia en cada build, aunque la versión sea la misma: así el navegador detecta el sw.js nuevo
  id: `${pkg.version}-${ahora.getTime().toString(36)}`,
};
