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
  grupo?: string;         // "Fase 1", "Etapa 2"…: los ítems seguidos con el mismo grupo salen bajo un encabezado
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
  logoEstilo?: 'original' | 'fondo' | 'blanco' | 'negro' | 'primario' | 'secundario';
  /** Último cambio de la marca (ISO): al combinar respaldos de dos equipos gana la más reciente. */
  actualizado?: string;
  representante: Representante;
  banco: string;          // "Cuenta de Ahorros BANCOLOMBIA No. ..." (cuenta de cobro)
  empresa?: string;       // nombre de la marca que muestran las plantillas
  nombreLegal?: string;   // nombre completo para la cuenta de cobro (en una empresa, la razón social)
  direccion?: string;
  tipo?: 'natural' | 'empresa'; // persona natural (por defecto) o empresa (persona jurídica)
  nit?: string;           // NIT de la empresa
  cargo?: string;         // cargo de quien firma por la empresa (por defecto "Representante legal")
  contacto: Contacto;
};

/** Clases del <img> del logo según logoEstilo (ver LOGO_CSS). */
export function logoClase(b: Pick<Branding, 'logoEstilo'>): string {
  return b.logoEstilo && b.logoEstilo !== 'original' ? ` logo-${b.logoEstilo}` : '';
}
export const esEmpresa = (b: Pick<Branding, 'tipo'>) => b.tipo === 'empresa';

/**
 * Términos que salen en el documento. Con "Mostrar la cuenta bancaria" apagado se omiten
 * los que dan la cuenta (tienen su número o dicen "cuenta de ahorros/corriente").
 */
export function terminosVisibles(c: Pick<Cotizacion, 'terminos' | 'mostrarBanco' | 'branding'>): string[] {
  const l = c.terminos.filter((x) => x.trim());
  if (c.mostrarBanco !== false) return l;
  const digitos = (s: string) => s.replace(/\D/g, '');
  const num = (c.branding.banco?.match(/\d[\d\s.-]{5,}\d/g) ?? []).map(digitos).filter((n) => n.length >= 6);
  return l.filter((x) => !/\bcuenta\s+(de\s+)?(ahorros|corriente)\b/i.test(x) && !num.some((n) => digitos(x).includes(n)));
}

/** Quien cotiza: la empresa (razón social y NIT) o la persona (nombre y cédula). */
export function proveedorDe(b: Branding): { nombre: string; idLbl: string; id: string } {
  return esEmpresa(b)
    ? { nombre: b.nombreLegal?.trim() || b.empresa?.trim() || b.representante.nombre, idLbl: 'NIT', id: b.nit?.trim() ?? '' }
    : { nombre: b.representante.nombre, idLbl: 'CC / NIT', id: b.representante.cedula };
}

/** Lo que va bajo el nombre de quien firma por una empresa: "Representante legal · Chigüirotec S.A.S.". Vacío para persona natural. */
export function cargoFirma(b: Branding): string {
  if (!esEmpresa(b)) return '';
  const emp = proveedorDe(b).nombre;
  return [b.cargo?.trim() || 'Representante legal', emp !== b.representante.nombre ? emp : ''].filter(Boolean).join(' · ');
}

/** Un solo estilo a la vez: el filtro que pinta el logo también pintaría su fondo. */
export const LOGO_CSS = '.logo-fondo{background:#fff;padding:8px;border-radius:12px;box-sizing:content-box}.logo-blanco{filter:brightness(0) invert(1)}.logo-negro{filter:brightness(0)}.logo-primario,.logo-secundario{filter:url(#logo-tinte)}';

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

/** Una fila del detalle de la cuenta (un domicilio, una visita…). La fecha es texto libre. */
export type FilaDetalle = { id: string; fecha?: string; texto: string; valor?: number };

/** Qué se cobra: todo, el anticipo, el saldo o un hito del plan de pagos ("hito:<id>"). */
export type ParteCobro = 'total' | 'anticipo' | 'saldo' | `hito:${string}`;

