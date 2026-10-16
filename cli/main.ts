// CLI del Cotizador. Usa el mismo render HTML que la web y lo imprime con
// Playwright sobre el Edge (o Chrome) instalado: no descarga navegadores.
//
//   cotizador pdf    COTIZACION_00007.json [-o salida.pdf]
//   cotizador png    COTIZACION_00007.json [-o salida.png] [--escala 2]
//   cotizador html   COTIZACION_00007.json [-o salida.html]
//   cotizador md     COTIZACION_00007.json [-o salida.md]
//   cotizador cuenta COTIZACION_00007.json --desde 07-09-2026 --hasta 15-10-2026 [--cliente grupo-logis] [--marcar]
//   cotizador estado COTIZACION_00007.json [aprobada]
//   cotizador lista  [carpeta]
//   cotizador config

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  renderCotizacionHtml, renderCuentaCobroHtml, renderCotizacionMarkdown,
  cuentaDesdeCotizacion, parseFecha, FONT_SPECS, fontKey, type FontUrls,
} from '../src/lib/doc';
import {
  ESTADOS, ESTADO_LABELS, estadoDe, formatCOP, totalReal, today,
  type Cotizacion, type Estado, type Cliente,
} from '../src/lib/state';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(homedir(), '.cotizador.json');

type Config = {
  emisor?: { nombreLegal?: string; direccion?: string; banco?: string };
  clientes?: Record<string, Cliente>;
};

const AYUDA = `Cotizador CLI

Uso: cotizador <comando> <cotizacion.json> [opciones]

Comandos:
  pdf     Exporta la cotización a PDF vectorial (texto seleccionable)
  png     Exporta la cotización a PNG
  html    Guarda el HTML del documento
  md      Exporta a Markdown
  cuenta  Genera la cuenta de cobro en PDF
  estado  Muestra o cambia el estado (${ESTADOS.join(', ')})
  lista   Lista las cotizaciones (COTIZACION_*.json) de una carpeta, con estado
  config  Muestra la configuración (${CONFIG_PATH})

Opciones:
  -o, --out <ruta>       Archivo de salida (por defecto, junto al JSON)
  --escala <n>           Escala del PNG (por defecto 2)
  --desde <fecha>        Inicio del período cobrado (dd-mm-aaaa o aaaa-mm-dd)
  --hasta <fecha>        Fin del período cobrado
  --fecha <fecha>        Fecha de la cuenta de cobro (por defecto hoy)
  --cliente <clave|nombre>  Cliente (clave de config o nombre)
  --nit <nit>            NIT del cliente
  --concepto <texto>     Inicio del párrafo "Por concepto de" (el período se agrega solo)
  --parte <total|anticipo|saldo>  Con "cuenta": qué parte se cobra (si la cotización tiene anticipo)
  --marcar               Con "cuenta": guarda los datos de cobro en el JSON y lo marca como cobrada
  --html                 Con "cuenta": guarda también el HTML
`;

function fail(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return {};
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')); }
  catch { fail(`no se pudo leer ${CONFIG_PATH}`); }
}

