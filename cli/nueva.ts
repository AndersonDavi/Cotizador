// Crear cotizaciones desde cero (comando "nueva") y utilidades para agentes.
// La especificación (Spec) es un JSON parcial, pensado para que cualquier persona
// o IA lo escriba sin conocer todo el modelo: lo que falte sale de la cotización base.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ICON_CATEGORIES, getAllIconKeys, getIconLabel, getIconSearchText } from '../src/lib/icons';
import { DISENOS, PALETAS, type DisenoId } from '../src/lib/theme';
import { ESTADOS, PERIODOS, makeId, nuevaCotizacion, today, grupoDe, errorHitos, type Cotizacion, type Estado, type Item, type Periodo } from '../src/lib/state';
import { parseFecha } from '../src/lib/doc';

export type SpecItem = {
  titulo: string;
  descripcion?: string;
  precio?: number | string;   // precio unitario (alias: valor)
  valor?: number | string;
  cantidad?: number | string;
  unidad?: string;
  icono?: string;             // clave de ícono (ver "cotizador iconos")
  iva?: number | string;      // tarifa propia: 19, 5, 0 o "exento"; sin valor usa la general
  grupo?: string;             // "Fase 1": los ítems seguidos con el mismo grupo salen bajo un encabezado con subtotal
  clave?: string;             // para nombrar el ítem en "opciones[].incluye" (si no, se usa la fase)
};

/** Un escenario para comparar: qué fases (por nombre) o ítems (por clave) incluye. */
export type SpecOpcion = { nombre: string; descripcion?: string; recomendada?: boolean; incluye: string[] | 'todo' };

export type SpecTercero = {
  concepto: string;
  proveedor?: string;
  valor?: number | string;    // 24, "150.000" o un rango "24-48"
  valorHasta?: number | string;
  moneda?: 'COP' | 'USD';
  periodo?: string;           // mensual, anual, transaccion, unico
  nota?: string;
};

export type SpecHito = { clave?: string; nombre: string; pct?: number | string; valor?: number | string; condicion?: string; fase?: string };

/** Otra forma de escribir los grupos: cada uno con sus ítems. */
export type SpecGrupo = { nombre: string; items: SpecItem[] };

export type Spec = {
  numero?: string;
  fecha?: string;             // dd-mm-aaaa (por defecto hoy)
  titulo?: string;            // "Propuesta económica"
  alcance?: string;
  estado?: Estado;
  cliente?: string | { nombre: string; nit?: string; cel?: string };
  nit?: string;
  cel?: string;
  items: SpecItem[];
  grupos?: SpecGrupo[];       // se suman a "items", en orden, con el grupo puesto
  diseno?: DisenoId;
  colores?: { primary: string; secondary: string } | [string, string] | string; // "#111111,#F2D22B"
  paleta?: string;            // nombre de una paleta rápida
  iva?: 'ninguno' | 'agregar' | 'incluido';
  ivaTasa?: number | string;
  descuento?: number | string; // "10%" o valor en pesos
  anticipo?: number | string;  // %
  vigencia?: number | string;  // días
  tiempoEntrega?: string;
  terminos?: string[];
  mostrarBanco?: boolean;     // false: la cotización sale sin la cuenta bancaria
  opciones?: SpecOpcion[];    // 2 o 3; el total del documento es el de la recomendada
  costosTerceros?: SpecTercero[];
  trm?: number | string;      // pesos por dólar
  notaTerceros?: string;
  hitos?: SpecHito[];         // plan de pagos; los porcentajes suman 100 (o los valores, el total)
};

export class SpecError extends Error {}

