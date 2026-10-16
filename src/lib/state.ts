import type { IconKey } from './icons';
import type { TemplateId } from './templates';
import type { Colores, DisenoId } from './theme';

export type Item = {
  id: string;
  iconKey: IconKey;
  titulo: string;
  descripcion: string;
  valor: number;          // precio unitario (con cantidad 1 = valor del ítem)
  cantidad?: number;      // por defecto 1
  unidad?: string;        // "und", "m²", "horas", "punto"…
  ivaTasa?: number;       // tarifa propia (0 = exento); sin valor usa la general
};

export type Representante = {
  nombre: string;
  cedula: string;
  firmaDataUrl?: string;
};

export type Contacto = {
  web: string;
  email: string;
  cel: string;
  ciudad: string;
  pais: string;
};

export type Branding = {
  logoDataUrl?: string;
  /** Cómo se pinta el logo: tal cual, sobre un fondo blanco, o todo blanco / todo negro (logos de un color). */
  logoEstilo?: 'original' | 'fondo' | 'blanco' | 'negro';
  representante: Representante;
  banco: string;          // "Cuenta de Ahorros BANCOLOMBIA No. ..." (cuenta de cobro)
  empresa?: string;       // nombre de la marca que muestran las plantillas
  nombreLegal?: string;   // nombre completo para la cuenta de cobro
  direccion?: string;
  contacto: Contacto;
};

/** Clases del <img> del logo según logoEstilo (ver LOGO_CSS). */
export function logoClase(b: Pick<Branding, 'logoEstilo'>): string {
  return b.logoEstilo && b.logoEstilo !== 'original' ? ` logo-${b.logoEstilo}` : '';
}
/** Un solo estilo a la vez: el filtro que pinta el logo también pintaría su fondo. */
export const LOGO_CSS = '.logo-fondo{background:#fff;padding:8px;border-radius:12px;box-sizing:content-box}.logo-blanco{filter:brightness(0) invert(1)}.logo-negro{filter:brightness(0)}';

export const ESTADOS = ['borrador', 'enviada', 'aprobada', 'cobrada', 'pagada', 'descartada'] as const;
export type Estado = typeof ESTADOS[number];

export const ESTADO_LABELS: Record<Estado, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  cobrada: 'Cobrada',
  pagada: 'Pagada',
  descartada: 'Descartada',
};

export type Cliente = { nombre: string; nit: string; cel?: string };

/** Datos para generar la cuenta de cobro de la cotización. Fechas dd-mm-aaaa. */
export type DatosCobro = {
  fecha?: string;
  desde?: string;
  hasta?: string;
  concepto?: string;
  parte?: 'total' | 'anticipo' | 'saldo';  // qué se cobra en la cuenta
};

/** IVA, descuento y anticipo. Sin esto, el total es la suma de los ítems (como antes). */
export type Impuestos = {
  ivaModo?: 'ninguno' | 'agregar' | 'incluido';
  ivaTasa?: number;                     // % (19 por defecto)
  descuentoTipo?: 'porcentaje' | 'valor';
  descuento?: number;
  anticipo?: number;                    // % del total que se paga al inicio
};

export type ColoresOverride = {
  bg?: string;
  bg2?: string;
  accent?: string;
  text?: string;
  cardBg?: string;
  cardText?: string;
};

export type Cotizacion = {
  numero: string;
  fecha: string;
  alcance: string;
  costoTotal: number;
  costoTotalAuto: boolean;
  items: Item[];
  tiempoEntrega: string;
  terminos: string[];
  plantilla: TemplateId;
  coloresOverride: ColoresOverride;
  branding: Branding;
  diseno?: DisenoId;      // sin diseño = clásica
  colores?: Colores;      // primario/secundario; sin colores = plantilla + coloresOverride (legado)
  titulo?: string;        // "Propuesta económica" por defecto
  estado?: Estado;        // sin estado = borrador (cotizaciones viejas)
  cliente?: Cliente;
  cobro?: DatosCobro;
  impuestos?: Impuestos;
  vigenciaDias?: number;  // días de validez de la oferta (desde la fecha)
  aceptacionCliente?: boolean; // espacio para que el cliente firme (diseños que lo tienen); por defecto no
};

export function estadoDe(c: Cotizacion): Estado {
  return c.estado && (ESTADOS as readonly string[]).includes(c.estado) ? c.estado : 'borrador';
}

const LS = {
  draft: 'cotizador:draft',
  saved: 'cotizador:saved',
  branding: 'cotizador:branding',
};