function loadCotizacion(path: string | undefined): { c: Cotizacion; path: string } {
  if (!path) fail('falta la ruta del JSON de la cotización');
  const p = resolve(path);
  if (!existsSync(p)) fail(`no existe ${p}`);
  let c: Cotizacion;
  try { c = JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')); }
  catch { fail(`${p} no es un JSON válido`); }
  if (!c.numero || !Array.isArray(c.items) || !c.branding) fail(`${p} no es una cotización válida`);
  return { c, path: p };
}

function saveCotizacion(path: string, c: Cotizacion) {
  writeFileSync(path, JSON.stringify(c, null, 2) + '\n', 'utf8');
}

/** Completa nombre legal, dirección y banco desde la config si el JSON no los trae. */
function applyConfig(c: Cotizacion, cfg: Config) {
  const e = cfg.emisor ?? {};
  c.branding.nombreLegal ||= e.nombreLegal;
  c.branding.direccion ||= e.direccion;
  c.branding.banco ||= e.banco ?? '';
}

function fontsAsDataUrls(): FontUrls {
  const out: FontUrls = {};
  for (const spec of FONT_SPECS) {
    const f = join(ROOT, 'node_modules', '@fontsource', spec.pkg, 'files', spec.file);
    if (existsSync(f)) out[fontKey(spec)] = `data:font/woff2;base64,${readFileSync(f).toString('base64')}`;
  }
  return out;
}

function normFecha(s: string | undefined, flag: string): string | undefined {
  if (!s) return undefined;
  const f = parseFecha(s);
  if (!f) fail(`${flag} debe ser dd-mm-aaaa o aaaa-mm-dd (recibí "${s}")`);
  return `${String(f.d).padStart(2, '0')}-${String(f.m).padStart(2, '0')}-${f.y}`;
}

async function withPage<T>(width: number, fn: (page: import('playwright-core').Page) => Promise<T>, scale = 1): Promise<T> {
  const { chromium } = await import('playwright-core');
  let browser: import('playwright-core').Browser | undefined;
  const errors: string[] = [];
  for (const channel of ['msedge', 'chrome']) {
    try { browser = await chromium.launch({ channel }); break; }
    catch (e: any) { errors.push(`${channel}: ${String(e?.message ?? e).split('\n')[0]}`); }
  }
  if (!browser) fail(`no encontré Edge ni Chrome instalados.\n  ${errors.join('\n  ')}`);
  try {
    const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: scale });
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function htmlToPdf(html: string, out: string, width: number, pageSize?: 'Letter') {
  await withPage(width, async (page) => {
    await page.setContent(html, { waitUntil: 'load' });
    const size = await page.evaluate(() => (window as any).__docReady) as { width: number; height: number };
    await page.pdf({
      path: out,
      printBackground: true,
      ...(pageSize ? { format: pageSize } : { width: `${size.width}px`, height: `${size.height}px` }),
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  });
}

async function htmlToPng(html: string, out: string, width: number, scale: number) {
  await withPage(width, async (page) => {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => (window as any).__docReady);
    await page.locator('.doc').screenshot({ path: out });
  }, scale);
}

function outPath(opt: string | undefined, jsonPath: string, name: string): string {
  return resolve(opt ?? join(dirname(jsonPath), name));
}

function findCotizaciones(dir: string, depth = 4): string[] {
  const out: string[] = [];
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (depth > 0 && e !== 'node_modules') out.push(...findCotizaciones(p, depth - 1)); }
    else if (/^COTIZACION_.*\.json$/i.test(e)) out.push(p);
  }
  return out;
}

