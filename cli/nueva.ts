// Crear cotizaciones desde cero (comando "nueva") y utilidades para agentes.
// La especificación (Spec) es un JSON parcial, pensado para que cualquier persona
// o IA lo escriba sin conocer todo el modelo: lo que falte sale de la cotización base.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ICON_CATEGORIES, getAllIconKeys, getIconLabel, getIconSearchText } from '../src/lib/icons';
import { DISENOS, PALETAS, type DisenoId } from '../src/lib/theme';
import { ESTADOS, makeId, nuevaCotizacion, today, type Cotizacion, type Estado, type Item } from '../src/lib/state';
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
};

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
  return { titulo: it.titulo, descripcion: it.descripcion ?? it.desc, precio: it.precio ?? it.valor, cantidad: it.cantidad ?? it.cant, unidad: it.unidad, icono: it.icono, iva: it.iva };
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
  return c;
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
