import type { IconKey } from './icons';
import type { TemplateId } from './templates';

export type Item = {
  id: string;
  iconKey: IconKey;
  titulo: string;
  descripcion: string;
  valor: number;
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
  representante: Representante;
  banco: string;
  contacto: Contacto;
};

export type ColoresOverride = {
  bg?: string;
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
};

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

function today(): string {
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
  };
}

export function sumaItems(items: Item[]): number {
  return items.reduce((acc, it) => acc + (Number.isFinite(it.valor) ? it.valor : 0), 0);
}

export function totalReal(c: Cotizacion): number {
  return c.costoTotalAuto ? sumaItems(c.items) : c.costoTotal;
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