/** Datos para generar la cuenta de cobro de la cotización. Fechas dd-mm-aaaa. */
export type DatosCobro = {
  fecha?: string;
  desde?: string;
  hasta?: string;
  concepto?: string;
  parte?: ParteCobro;  // qué se cobra en la cuenta
  valor?: number;   // valor escrito a mano; sin él sale del total, el anticipo o el saldo
  ciudad?: string;  // ciudad de la cuenta; sin ella, la de tu marca
  nota?: string;    // línea al final (p. ej. "No soy responsable de IVA")
  // Cambios solo para la cuenta (lo vacío sale de la cotización o de Mi marca)
  cliente?: Cliente;
  banco?: string;
  emisor?: { nombre?: string; cedula?: string; direccion?: string; telefono?: string };
  detalle?: FilaDetalle[];  // lista bajo el concepto (fecha, descripción, valor)
  conPeriodo?: boolean;     // false = el concepto va tal cual, sin "realizadas durante el período…"
};

/** IVA, descuento y anticipo. Sin esto, el total es la suma de los ítems (como antes). */
export type Impuestos = {
  ivaModo?: 'ninguno' | 'agregar' | 'incluido';
  ivaTasa?: number;                     // % (19 por defecto)
  descuentoTipo?: 'porcentaje' | 'valor';
  descuento?: number;
  anticipo?: number;                    // % del total que se paga al inicio
};

/** Un escenario para comparar ("A. Básica", "B. Recomendada"…): qué ítems incluye (por id). */
export type Opcion = { id: string; nombre: string; descripcion?: string; recomendada?: boolean; items: string[] };

export const PERIODOS = { mensual: 'Mensual', anual: 'Anual', transaccion: 'Por transacción', unico: 'Pago único' } as const;
export type Periodo = keyof typeof PERIODOS;

/** Un costo que paga el cliente a otro proveedor (hosting, pasarela…). Informativo: nunca suma al total. */
export type CostoTercero = {
  concepto: string;
  proveedor?: string;
  valor?: number;
  valorHasta?: number;   // rango: "USD 24–48"
  moneda?: 'COP' | 'USD'; // COP por defecto
  periodo?: Periodo;
  nota?: string;         // "2,65 % + $700 + IVA por transacción"
};

export const NOTA_TERCEROS = 'Valores referenciales consultados en las páginas oficiales de cada proveedor; los paga directamente el cliente y pueden cambiar según sus tarifas.';

/** Un pago del plan por hitos: porcentaje del total o valor fijo (todos los hitos usan lo mismo). */
export type Hito = { id: string; nombre: string; pct?: number; valor?: number; condicion?: string; grupo?: string };

export type ColoresOverride = {
  bg?: string;
  bg2?: string;
  accent?: string;
  text?: string;
  cardBg?: string;
  cardText?: string;
};

