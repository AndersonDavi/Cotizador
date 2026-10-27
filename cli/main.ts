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
//   cotizador nueva  --cliente "Empresa" --item "titulo=Logo; precio=850000" [--pdf]   (o --spec spec.json)
//   cotizador resumen COTIZACION_00007.json [--json]
//   cotizador iconos [--buscar camaras] [--json]
//   cotizador disenos [--json]
//   cotizador esquema
// Guía completa para personas y agentes: docs/guia-cli.md

import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
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
  totales, filasDesglose, valorItem, qtyLabel, validaHasta, valorCobro, gruposItems, errorHitos,
} from '../src/lib/state';
import { construir, parseItemFlag, siguienteNumero, buscarIconos, listaIconos, listaDisenos, ESQUEMA_EJEMPLO, SpecError, type Spec } from './nueva';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(homedir(), '.cotizador.json');

type Config = {
  emisor?: { nombreLegal?: string; direccion?: string; banco?: string };
  clientes?: Record<string, Cliente>;
  base?: string;   // cotización de la que "nueva" copia marca, términos y diseño
};

const AYUDA = `Cotizador CLI

Uso: cotizador <comando> <cotizacion.json> [opciones]   (cotizador --version: versión instalada)

Comandos:
  nueva   Crea una cotización desde cero (COTIZACION_<n>.json) y opcionalmente su PDF/PNG
  resumen Muestra ítems, desglose y total de una cotización (--json para agentes)
  iconos  Lista los íconos por categoría (--buscar <texto>, --json)
  disenos Lista las plantillas y paletas (--json)
  esquema Imprime un ejemplo de especificación JSON para "nueva --spec"
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
  --parte <total|anticipo|saldo|hito>  Con "cuenta": qué parte se cobra (anticipo o saldo, o el id o nombre de un hito del plan de pagos)
  --valor <pesos>        Con "cuenta": valor a cobrar escrito a mano (obligatorio en una cuenta suelta)
  --marcar               Con "cuenta": guarda los datos de cobro en el JSON y lo marca como cobrada
  --html                 Con "cuenta": guarda también el HTML

Opciones de "nueva" (o todo junto en --spec archivo.json, "-" = entrada estándar):
  --item "titulo=…; precio=…; cantidad=…; unidad=…; icono=…; iva=…; descripcion=…"   (repetible)
  --cliente, --nit, --cel, --alcance, --titulo, --fecha, --numero, --estado
  --diseno <id>  --paleta <nombre> | --colores "#hex,#hex"
  --iva ninguno|agregar|incluido  --tasa 19  --descuento 10% | 50000  --anticipo 50  --vigencia 15
  --tiempo "…"  --termino "…" (repetible)
  --base COTIZACION.json   Copia marca, términos y diseño (por defecto: "base" de la config)
  -o carpeta|archivo.json  Dónde guardar (por defecto la carpeta actual)
  --pdf --png              Genera también el PDF / PNG
  --json                   Con resumen, iconos o disenos: salida en JSON

Guía completa: docs/guia-cli.md
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

function imprimirResumen(c: Cotizacion) {
  const t = totales(c);
  console.log(`  ${c.titulo || 'Propuesta económica'} N.º ${c.numero} · ${c.fecha}${validaHasta(c) ? ` · válida hasta ${validaHasta(c)}` : ''} · ${ESTADO_LABELS[estadoDe(c)]}`);
  if (c.cliente?.nombre) console.log(`  Cliente: ${c.cliente.nombre}${c.cliente.nit ? ` (NIT ${c.cliente.nit})` : ''}`);
  const grupos = gruposItems(c.items);
  c.items.forEach((it, i) => {
    const g = grupos[i];
    if (g) console.log(`  ${g.nombre} (${formatCOP(g.subtotal)})`);
    console.log(`  ${grupos.some(Boolean) ? '  ' : ''}- ${it.titulo}${qtyLabel(it) ? ` [${qtyLabel(it)}]` : ''}: ${formatCOP(valorItem(it))}`);
  });
  for (const r of filasDesglose(t)) console.log(r.tipo === 'nota' ? `  ${r.label}` : `  ${r.label}: ${r.value}`);
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
      valor: { type: 'string' },
      marcar: { type: 'boolean' },
      html: { type: 'boolean' },
      item: { type: 'string', multiple: true },
      termino: { type: 'string', multiple: true },
      spec: { type: 'string' },
      base: { type: 'string' },
      alcance: { type: 'string' },
      titulo: { type: 'string' },
      numero: { type: 'string' },
      estado: { type: 'string' },
      cel: { type: 'string' },
      diseno: { type: 'string' },
      paleta: { type: 'string' },
      colores: { type: 'string' },
      iva: { type: 'string' },
      tasa: { type: 'string' },
      descuento: { type: 'string' },
      anticipo: { type: 'string' },
      vigencia: { type: 'string' },
      tiempo: { type: 'string' },
      pdf: { type: 'boolean' },
      png: { type: 'boolean' },
      json: { type: 'boolean' },
      buscar: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });
  const [cmd, arg, arg2] = positionals;
  if (o.version || cmd === 'version') {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    console.log(`Cotizador ${pkg.version}`);
    return;
  }
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
        // Un hito del plan de pagos se elige por su id o por su nombre
        const k = o.parte.trim().toLowerCase();
        const hito = c.hitos?.find((h) => h.id.toLowerCase() === k || h.nombre.trim().toLowerCase() === k);
        if (hito) c.cobro.parte = `hito:${hito.id}`;
        else if (['total', 'anticipo', 'saldo'].includes(k)) c.cobro.parte = k as 'total' | 'anticipo' | 'saldo';
        else fail(`--parte debe ser total, anticipo, saldo${c.hitos?.length ? ` o un hito (${c.hitos.map((h) => h.id).join(', ')})` : ''}`);
        const err = errorHitos(c);
        if (hito && err) fail(`el plan de pagos tiene un problema: ${err}`);
      }
      if (o.cliente) {
        const k = o.cliente.toLowerCase();
        const fromCfg = cfg.clientes?.[k] ?? Object.values(cfg.clientes ?? {}).find(x => x.nombre.toLowerCase() === k);
        c.cliente = fromCfg ? { ...fromCfg } : { nombre: o.cliente, nit: o.nit ?? c.cliente?.nit ?? '' };
      }
      if (o.nit) c.cliente = { nombre: c.cliente?.nombre ?? '', nit: o.nit };
      if (o.valor) {
        const v = Number(o.valor.replace(/[$.\s]/g, '').replace(',', '.'));
        if (!Number.isFinite(v) || v <= 0) fail('--valor debe ser un número mayor que 0 (por ejemplo 1500000)');
        c.cobro.valor = v;
      }

      const faltan: string[] = [];
      if (!c.cliente?.nombre) faltan.push('cliente (--cliente)');
      if (!c.cliente?.nit) faltan.push('NIT (--nit)');
      // En una cuenta suelta (tipo "cuenta") el período es opcional y el valor es obligatorio
      if (c.tipo === 'cuenta' ? Boolean(c.cobro.desde) !== Boolean(c.cobro.hasta) : !c.cobro.desde || !c.cobro.hasta) faltan.push('período (--desde y --hasta)');
      if (c.tipo === 'cuenta' && !(valorCobro(c) > 0)) faltan.push('valor (--valor, cobro.valor o valores en cobro.detalle)');
      if (!c.branding.contacto?.ciudad?.trim()) faltan.push('ciudad del emisor (Mi marca → Contacto en la cotización)');
      if (!c.branding.banco) faltan.push(`cuenta bancaria (emisor.banco en ${CONFIG_PATH})`);
      if (!c.branding.direccion) faltan.push(`dirección (emisor.direccion en ${CONFIG_PATH})`);
      if (faltan.length) fail(`faltan datos para la cuenta de cobro:\n  - ${faltan.join('\n  - ')}`);

      const cc = cuentaDesdeCotizacion(c, today());
      const html = renderCuentaCobroHtml(cc);
      const out = outPath(o.out, path, `${cc.archivo ?? 'CUENTA-COBRO-COTIZACION-' + c.numero}.pdf`);
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
    case 'nueva': {
      let spec: Spec;
      if (o.spec) {
        const raw = o.spec === '-' ? readFileSync(0, 'utf8') : readFileSync(resolve(o.spec), 'utf8');
        try { spec = JSON.parse(raw.replace(/^﻿/, '')); } catch { fail('--spec no es un JSON válido'); }
        spec.items ??= [];
      } else spec = { items: [] };
      try { for (const it of o.item ?? []) spec.items.push(parseItemFlag(it)); } catch (e: any) { fail(e.message); }
      if (o.cliente) {
        const k = o.cliente.toLowerCase();
        const fromCfg = cfg.clientes?.[k] ?? Object.values(cfg.clientes ?? {}).find((x) => x.nombre.toLowerCase() === k);
        spec.cliente = fromCfg ? { ...fromCfg } : { nombre: o.cliente };
      }
      const pick: Record<string, string | undefined> = {
        nit: o.nit, cel: o.cel, alcance: o.alcance, titulo: o.titulo, numero: o.numero, estado: o.estado, fecha: o.fecha,
        diseno: o.diseno, paleta: o.paleta, colores: o.colores, iva: o.iva, ivaTasa: o.tasa, descuento: o.descuento,
        anticipo: o.anticipo, vigencia: o.vigencia, tiempoEntrega: o.tiempo,
      };
      for (const [k, v] of Object.entries(pick)) if (v != null) (spec as any)[k] = v;
      if (o.termino?.length) spec.terminos = o.termino;

      // Destino: carpeta (se numera sola) o archivo .json
      const target = resolve(o.out ?? '.');
      const isFile = /\.json$/i.test(target);
      const dir = isFile ? dirname(target) : target;
      const leer = (f: string) => { try { return JSON.parse(readFileSync(f, 'utf8').replace(/^﻿/, '')) as Cotizacion; } catch { return null; } };
      const basePath = o.base ?? cfg.base;
      const base = basePath ? leer(resolve(basePath)) : null;
      if (basePath && !base) fail(`no pude leer la base ${basePath}`);
      let c: Cotizacion;
      try { c = construir(spec, base, siguienteNumero(dir, leer)); } catch (e: any) { if (e instanceof SpecError) fail(e.message); throw e; }
      applyConfig(c, cfg);
      const file = isFile ? target : join(dir, `COTIZACION_${c.numero}.json`);
      if (existsSync(file)) fail(`ya existe ${file}. Usa --numero u otro -o.`);
      mkdirSync(dir, { recursive: true });
      saveCotizacion(file, c);
      console.log(`Cotización ${c.numero}: ${file}`);
      if (!base) console.log('  (sin base: la marca quedó vacía. Usa --base o "base" en la config)');
      imprimirResumen(c);
      if (o.pdf) { const out = file.replace(/\.json$/i, '.pdf'); await htmlToPdf(renderCotizacionHtml(c, fontsAsDataUrls()), out, 1080); console.log(`PDF: ${out}`); }
      if (o.png) { const out = file.replace(/\.json$/i, '.png'); await htmlToPng(renderCotizacionHtml(c, fontsAsDataUrls()), out, 1080, Number(o.escala) || 2); console.log(`PNG: ${out}`); }
      break;
    }
    case 'resumen': {
      const { c } = loadCotizacion(arg);
      if (o.json) {
        console.log(JSON.stringify({
          numero: c.numero, fecha: c.fecha, validaHasta: validaHasta(c) || null, estado: estadoDe(c), cliente: c.cliente ?? null, alcance: c.alcance,
          items: c.items.map((it) => ({ titulo: it.titulo, icono: it.iconKey, cantidad: it.cantidad ?? 1, unidad: it.unidad ?? null, precioUnitario: it.valor, valor: valorItem(it), ivaTasa: it.ivaTasa ?? null, grupo: it.grupo?.trim() || null })),
          grupos: gruposItems(c.items).filter(Boolean),
          totales: totales(c),
        }, null, 2));
      } else imprimirResumen(c);
      break;
    }
    case 'iconos': {
      const todos = listaIconos().flatMap((cat) => cat.iconos);
      if (o.buscar) {
        const r = buscarIconos(o.buscar);
        if (o.json) console.log(JSON.stringify(r.map((k) => todos.find((x) => x.clave === k))));
        else console.log(r.length ? r.map((k) => `${k.padEnd(12)} ${todos.find((x) => x.clave === k)?.nombre}`).join('\n') : 'Sin resultados');
        break;
      }
      if (o.json) { console.log(JSON.stringify(listaIconos(), null, 2)); break; }
      for (const cat of listaIconos()) {
        console.log(`\n${cat.categoria}`);
        for (const i of cat.iconos) console.log(`  ${i.clave.padEnd(12)} ${i.nombre}`);
      }
      break;
    }
    case 'disenos': {
      const l = listaDisenos();
      if (o.json) { console.log(JSON.stringify(l, null, 2)); break; }
      console.log('Plantillas (--diseno):');
      for (const d of l.disenos) console.log(`  ${d.id.padEnd(12)} ${d.nombre.padEnd(12)} ${d.descripcion}`);
      console.log('\nPaletas (--paleta):');
      for (const p of l.paletas) console.log(`  ${p.nombre.padEnd(10)} ${p.primary} ${p.secondary}`);
      break;
    }
    case 'esquema': {
      console.log(JSON.stringify(ESQUEMA_EJEMPLO, null, 2));
      break;
    }
    default:
      fail(`comando desconocido "${cmd}". Usa "cotizador ayuda".`);
  }
}

main().catch((e) => { console.error(e?.stack ?? e); process.exit(1); });