async function main() {
  const { values: o, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string', short: 'o' },
      escala: { type: 'string' },
      desde: { type: 'string' },
      hasta: { type: 'string' },
      fecha: { type: 'string' },
      cliente: { type: 'string' },
      nit: { type: 'string' },
      concepto: { type: 'string' },
      parte: { type: 'string' },
      marcar: { type: 'boolean' },
      html: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  const [cmd, arg, arg2] = positionals;
  if (!cmd || o.help || cmd === 'ayuda' || cmd === 'help') { console.log(AYUDA); return; }

  const cfg = loadConfig();

  switch (cmd) {
    case 'pdf': {
      const { c, path } = loadCotizacion(arg);
      const out = outPath(o.out, path, `COTIZACION_${c.numero}.pdf`);
      await htmlToPdf(renderCotizacionHtml(c, fontsAsDataUrls()), out, 1080);
      console.log(`PDF: ${out}`);
      break;
    }
    case 'png': {
      const { c, path } = loadCotizacion(arg);
      const out = outPath(o.out, path, `COTIZACION_${c.numero}.png`);
      await htmlToPng(renderCotizacionHtml(c, fontsAsDataUrls()), out, 1080, Number(o.escala) || 2);
      console.log(`PNG: ${out}`);
      break;
    }
    case 'html': {
      const { c, path } = loadCotizacion(arg);
      const out = outPath(o.out, path, `COTIZACION_${c.numero}.html`);
      writeFileSync(out, renderCotizacionHtml(c, fontsAsDataUrls()), 'utf8');
      console.log(`HTML: ${out}`);
      break;
    }
    case 'md': {
      const { c, path } = loadCotizacion(arg);
      const out = outPath(o.out, path, `COTIZACION_${c.numero}.md`);
      writeFileSync(out, renderCotizacionMarkdown(c), 'utf8');
      console.log(`Markdown: ${out}`);
      break;
    }
    case 'cuenta': {
      const { c, path } = loadCotizacion(arg);
      applyConfig(c, cfg);
      c.cobro = { ...c.cobro };
      const desde = normFecha(o.desde, '--desde'); if (desde) c.cobro.desde = desde;
      const hasta = normFecha(o.hasta, '--hasta'); if (hasta) c.cobro.hasta = hasta;
      const fecha = normFecha(o.fecha, '--fecha'); if (fecha) c.cobro.fecha = fecha;
      if (o.concepto) c.cobro.concepto = o.concepto;
      if (o.parte) {
        if (!['total', 'anticipo', 'saldo'].includes(o.parte)) fail('--parte debe ser total, anticipo o saldo');
        c.cobro.parte = o.parte as 'total' | 'anticipo' | 'saldo';
      }
      if (o.cliente) {
        const k = o.cliente.toLowerCase();
        const fromCfg = cfg.clientes?.[k] ?? Object.values(cfg.clientes ?? {}).find(x => x.nombre.toLowerCase() === k);
        c.cliente = fromCfg ? { ...fromCfg } : { nombre: o.cliente, nit: o.nit ?? c.cliente?.nit ?? '' };
      }
      if (o.nit) c.cliente = { nombre: c.cliente?.nombre ?? '', nit: o.nit };

      const faltan: string[] = [];
      if (!c.cliente?.nombre) faltan.push('cliente (--cliente)');
      if (!c.cliente?.nit) faltan.push('NIT (--nit)');
      if (!c.cobro.desde || !c.cobro.hasta) faltan.push('período (--desde y --hasta)');
      if (!c.branding.banco) faltan.push(`cuenta bancaria (emisor.banco en ${CONFIG_PATH})`);
      if (!c.branding.direccion) faltan.push(`dirección (emisor.direccion en ${CONFIG_PATH})`);
      if (faltan.length) fail(`faltan datos para la cuenta de cobro:\n  - ${faltan.join('\n  - ')}`);

      const cc = cuentaDesdeCotizacion(c, today());
      const html = renderCuentaCobroHtml(cc);
      const out = outPath(o.out, path, `CUENTA-COBRO-COTIZACION-${c.numero}.pdf`);
      await htmlToPdf(html, out, 816, 'Letter');
      if (o.html) writeFileSync(out.replace(/\.pdf$/i, '.html'), html, 'utf8');
      console.log(`Cuenta de cobro: ${out}`);
      console.log(`  ${cc.cliente.nombre} — ${formatCOP(cc.valor)}`);
      console.log(`  ${cc.concepto}`);
      if (o.marcar) {
        c.cobro.fecha ||= cc.fecha;
        c.estado = 'cobrada';
        const orig = loadCotizacion(path).c;
        saveCotizacion(path, { ...orig, estado: c.estado, cliente: c.cliente, cobro: c.cobro });
        console.log(`  ${basename(path)} marcada como cobrada`);
      }
      break;
    }
    case 'estado': {
      const { c, path } = loadCotizacion(arg);
      if (!arg2) { console.log(`${c.numero}: ${ESTADO_LABELS[estadoDe(c)]}`); break; }
      const nuevo = arg2.toLowerCase() as Estado;
      if (!(ESTADOS as readonly string[]).includes(nuevo)) fail(`estado inválido "${arg2}". Opciones: ${ESTADOS.join(', ')}`);
      c.estado = nuevo;
      saveCotizacion(path, c);
      console.log(`${c.numero}: ${ESTADO_LABELS[nuevo]}`);
      break;
    }
    case 'lista': {
      const dir = resolve(arg ?? '.');
      const files = findCotizaciones(dir);
      if (!files.length) { console.log(`No hay COTIZACION_*.json en ${dir}`); break; }
      const rows = files.map(f => {
        try {
          const c = JSON.parse(readFileSync(f, 'utf8').replace(/^﻿/, '')) as Cotizacion;
          return { n: c.numero, fecha: c.fecha, estado: ESTADO_LABELS[estadoDe(c)], total: formatCOP(totalReal(c)), cliente: c.cliente?.nombre || '', alcance: c.alcance, f };
        } catch { return null; }
      }).filter(Boolean) as any[];
      rows.sort((a, b) => a.n.localeCompare(b.n));
      for (const r of rows) {
        console.log(`${r.n}  ${r.fecha.padEnd(10)}  ${r.estado.padEnd(10)}  ${r.total.padStart(12)}  ${(r.cliente || r.alcance).slice(0, 50)}`);
        console.log(`       ${r.f}`);
      }
      break;
    }
    case 'config': {
      if (!existsSync(CONFIG_PATH)) {
        console.log(`No existe ${CONFIG_PATH}. Ejemplo:\n${JSON.stringify({
          emisor: { nombreLegal: 'NOMBRE COMPLETO', direccion: 'Calle ...', banco: 'Cuenta de Ahorros BANCO No. ...' },
          clientes: { 'mi-cliente': { nombre: 'EMPRESA S.A.S.', nit: '900.000.000' } },
        }, null, 2)}`);
      } else {
        console.log(`${CONFIG_PATH}\n${readFileSync(CONFIG_PATH, 'utf8')}`);
      }
      break;
    }
    default:
      fail(`comando desconocido "${cmd}". Usa "cotizador ayuda".`);
  }
}

main().catch((e) => { console.error(e?.stack ?? e); process.exit(1); });