export type Cotizacion = {
  /** 'cuenta' = cuenta de cobro sola (sin ítems ni diseño), con consecutivo COB-0001. Sin tipo = cotización. */
  tipo?: 'cotizacion' | 'cuenta';
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
  actualizado?: string;   // último guardado (ISO): al combinar respaldos gana la más reciente
  perfilId?: string;      // perfil de marca con el que se hizo (la marca va copiada en branding)
  aceptacionCliente?: boolean;
  opciones?: Opcion[];          // 2 o 3 escenarios; el total del documento es el de la recomendada
  costosTerceros?: CostoTercero[];
  trm?: number;                 // pesos por dólar, para mostrar el equivalente de los costos en USD
  notaTerceros?: string;        // nota al pie de los costos de terceros (sin ella, NOTA_TERCEROS)
  hitos?: Hito[];               // plan de pagos; si hay, reemplaza anticipo y saldo
  mostrarBanco?: boolean;  // cuenta bancaria en la cotización (por defecto sí; la cuenta de cobro siempre la lleva)
  iconosItems?: boolean;   // ícono de cada ítem en la primera columna y el número en el título (por defecto sí) // espacio para que el cliente firme (diseños que lo tienen); por defecto no
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

export const grupoDe = (it: Pick<Item, 'grupo'>) => (it.grupo ?? '').trim();

export type GrupoItems = { nombre: string; subtotal: number; cantidad: number };

/**
 * Encabezado que va antes de cada ítem (o null). Un grupo empieza donde cambia el grupo
 * entre ítems seguidos; un ítem sin grupo después de uno agrupado sale bajo "Otros".
 * Sin ningún grupo todo es null y las plantillas se ven como siempre.
 */
export function gruposItems(items: Item[]): (GrupoItems | null)[] {
  if (!items.some((it) => grupoDe(it))) return items.map(() => null);
  return items.map((it, i) => {
    const g = grupoDe(it);
    if (i > 0 && grupoDe(items[i - 1]) === g) return null;
    if (!g && i === 0) return null;
    let j = i;
    while (j < items.length && grupoDe(items[j]) === g) j++;
    const del = items.slice(i, j);
    return { nombre: g || 'Otros', subtotal: sumaItems(del), cantidad: del.length };
  });
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
  opcion?: string;       // con opciones: el nombre de la recomendada (de ella sale el total)
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

/** Hay opciones para comparar (solo con el total sumado de los ítems). */
export const conOpciones = (c: Pick<Cotizacion, 'opciones' | 'costoTotalAuto' | 'tipo'>) =>
  !esCuenta(c) && c.costoTotalAuto && (c.opciones?.length ?? 0) >= 2;

/** La opción recomendada (o la primera). */
export function opcionRecomendada(c: Pick<Cotizacion, 'opciones'>): Opcion | undefined {
  return c.opciones?.find((o) => o.recomendada) ?? c.opciones?.[0];
}

export function itemsDeOpcion(c: Pick<Cotizacion, 'items'>, op: Opcion): Item[] {
  const ids = new Set(op.items);
  return c.items.filter((it) => ids.has(it.id));
}

/** "Solo en C. B + soporte" para un ítem que la opción recomendada no incluye; vacío si sí lo incluye o no hay opciones. */
export function notaOpcion(c: Cotizacion, it: Item): string {
  if (!conOpciones(c) || opcionRecomendada(c)!.items.includes(it.id)) return '';
  const en = c.opciones!.filter((o) => o.items.includes(it.id)).map((o) => o.nombre);
  return en.length ? `Solo en ${en.join(' y ')}` : 'No incluido en ninguna opción';
}

/** Totales de una opción: la misma cuenta de siempre (IVA, descuento) solo con sus ítems. */
export function totalesOpcion(c: Cotizacion, op: Opcion): Totales {
  return totalesDe(c, itemsDeOpcion(c, op));
}

/** Totales del documento; con opciones, los de la recomendada. */
export function totales(c: Cotizacion): Totales {
  const rec = conOpciones(c) ? opcionRecomendada(c) : undefined;
  return totalesDe(c, rec ? itemsDeOpcion(c, rec) : c.items);
}

function totalesDe(c: Cotizacion, items: Item[]): Totales {
  const imp = c.impuestos ?? {};
  const subtotal = c.costoTotalAuto ? sumaItems(items) : (Number.isFinite(c.costoTotal) ? c.costoTotal : 0);
  const dv = Math.max(0, Number(imp.descuento) || 0);
  const descuento = redondear(Math.min(subtotal, imp.descuentoTipo === 'valor' ? dv : subtotal * Math.min(dv, 100) / 100));
  const base = subtotal - descuento;
  const ivaModo = imp.ivaModo ?? 'ninguno';
  const ivaTasa = ivaGeneral(c);

  // IVA por tarifa: cada ítem con la suya; el descuento se reparte en proporción al valor
  const lineas = c.costoTotalAuto ? items.map((it) => ({ v: valorItem(it), t: ivaDeItem(c, it) })) : [{ v: subtotal, t: ivaTasa }];
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
  // Con plan de pagos por hitos no hay anticipo ni saldo
  const anticipoPct = c.hitos?.length ? 0 : Math.min(100, Math.max(0, Number(imp.anticipo) || 0));
  const anticipo = redondear(total * anticipoPct / 100);
  const rec = conOpciones(c) ? opcionRecomendada(c) : undefined;
  return {
    subtotal, descuento, base, ivaModo, ivaTasa, iva, baseSinIva, ivaDetalle, total, anticipoPct, anticipo, saldo: total - anticipo,
    conDesglose: descuento > 0 || ivaModo !== 'ninguno' || anticipoPct > 0 || !!rec,
    ...(rec ? { opcion: rec.nombre } : {}),
  };
}

/** Valor de cada hito sobre el total del documento; el último se queda con el redondeo. */
export function valoresHitos(c: Cotizacion): { hito: Hito; pct: number; valor: number }[] {
  const l = c.hitos ?? [];
  const total = totales(c).total;
  const porValor = l.some((h) => h.valor != null && h.pct == null);
  let acum = 0;
  return l.map((h, i) => {
    const valor = porValor ? Math.round(Number(h.valor) || 0) : i === l.length - 1 ? total - acum : Math.round(total * (Number(h.pct) || 0) / 100);
    acum += valor;
    const pct = porValor ? (total ? valor / total * 100 : 0) : Number(h.pct) || 0;
    return { hito: h, pct, valor };
  });
}

/** Problema del plan de pagos (para la interfaz y el CLI), o null si está bien. */
export function errorHitos(c: Cotizacion): string | null {
  const l = c.hitos ?? [];
  if (!l.length) return null;
  const sinNombre = l.findIndex((h) => !h.nombre?.trim());
  if (sinNombre >= 0) return `el hito ${sinNombre + 1} no tiene nombre`;
  const conPct = l.filter((h) => h.pct != null).length;
  const conValor = l.filter((h) => h.valor != null).length;
  if (conPct && conValor) return 'usa porcentaje en todos los hitos o valor en todos, no las dos cosas';
  if (!conPct && !conValor) return 'cada hito necesita un porcentaje o un valor';
  if (conPct !== l.length && conValor !== l.length) return 'a algún hito le falta el porcentaje o el valor';
  if (l.some((h) => (h.pct ?? h.valor ?? 0) <= 0)) return 'los porcentajes y valores de los hitos deben ser mayores que 0';
  if (conPct) {
    const suma = l.reduce((a, h) => a + (Number(h.pct) || 0), 0);
    if (Math.abs(suma - 100) > 0.01) return `los hitos suman ${String(Math.round(suma * 100) / 100).replace('.', ',')} %, deben sumar 100 %`;
  } else {
    const suma = l.reduce((a, h) => a + (Number(h.valor) || 0), 0);
    const total = totales(c).total;
    if (Math.abs(suma - total) > 1) return `los hitos suman ${formatCOP(suma)} y el total es ${formatCOP(total)}`;
  }
  return null;
}

/** "USD 24–48" / "$150.000" con su equivalente en pesos si hay TRM; vacío si no tiene valor. */
export function valorTercero(ct: CostoTercero, trm?: number): { valor: string; cop: string } {
  if (ct.valor == null || !Number.isFinite(ct.valor)) return { valor: '', cop: '' };
  const usd = ct.moneda === 'USD';
  const n = (v: number) => (usd ? v.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : formatCOP(v));
  const rango = ct.valorHasta != null && Number.isFinite(ct.valorHasta) && ct.valorHasta !== ct.valor;
  const valor = `${usd ? 'USD ' : ''}${n(ct.valor)}${rango ? `–${n(ct.valorHasta!)}` : ''}`;
  const cop = usd && trm && trm > 0 ? `≈ ${formatCOP(ct.valor * trm)}${rango ? `–${formatCOP(ct.valorHasta! * trm)}` : ''}` : '';
  return { valor, cop };
}

/** Total que paga el cliente (con descuento e IVA). */
export function totalReal(c: Cotizacion): number {
  return totales(c).total;
}

export const esCuenta = (c: Pick<Cotizacion, 'tipo'>) => c.tipo === 'cuenta';
const PREFIJO_CUENTA = 'COB-';
/** Número que se muestra: las cuentas guardan "COB-0001" (para no chocar con las cotizaciones) y muestran "0001". */
export const numeroVisible = (c: Pick<Cotizacion, 'tipo' | 'numero'>) => (esCuenta(c) ? c.numero.replace(PREFIJO_CUENTA, '') : c.numero);
export const numeroCuenta = (visible: string) => PREFIJO_CUENTA + visible.trim();

/** Lo que se cobra con la cotización: el total, el anticipo o el saldo. */
export function valorCalculadoCobro(c: Cotizacion): number {
  if (esCuenta(c)) return sumaDetalle(c); // una cuenta suelta suma su detalle (si tiene valores)
  const t = totales(c);
  const hito = hitoCobro(c);
  if (hito) return hito.valor;
  const parte = t.anticipoPct > 0 ? c.cobro?.parte ?? 'total' : 'total';
  return parte === 'anticipo' ? t.anticipo : parte === 'saldo' ? t.saldo : t.total;
}

/** El hito que se cobra (si la parte es "hito:<id>" y existe). */
export function hitoCobro(c: Cotizacion): { hito: Hito; pct: number; valor: number } | undefined {
  const p = c.cobro?.parte;
  if (!p?.startsWith('hito:')) return undefined;
  return valoresHitos(c).find((v) => v.hito.id === p.slice(5));
}

/** Valor de la cuenta de cobro: el escrito a mano o el calculado (una cuenta sola no tiene cálculo). */
export function valorCobro(c: Cotizacion): number {
  const v = c.cobro?.valor;
  if (v != null && Number.isFinite(v)) return v;
  return valorCalculadoCobro(c);
}

/** Suma de los valores del detalle de la cuenta. */
export function sumaDetalle(c: Cotizacion): number {
  return (c.cobro?.detalle ?? []).reduce((a, f) => a + (Number.isFinite(f.valor) ? f.valor! : 0), 0);
}

/** Cliente de la cuenta: en una cuenta suelta es el del documento; desde una cotización, el cambiado o el de la cotización. */
export function clienteCobro(c: Cotizacion): Cliente {
  return (esCuenta(c) ? c.cliente : c.cobro?.cliente ?? c.cliente) ?? { nombre: '', nit: '' };
}

/** Valor del documento en listas y tablero. */
export const valorDoc = (c: Cotizacion) => (esCuenta(c) ? valorCobro(c) : totalReal(c));

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
  if (t.opcion) f.push({ label: `Valor de la opción ${t.opcion}`, value: '', tipo: 'nota' });
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
  c.actualizado = new Date().toISOString();
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
  const list = loadSaved().filter((c) => !esCuenta(c));
  let max = 0;
  for (const c of list) {
    const n = parseInt(c.numero, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1).padStart(5, '0');
}

/** Siguiente consecutivo de cuentas de cobro: "COB-0001", "COB-0002"… */
export function nextNumeroCuenta(): string {
  let max = 0;
  for (const c of loadSaved()) {
    if (!esCuenta(c)) continue;
    const n = parseInt(numeroVisible(c), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return numeroCuenta(String(max + 1).padStart(4, '0'));
}

/** Cuenta de cobro sola: sin ítems ni diseño, lista para cobrar. */
export function nuevaCuenta(numero = nextNumeroCuenta()): Cotizacion {
  return { ...nuevaCotizacion(numero), tipo: 'cuenta', items: [], titulo: 'Cuenta de cobro', estado: 'cobrada', tiempoEntrega: '' };
}

/** Corre una fecha dd-mm-aaaa un mes (el último día de un mes pasa al último del siguiente). */
export function masUnMes(fecha: string): string {
  const m = (fecha ?? '').trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return fecha;
  const d = +m[1], mes = +m[2], y = +m[3];
  const dias = (yy: number, mm: number) => new Date(yy, mm, 0).getDate(); // mm de 1 a 12
  const ny = mes === 12 ? y + 1 : y, nm = mes === 12 ? 1 : mes + 1;
  const nd = d >= dias(y, mes) ? dias(ny, nm) : Math.min(d, dias(ny, nm));
  return `${String(nd).padStart(2, '0')}-${String(nm).padStart(2, '0')}-${ny}`;
}