/** "$1.160.000", "1160000", "350.000,5" → número. */
export function parseMoney(v: number | string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number') return v;
  const s = v.trim().replace(/[$\s]/g, '').replace(/COP$/i, '');
  const n = parseFloat(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/\.(?=\d{3}(\D|$))/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

const num = (v: number | string | undefined) => {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

/** Sugerencias de íconos para una palabra (para mensajes de error y "iconos --buscar"). */
export function buscarIconos(q: string): string[] {
  const words = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
  return getAllIconKeys().filter((k) => words.every((w) => getIconSearchText(k).includes(w)));
}

function validarIcono(key: string | undefined, titulo: string): string {
  const all = getAllIconKeys() as string[];
  if (!key) {
    // Sin ícono: intenta adivinar por el título; si no, "code"
    const guess = buscarIconos(titulo).at(0) ?? titulo.split(/\s+/).map((w) => buscarIconos(w).at(0)).find(Boolean);
    return guess ?? 'code';
  }
  if (all.includes(key)) return key;
  const sug = buscarIconos(key);
  throw new SpecError(`ícono "${key}" no existe.${sug.length ? ` ¿Quisiste decir: ${sug.slice(0, 5).join(', ')}?` : ''} Usa "cotizador iconos" para ver la lista.`);
}

/** "titulo=Cámara IP; precio=350000; cantidad=8; icono=cctv" → SpecItem. */
export function parseItemFlag(s: string): SpecItem {
  const it: Record<string, string> = {};
  for (const part of s.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) { if (part.trim()) throw new SpecError(`--item: "${part.trim()}" no tiene forma clave=valor (ej. "titulo=Diseño de logo; precio=850000")`); continue; }
    it[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  if (!it.titulo) throw new SpecError('--item: falta "titulo="');
  return { titulo: it.titulo, descripcion: it.descripcion ?? it.desc, precio: it.precio ?? it.valor, cantidad: it.cantidad ?? it.cant, unidad: it.unidad, icono: it.icono, iva: it.iva, grupo: it.grupo };
}

/** Siguiente número (5 dígitos) según las COTIZACION_*.json de la carpeta y sus subcarpetas. */
export function siguienteNumero(dir: string, leer: (f: string) => Cotizacion | null): string {
  let max = 0;
  const walk = (d: string, depth: number) => {
    let entries: string[] = [];
    try { entries = readdirSync(d); } catch { return; }
    for (const e of entries) {
      const p = join(d, e);
      let st; try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) { if (depth > 0) walk(p, depth - 1); continue; }
      if (!/^COTIZACION_.*\.json$/i.test(e)) continue;
      const n = parseInt(leer(p)?.numero ?? e.replace(/\D/g, ''), 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  };
  walk(dir, 3);
  return String(max + 1).padStart(5, '0');
}

/** Construye la cotización: base (marca, términos, diseño) + lo que diga la especificación. */
export function construir(spec: Spec, base: Cotizacion | null, numero: string): Cotizacion {
  if (spec?.grupos != null) {
    if (!Array.isArray(spec.grupos)) throw new SpecError('grupos: usa una lista [{ "nombre": "Fase 1", "items": [...] }]');
    const deGrupos = spec.grupos.flatMap((g, i) => {
      if (!g?.nombre?.trim()) throw new SpecError(`grupo ${i + 1}: falta "nombre"`);
      if (!Array.isArray(g.items) || !g.items.length) throw new SpecError(`grupo "${g.nombre}": necesita al menos un ítem en "items"`);
      return g.items.map((it) => ({ ...it, grupo: g.nombre }));
    });
    spec = { ...spec, items: [...(spec.items ?? []), ...deGrupos] };
  }
  if (!spec || !Array.isArray(spec.items) || !spec.items.length) throw new SpecError('la cotización necesita al menos un ítem');
  const c: Cotizacion = base
    ? { ...nuevaCotizacion(numero), branding: base.branding, terminos: base.terminos, tiempoEntrega: base.tiempoEntrega, diseno: base.diseno, colores: base.colores, plantilla: base.plantilla, coloresOverride: base.coloresOverride ?? {}, titulo: base.titulo, impuestos: base.impuestos ? { ivaModo: base.impuestos.ivaModo, ivaTasa: base.impuestos.ivaTasa } : undefined, vigenciaDias: base.vigenciaDias }
    : nuevaCotizacion(numero);
  c.numero = spec.numero ?? numero;
  if (spec.fecha) {
    const f = parseFecha(spec.fecha);
    if (!f) throw new SpecError(`fecha "${spec.fecha}" inválida (usa dd-mm-aaaa)`);
    c.fecha = `${String(f.d).padStart(2, '0')}-${String(f.m).padStart(2, '0')}-${f.y}`;
  } else c.fecha = today();
  if (spec.titulo) c.titulo = spec.titulo;
  c.alcance = spec.alcance ?? '';
  if (spec.estado) {
    if (!(ESTADOS as readonly string[]).includes(spec.estado)) throw new SpecError(`estado "${spec.estado}" inválido. Opciones: ${ESTADOS.join(', ')}`);
    c.estado = spec.estado;
  } else c.estado = 'borrador';
  const cli = typeof spec.cliente === 'string' ? { nombre: spec.cliente } : spec.cliente;
  c.cliente = { nombre: cli?.nombre ?? '', nit: spec.nit ?? cli?.nit ?? '', cel: spec.cel ?? cli?.cel ?? '' };
  c.cobro = {};

  c.items = spec.items.map((s, i): Item => {
    if (!s.titulo?.trim()) throw new SpecError(`ítem ${i + 1}: falta el título`);
    const precio = parseMoney(s.precio ?? s.valor);
    if (precio == null || precio < 0) throw new SpecError(`ítem ${i + 1} ("${s.titulo}"): falta el precio o no es un número`);
    if (s.unidad && /^[-+\d.,\s]+$/.test(String(s.unidad).trim())) throw new SpecError(`ítem ${i + 1} ("${s.titulo}"): la unidad es un texto (und, m, hora); la cantidad va en "cantidad"`);
    const cant = num(s.cantidad);
    if (cant != null && cant <= 0) throw new SpecError(`ítem ${i + 1} ("${s.titulo}"): la cantidad debe ser mayor que 0`);
    const iva = s.iva == null || s.iva === '' ? undefined : String(s.iva).toLowerCase() === 'exento' ? 0 : num(s.iva);
    return {
      id: makeId(),
      iconKey: validarIcono(s.icono, s.titulo),
      titulo: s.titulo.trim(),
      descripcion: (s.descripcion ?? '').trim(),
      valor: precio,
      ...(cant && cant !== 1 ? { cantidad: cant } : {}),
      ...(s.unidad ? { unidad: s.unidad } : {}),
      ...(iva != null ? { ivaTasa: iva } : {}),
      ...(s.grupo?.trim() ? { grupo: s.grupo.trim() } : {}),
    };
  });
  c.costoTotalAuto = true;

  if (spec.diseno) {
    if (!DISENOS.some((d) => d.id === spec.diseno)) throw new SpecError(`diseño "${spec.diseno}" no existe. Opciones: ${DISENOS.map((d) => d.id).join(', ')}`);
    c.diseno = spec.diseno;
  }
  if (spec.paleta) {
    const p = PALETAS.find((x) => x.nombre.toLowerCase() === spec.paleta!.toLowerCase());
    if (!p) throw new SpecError(`paleta "${spec.paleta}" no existe. Opciones: ${PALETAS.map((x) => x.nombre).join(', ')}`);
    c.colores = { primary: p.primary, secondary: p.secondary };
  }
  if (spec.colores) {
    const arr = typeof spec.colores === 'string' ? spec.colores.split(',') : Array.isArray(spec.colores) ? spec.colores : [spec.colores.primary, spec.colores.secondary];
    const [p, s] = arr.map((x) => x.trim());
    if (!/^#[0-9a-f]{6}$/i.test(p ?? '') || !/^#[0-9a-f]{6}$/i.test(s ?? '')) throw new SpecError('colores: usa dos códigos hexadecimales, ej. "#1F3B57,#4FD1C5"');
    c.colores = { primary: p.toUpperCase(), secondary: s.toUpperCase() };
    c.coloresOverride = {};
  }

  const imp = { ...c.impuestos };
  if (spec.iva) {
    if (!['ninguno', 'agregar', 'incluido'].includes(spec.iva)) throw new SpecError('iva debe ser ninguno, agregar o incluido');
    imp.ivaModo = spec.iva;
  }
  if (spec.ivaTasa != null) imp.ivaTasa = num(spec.ivaTasa);
  if (spec.descuento != null && spec.descuento !== '') {
    const pct = String(spec.descuento).trim().endsWith('%');
    imp.descuentoTipo = pct ? 'porcentaje' : 'valor';
    imp.descuento = pct ? num(spec.descuento) : parseMoney(spec.descuento);
    if (imp.descuento == null || imp.descuento < 0 || (pct && imp.descuento > 100)) throw new SpecError('descuento: usa un valor positivo ("10%" o pesos)');
  }
  if (spec.anticipo != null) {
    const a = num(spec.anticipo);
    if (a == null || a < 0 || a > 100) throw new SpecError('anticipo: usa un porcentaje entre 0 y 100');
    imp.anticipo = a;
  }
  c.impuestos = Object.keys(imp).length ? imp : undefined;
  if (spec.vigencia != null) {
    const v = num(spec.vigencia);
    if (v == null || v <= 0) throw new SpecError('vigencia: usa un número de días mayor que 0');
    c.vigenciaDias = Math.round(v);
  }
  if (spec.tiempoEntrega != null) c.tiempoEntrega = spec.tiempoEntrega;
  if (spec.terminos) c.terminos = spec.terminos;
  if (spec.mostrarBanco === false) c.mostrarBanco = false;
  agregarProyecto(c, spec);
  return c;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
/** Para comparar nombres de fase y claves sin importar mayúsculas, tildes, espacios ni signos ("fase1" = "Fase 1"). */
const igual = (a: string, b: string) => norm(a).replace(/[^a-z0-9]/g, '') === norm(b).replace(/[^a-z0-9]/g, '');
const slug = (s: string, i: number) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || `h${i + 1}`;

const PERIODO_ALIAS: Record<string, Periodo> = {
  mensual: 'mensual', mes: 'mensual', 'por mes': 'mensual', anual: 'anual', ano: 'anual', 'por ano': 'anual',
  transaccion: 'transaccion', 'por transaccion': 'transaccion', unico: 'unico', 'pago unico': 'unico', 'una vez': 'unico',
};

/** Opciones, costos de terceros y plan de pagos de la especificación (con mensajes claros si algo no cuadra). */
function agregarProyecto(c: Cotizacion, spec: Spec) {
  // Claves de ítem: las que vienen en la especificación; el id interno pasa a ser esa clave
  spec.items.forEach((s, i) => {
    if (!s.clave?.trim()) return;
    const k = s.clave.trim();
    if (spec.items.some((o, j) => j !== i && o.clave?.trim() === k)) throw new SpecError(`la clave de ítem "${k}" está repetida`);
    c.items[i].id = k;
  });
  const fases = [...new Set(c.items.map(grupoDe).filter(Boolean))];

  if (spec.opciones != null) {
    if (!Array.isArray(spec.opciones) || spec.opciones.length < 2 || spec.opciones.length > 3) throw new SpecError('opciones: usa una lista de 2 o 3 opciones');
    if (spec.opciones.filter((o) => o.recomendada).length > 1) throw new SpecError('opciones: solo una puede ser la recomendada');
    c.opciones = spec.opciones.map((o, i) => {
      if (!o?.nombre?.trim()) throw new SpecError(`opción ${i + 1}: falta "nombre"`);
      const ids = new Set<string>();
      const lista = o.incluye === 'todo' ? ['todo'] : o.incluye;
      if (!Array.isArray(lista) || !lista.length) throw new SpecError(`opción "${o.nombre}": "incluye" necesita fases o claves de ítem (o "todo")`);
      for (const ref of lista) {
        const r = norm(String(ref));
        if (r === 'todo') { c.items.forEach((it) => ids.add(it.id)); continue; }
        const porFase = c.items.filter((it) => grupoDe(it) && igual(grupoDe(it), r));
        const porClave = c.items.find((it) => igual(it.id, r));
        if (porFase.length) porFase.forEach((it) => ids.add(it.id));
        else if (porClave) ids.add(porClave.id);
        else {
          const sug = fases.filter((f) => norm(f).includes(r) || r.includes(norm(f)));
          throw new SpecError(`opción "${o.nombre}": "${ref}" no es una fase ni la clave de un ítem.${sug.length ? ` ¿Quisiste decir: ${sug.join(', ')}?` : fases.length ? ` Fases: ${fases.join(', ')}.` : ''}`);
        }
      }
      return {
        id: slug(o.nombre, i), nombre: o.nombre.trim(), items: c.items.map((it) => it.id).filter((x) => ids.has(x)),
        ...(o.descripcion?.trim() ? { descripcion: o.descripcion.trim() } : {}),
        ...(o.recomendada ? { recomendada: true } : {}),
      };
    });
  }

  if (spec.costosTerceros != null) {
    if (!Array.isArray(spec.costosTerceros)) throw new SpecError('costosTerceros: usa una lista [{ "concepto": "...", "valor": 24, "moneda": "USD", "periodo": "mensual" }]');
    c.costosTerceros = spec.costosTerceros.map((x, i) => {
      if (!x?.concepto?.trim()) throw new SpecError(`costo de terceros ${i + 1}: falta "concepto"`);
      const moneda = (x.moneda ?? 'COP').toUpperCase();
      if (moneda !== 'COP' && moneda !== 'USD') throw new SpecError(`costo "${x.concepto}": la moneda debe ser COP o USD`);
      let valor: number | undefined, hasta: number | undefined;
      const rango = typeof x.valor === 'string' ? x.valor.match(/^\s*([^–-]+?)\s*[–-]\s*(.+)$/) : null;
      const leer = (v: number | string | undefined) => (moneda === 'USD' ? num(v) : parseMoney(v));
      if (rango) { valor = leer(rango[1]); hasta = leer(rango[2]); } else { valor = leer(x.valor); hasta = leer(x.valorHasta); }
      if (x.valor != null && x.valor !== '' && valor == null) throw new SpecError(`costo "${x.concepto}": el valor "${x.valor}" no es un número`);
      let periodo: Periodo | undefined;
      if (x.periodo) {
        periodo = PERIODO_ALIAS[norm(x.periodo)];
        if (!periodo) throw new SpecError(`costo "${x.concepto}": periodo "${x.periodo}" no existe. Opciones: ${Object.keys(PERIODOS).join(', ')}`);
      }
      return {
        concepto: x.concepto.trim(), moneda: moneda as 'COP' | 'USD',
        ...(x.proveedor?.trim() ? { proveedor: x.proveedor.trim() } : {}),
        ...(valor != null ? { valor } : {}), ...(hasta != null ? { valorHasta: hasta } : {}),
        ...(periodo ? { periodo } : {}), ...(x.nota?.trim() ? { nota: x.nota.trim() } : {}),
      };
    });
  }
  if (spec.trm != null && spec.trm !== '') {
    const t = parseMoney(spec.trm);
    if (t == null || t <= 0) throw new SpecError('trm: usa los pesos por dólar, por ejemplo 4000');
    c.trm = t;
  }
  if (spec.notaTerceros?.trim()) c.notaTerceros = spec.notaTerceros.trim();

  if (spec.hitos != null) {
    if (!Array.isArray(spec.hitos) || !spec.hitos.length) throw new SpecError('hitos: usa una lista [{ "nombre": "Inicio", "pct": 30, "condicion": "Al iniciar" }]');
    c.hitos = spec.hitos.map((h, i) => {
      if (h?.fase && !fases.some((f) => igual(f, h.fase!))) throw new SpecError(`hito "${h.nombre ?? i + 1}": la fase "${h.fase}" no existe.${fases.length ? ` Fases: ${fases.join(', ')}.` : ''}`);
      const pct = num(h.pct);
      const valor = parseMoney(h.valor);
      return {
        id: h.clave?.trim() || slug(h.nombre ?? '', i), nombre: (h.nombre ?? '').trim(),
        ...(pct != null ? { pct } : {}), ...(valor != null ? { valor } : {}),
        ...(h.condicion?.trim() ? { condicion: h.condicion.trim() } : {}),
        ...(h.fase ? { grupo: fases.find((f) => igual(f, h.fase!)) } : {}),
      };
    });
    const ids = c.hitos.map((h) => h.id);
    const rep = ids.find((x, i) => ids.indexOf(x) !== i);
    if (rep) throw new SpecError(`hitos: la clave "${rep}" está repetida (usa "clave" para distinguirlos)`);
    const err = errorHitos(c);
    if (err) throw new SpecError(`plan de pagos: ${err}`);
  }
}

/** Lista de íconos por categoría (para humanos y para agentes con --json). */
export function listaIconos() {
  return ICON_CATEGORIES.map((cat) => ({
    categoria: cat.nombre,
    iconos: cat.keys.map((k) => ({ clave: k, nombre: getIconLabel(k) })),
  }));
}

export function listaDisenos() {
  return {
    disenos: DISENOS.map((d) => ({ id: d.id, nombre: d.nombre, descripcion: d.descripcion, colores: d.colores })),
    paletas: PALETAS.map((p) => ({ nombre: p.nombre, primary: p.primary, secondary: p.secondary })),
  };
}

/** Ejemplo completo para proyectos por fases: opciones, costos de terceros y plan de pagos (datos ficticios). */
export const ESQUEMA_COMPLETO: Spec = {
  cliente: { nombre: 'Distribuidora Ejemplo S.A.S.', nit: '900.000.000-1' },
  alcance: 'Portal web de pedidos B2B integrado con el software contable',
  items: [
    { titulo: 'Descubrimiento y prueba técnica', precio: 4500000, icono: 'search', grupo: 'Fase 0' },
    { clave: 'acceso', titulo: 'Acceso de clientes y empresas', precio: 3500000, icono: 'lock', grupo: 'Fase 1' },
    { clave: 'catalogo', titulo: 'Catálogo de productos', precio: 3500000, icono: 'cart', grupo: 'Fase 1' },
    { clave: 'precios', titulo: 'Precios por cliente', precio: 5000000, icono: 'dollar', grupo: 'Fase 1' },
    { clave: 'carrito', titulo: 'Carrito y pedido', precio: 4000000, icono: 'package', grupo: 'Fase 1' },
    { titulo: 'Pagos en línea', precio: 3000000, icono: 'bolt', grupo: 'Fase 1' },
    { titulo: 'Integración contable', precio: 8000000, icono: 'database', grupo: 'Fase 1' },
    { titulo: 'Panel administrativo', precio: 5000000, icono: 'monitor', grupo: 'Fase 1' },
    { clave: 'correos', titulo: 'Estados del pedido por correo', precio: 2000000, icono: 'mail', grupo: 'Fase 1' },
    { titulo: 'Crédito y cupos', precio: 3500000, icono: 'shield', grupo: 'Fase 2' },
    { titulo: 'Aprobación en dos pasos', precio: 3000000, icono: 'users', grupo: 'Fase 2' },
    { titulo: 'Avisos por WhatsApp', precio: 2500000, icono: 'chat', grupo: 'Fase 2' },
    { titulo: 'Seguimiento de despachos', precio: 2000000, icono: 'truck', grupo: 'Fase 2' },
    { titulo: 'Reportes de ventas', precio: 2500000, icono: 'chart', grupo: 'Fase 2' },
    { titulo: 'Migración y salida en vivo', precio: 3000000, icono: 'graduation', grupo: 'Fase 2' },
    { titulo: 'Soporte y mantenimiento', precio: 2000000, cantidad: 12, unidad: 'meses', icono: 'wrench', grupo: 'Soporte' },
  ],
  opciones: [
    { nombre: 'A. Básica', descripcion: 'Lo mínimo para recibir pedidos', incluye: ['acceso', 'catalogo', 'precios', 'carrito', 'correos'] },
    { nombre: 'B. Recomendada', descripcion: 'Las tres fases completas', recomendada: true, incluye: ['Fase 0', 'Fase 1', 'Fase 2'] },
    { nombre: 'C. B + soporte', descripcion: 'Con 12 meses de soporte', incluye: 'todo' },
  ],
  costosTerceros: [
    { concepto: 'Servidor VPS', proveedor: 'Hetzner / DigitalOcean', valor: '24-48', moneda: 'USD', periodo: 'mensual' },
    { concepto: 'Base de datos Postgres administrada', proveedor: 'Neon', valor: 19, moneda: 'USD', periodo: 'mensual' },
    { concepto: 'Número de WhatsApp Business', proveedor: 'Meta', valor: 3, moneda: 'USD', periodo: 'mensual' },
    { concepto: 'Pasarela de pagos', proveedor: 'Wompi', periodo: 'transaccion', nota: '2,65 % + $700 + IVA por transacción' },
  ],
  trm: 4000,
  hitos: [
    { clave: 'inicio', nombre: 'Inicio', pct: 30, condicion: 'Al firmar e iniciar la Fase 0', fase: 'Fase 0' },
    { clave: 'mvp', nombre: 'Entrega del MVP', pct: 40, condicion: 'Al entregar la Fase 1 en pruebas', fase: 'Fase 1' },
    { clave: 'vivo', nombre: 'Salida en vivo', pct: 30, condicion: 'Al salir en vivo con la Fase 2', fase: 'Fase 2' },
  ],
  diseno: 'corporativa',
  vigencia: 15,
  tiempoEntrega: 'Aproximadamente 4,5 meses desde el primer pago.',
};

export const ESQUEMA_EJEMPLO: Spec = {
  cliente: { nombre: 'Panadería La Esquina S.A.S.', nit: '901.234.567-8', cel: '300 000 0000' },
  alcance: 'Instalación de cámaras de seguridad en el local',
  items: [
    { titulo: 'Cámara IP 4 MP exterior', descripcion: 'Incluye soporte, conector y configuración.', cantidad: 8, unidad: 'und', precio: 350000, icono: 'cctv' },
    { titulo: 'Cableado estructurado', cantidad: 120, unidad: 'm', precio: 4500, icono: 'wifi' },
    { titulo: 'Grabador NVR 8 canales', precio: 890000, icono: 'server' },
    { titulo: 'Visita técnica y diagnóstico', precio: 80000, icono: 'clipboard', iva: 'exento' },
  ],
  diseno: 'bloque',
  paleta: 'Marino',
  iva: 'agregar',
  ivaTasa: 19,
  descuento: '5%',
  anticipo: 50,
  vigencia: 15,
  tiempoEntrega: '5 días hábiles después del anticipo.',
  terminos: ['50% de anticipo y 50% contra entrega.', 'Garantía de 12 meses en equipos.'],
};