export function defaultBranding(): Branding {
  return {
    logoDataUrl: undefined,
    representante: { nombre: '', cedula: '' },
    banco: '',
    contacto: {
      web: '',
      email: '',
      cel: '',
      ciudad: '',
      pais: '',
    },
  };
}

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function today(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

export function nuevaCotizacion(numero = '00001'): Cotizacion {
  return {
    numero,
    fecha: today(),
    alcance: '',
    costoTotal: 0,
    costoTotalAuto: true,
    items: [
      { id: makeId(), iconKey: 'code', titulo: '', descripcion: '', valor: 0 },
    ],
    tiempoEntrega: '7 días hábiles para entrega una vez aceptada propuesta.\nEl contenido debe estar revisado y aprobado al 100% para dar cierre.',
    terminos: [],
    plantilla: 'oscura',
    coloresOverride: {},
    branding: defaultBranding(),
    diseno: 'clasica',
    colores: { primary: '#2F2E33', secondary: '#F2D22B' },
    titulo: 'Propuesta económica',
    estado: 'borrador',
    cliente: { nombre: '', nit: '' },
    cobro: {},
  };
}

export function cantidadDe(it: Item): number {
  const q = Number(it.cantidad);
  return Number.isFinite(q) && q > 0 ? q : 1;
}

/** Valor total del ítem: precio unitario × cantidad. */
export function valorItem(it: Item): number {
  return (Number.isFinite(it.valor) ? it.valor : 0) * cantidadDe(it);
}

export function sumaItems(items: Item[]): number {
  return items.reduce((acc, it) => acc + valorItem(it), 0);
}

export type Totales = {
  subtotal: number;      // suma de ítems (o valor manual)
  descuento: number;     // valor descontado
  base: number;          // subtotal - descuento
  ivaModo: 'ninguno' | 'agregar' | 'incluido';
  ivaTasa: number;       // tasa general
  iva: number;           // valor del IVA (sumado o incluido), todas las tarifas
  baseSinIva: number;    // base gravable total (en "incluido" sin el IVA)
  ivaDetalle: { tasa: number; base: number; iva: number }[]; // por tarifa, de mayor a menor
  total: number;         // lo que paga el cliente
  anticipoPct: number;
  anticipo: number;
  saldo: number;
  conDesglose: boolean;  // hay algo que mostrar además del total
};

const redondear = (n: number) => Math.round(n);

/** Tasa general de IVA de la cotización. */
export function ivaGeneral(c: Cotizacion): number {
  const t = Number(c.impuestos?.ivaTasa);
  return Number.isFinite(t) && t >= 0 && c.impuestos?.ivaTasa != null ? t : 19;
}

/** Tasa de IVA de un ítem (la propia o la general). */
export function ivaDeItem(c: Cotizacion, it: Item): number {
  return it.ivaTasa != null && Number.isFinite(it.ivaTasa) ? it.ivaTasa : ivaGeneral(c);
}

/** "IVA 5%" o "Exento de IVA" cuando el ítem no usa la tarifa general. */
export function ivaTag(c: Cotizacion, it: Item): string {
  if ((c.impuestos?.ivaModo ?? 'ninguno') === 'ninguno' || it.ivaTasa == null || it.ivaTasa === ivaGeneral(c)) return '';
  return it.ivaTasa === 0 ? 'Exento de IVA' : `IVA ${it.ivaTasa}%`;
}

export function totales(c: Cotizacion): Totales {
  const imp = c.impuestos ?? {};
  const subtotal = c.costoTotalAuto ? sumaItems(c.items) : (Number.isFinite(c.costoTotal) ? c.costoTotal : 0);
  const dv = Math.max(0, Number(imp.descuento) || 0);
  const descuento = redondear(Math.min(subtotal, imp.descuentoTipo === 'valor' ? dv : subtotal * Math.min(dv, 100) / 100));
  const base = subtotal - descuento;
  const ivaModo = imp.ivaModo ?? 'ninguno';
  const ivaTasa = ivaGeneral(c);

  // IVA por tarifa: cada ítem con la suya; el descuento se reparte en proporción al valor
  const lineas = c.costoTotalAuto ? c.items.map((it) => ({ v: valorItem(it), t: ivaDeItem(c, it) })) : [{ v: subtotal, t: ivaTasa }];
  const factor = subtotal > 0 ? base / subtotal : 0;
  const porTasa = new Map<number, { base: number; iva: number }>();
  for (const l of lineas) {
    const b = l.v * factor;
    const g = porTasa.get(l.t) ?? { base: 0, iva: 0 };
    if (ivaModo === 'incluido') { const sin = b / (1 + l.t / 100); g.base += sin; g.iva += b - sin; }
    else { g.base += b; g.iva += ivaModo === 'agregar' ? b * l.t / 100 : 0; }
    porTasa.set(l.t, g);
  }
  const ivaDetalle = ivaModo === 'ninguno' ? [] : [...porTasa.entries()]
    .map(([tasa, g]) => ({ tasa, base: redondear(g.base), iva: redondear(g.iva) }))
    .filter((d) => d.base > 0 || d.iva > 0)
    .sort((a, b) => b.tasa - a.tasa);
  const iva = ivaDetalle.reduce((a, d) => a + d.iva, 0);
  const total = ivaModo === 'agregar' ? base + iva : base;
  const baseSinIva = ivaModo === 'incluido' ? base - iva : base;
  const anticipoPct = Math.min(100, Math.max(0, Number(imp.anticipo) || 0));
  const anticipo = redondear(total * anticipoPct / 100);
  return {
    subtotal, descuento, base, ivaModo, ivaTasa, iva, baseSinIva, ivaDetalle, total, anticipoPct, anticipo, saldo: total - anticipo,
    conDesglose: descuento > 0 || ivaModo !== 'ninguno' || anticipoPct > 0,
  };
}

/** Total que paga el cliente (con descuento e IVA). */
export function totalReal(c: Cotizacion): number {
  return totales(c).total;
}

/** "8 und × $350.000" cuando hay cantidad o unidad; vacío si es un ítem simple. */
/** La unidad es un texto (und, m, hora…); un número suelto ahí es un error de digitación y se ignora. */
export function unidadDe(it: Pick<Item, 'unidad'>): string {
  const u = (it.unidad ?? '').trim();
  return u && !/^[-+\d.,\s]+$/.test(u) ? u : '';
}

export function qtyLabel(it: Item): string {
  const q = cantidadDe(it);
  const u = unidadDe(it);
  if (q === 1 && !u) return '';
  const n = Number.isInteger(q) ? String(q) : String(q).replace('.', ',');
  return `${n}${u ? ' ' + u : ''} × ${formatCOP(it.valor)}`;
}

/** Filas del desglose (subtotal, descuento, IVA, total, anticipo, saldo). */
export function filasDesglose(t: Totales): { label: string; value: string; tipo?: 'total' | 'nota' }[] {
  const f: { label: string; value: string; tipo?: 'total' | 'nota' }[] = [];
  if (t.descuento > 0 || t.ivaModo === 'agregar') f.push({ label: 'Subtotal', value: formatCOP(t.subtotal) });
  if (t.descuento > 0) f.push({ label: 'Descuento', value: '−' + formatCOP(t.descuento) });
  const gravadas = t.ivaDetalle.filter((d) => d.tasa > 0);
  const exento = t.ivaDetalle.find((d) => d.tasa === 0);
  if (t.ivaModo === 'agregar') {
    for (const d of gravadas) f.push({ label: `IVA ${d.tasa}%`, value: formatCOP(d.iva) });
    if (exento && gravadas.length) f.push({ label: 'Exento de IVA', value: formatCOP(exento.base) });
  }
  f.push({ label: 'Total', value: formatCOP(t.total), tipo: 'total' });
  if (t.ivaModo === 'incluido' && t.iva > 0) {
    const partes = gravadas.map((d) => `IVA ${d.tasa}%: ${formatCOP(d.iva)}`).join(' · ');
    f.push({ label: `Incluye ${partes} (base ${formatCOP(t.baseSinIva)})${exento ? ` · Exento: ${formatCOP(exento.base)}` : ''}`, value: '', tipo: 'nota' });
  }
  if (t.anticipoPct > 0) {
    f.push({ label: `Anticipo ${t.anticipoPct}%`, value: formatCOP(t.anticipo) });
    f.push({ label: 'Saldo contra entrega', value: formatCOP(t.saldo) });
  }
  return f;
}

/** "dd-mm-aaaa" + días → "dd-mm-aaaa" (vacío si la fecha no es válida). */
export function sumarDias(fecha: string, dias: number): string {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec((fecha ?? '').trim());
  if (!m || !dias) return '';
  const d = new Date(+m[3], +m[2] - 1, +m[1] + dias);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

/** Fecha hasta la que vale la oferta, o vacío. */
export function validaHasta(c: Cotizacion): string {
  return c.vigenciaDias ? sumarDias(c.fecha, c.vigenciaDias) : '';
}

export function formatCOP(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  return '$' + safe.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

// ---------- localStorage ----------

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function loadDraft(): Cotizacion | null {
  if (typeof localStorage === 'undefined') return null;
  return safeParse<Cotizacion>(localStorage.getItem(LS.draft));
}

export function saveDraft(c: Cotizacion): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LS.draft, JSON.stringify(c));
}

export function loadBranding(): Branding | null {
  if (typeof localStorage === 'undefined') return null;
  return safeParse<Branding>(localStorage.getItem(LS.branding));
}

export function saveBranding(b: Branding): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LS.branding, JSON.stringify(b));
}

export function loadSaved(): Cotizacion[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse<Cotizacion[]>(localStorage.getItem(LS.saved)) ?? [];
}

export function persistSaved(c: Cotizacion): Cotizacion[] {
  const list = loadSaved();
  const idx = list.findIndex(x => x.numero === c.numero);
  if (idx >= 0) list[idx] = c; else list.push(c);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LS.saved, JSON.stringify(list));
  }
  return list;
}

export function deleteSaved(numero: string): Cotizacion[] {
  const list = loadSaved().filter(c => c.numero !== numero);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LS.saved, JSON.stringify(list));
  }
  return list;
}

export function nextNumero(): string {
  const list = loadSaved();
  let max = 0;
  for (const c of list) {
    const n = parseInt(c.numero, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1).padStart(5, '0');
}
