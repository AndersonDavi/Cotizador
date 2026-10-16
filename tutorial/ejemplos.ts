// Imágenes de ejemplo para las páginas de contenido (/cotizacion y /cuenta-de-cobro).
// Solo datos ficticios (demo.mjs). Uso: npm run ejemplos
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { renderCotizacionHtml, renderCuentaCobroHtml, cuentaDesdeCotizacion, FONT_SPECS, fontKey, type FontUrls } from '../src/lib/doc';
import type { Cotizacion } from '../src/lib/state';
// @ts-expect-error módulo .mjs sin tipos
import { DEMO } from './demo.mjs';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'ejemplos');

const fonts: FontUrls = {};
for (const spec of FONT_SPECS) {
  const f = join(ROOT, 'node_modules', '@fontsource', spec.pkg, 'files', spec.file);
  if (existsSync(f)) fonts[fontKey(spec)] = `data:font/woff2;base64,${readFileSync(f).toString('base64')}`;
}

// La cotización de ejemplo muestra IVA, cantidades y anticipo
const c: Cotizacion = structuredClone(DEMO);
c.items[3] = { ...c.items[3], cantidad: 12, unidad: 'und', valor: 37500 };
c.impuestos = { ivaModo: 'agregar', ivaTasa: 19, anticipo: 50 };
c.vigenciaDias = 15;

const docs: [string, string, number][] = [
  ['cotizacion.jpg', renderCotizacionHtml(c, fonts), 1080],
  ['cuenta-de-cobro.jpg', renderCuentaCobroHtml(cuentaDesdeCotizacion({ ...c, cobro: { ...c.cobro, parte: 'anticipo' } }, '16-11-2026'), fonts), 816],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
for (const [file, html, width] of docs) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => (window as any).__docReady);
  await page.locator('.doc').screenshot({ path: join(OUT, file), type: 'jpeg', quality: 82 });
  console.log(`public/ejemplos/${file}`);
}
await browser.close();
