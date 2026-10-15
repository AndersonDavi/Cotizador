// Colores de las plantillas: cada diseño se pinta solo con un color primario y
// uno secundario. De ahí salen tonos oscuros/claros y el color de texto legible
// encima de cada uno (blanco o casi negro según el contraste).

import { TEMPLATES } from './templates';
import type { Cotizacion } from './state';

export type DisenoId = 'clasica' | 'bloque' | 'noche' | 'diagonal' | 'estudio' | 'editorial' | 'redonda' | 'lateral';

export type Colores = { primary: string; secondary: string };

export type DisenoInfo = {
  id: DisenoId;
  nombre: string;
  descripcion: string;
  colores: Colores;   // colores con los que se presenta en la galería
};

export const DISENOS: DisenoInfo[] = [
  { id: 'clasica',   nombre: 'Clásica',   descripcion: 'Encabezado en degradado y tarjetas por ítem', colores: { primary: '#6B6300', secondary: '#F2DA23' } },
  { id: 'bloque',    nombre: 'Bloque',    descripcion: 'Bloques de color y tabla con totales',       colores: { primary: '#2F2E33', secondary: '#E3A94F' } },
  { id: 'noche',     nombre: 'Noche',     descripcion: 'Fondo oscuro con curvas de acento',          colores: { primary: '#232323', secondary: '#F2D21B' } },
  { id: 'diagonal',  nombre: 'Diagonal',  descripcion: 'Franjas en diagonal y pie a dos colores',    colores: { primary: '#5E9130', secondary: '#BCDB4E' } },
  { id: 'estudio',   nombre: 'Estudio',   descripcion: 'Bandas, esquinas y tabla a rayas',           colores: { primary: '#0E2240', secondary: '#F6C443' } },
  { id: 'editorial', nombre: 'Editorial', descripcion: 'Tipografía serif, blanco y negro',           colores: { primary: '#111111', secondary: '#7A7A7A' } },
  { id: 'redonda',   nombre: 'Redonda',   descripcion: 'Banda de color con esquinas redondeadas',    colores: { primary: '#E8623A', secondary: '#38393D' } },
  { id: 'lateral',   nombre: 'Lateral',   descripcion: 'Columna lateral con tu marca y el total',    colores: { primary: '#1F3B57', secondary: '#4FD1C5' } },
];

/** Combinaciones rápidas de la paleta. */
export const PALETAS: (Colores & { nombre: string })[] = [
  { nombre: 'Chigüiro',  primary: '#6B6300', secondary: '#F2DA23' },
  { nombre: 'Carbón',    primary: '#2F2E33', secondary: '#E3A94F' },
  { nombre: 'Marino',    primary: '#0E2240', secondary: '#F6C443' },
  { nombre: 'Océano',    primary: '#1F3B57', secondary: '#4FD1C5' },
  { nombre: 'Bosque',    primary: '#2E6B3A', secondary: '#BCDB4E' },
  { nombre: 'Coral',     primary: '#E8623A', secondary: '#38393D' },
  { nombre: 'Uva',       primary: '#4B2A7B', secondary: '#F08BB4' },
  { nombre: 'Vino',      primary: '#7A1F2B', secondary: '#E9C46A' },
  { nombre: 'Grafito',   primary: '#111111', secondary: '#7A7A7A' },
  { nombre: 'Cielo',     primary: '#2563EB', secondary: '#93C5FD' },
];

// ── Utilidades de color ──────────────────────────────────────────────────────

function parse(hex: string): [number, number, number] {
  let h = (hex || '#000').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function mix(a: string, b: string, t: number): string {
  const x = parse(a), y = parse(b);
  return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export const shade = (c: string, t: number) => mix(c, '#000000', t);
export const tint = (c: string, t: number) => mix(c, '#FFFFFF', t);

function luminance(c: string): number {
  const v = parse(c).map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

export function contrast(a: string, b: string): number {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Texto legible sobre el color dado. */
export function onColor(bg: string): string {
  return contrast(bg, '#FFFFFF') >= contrast(bg, '#16171A') ? '#FFFFFF' : '#16171A';
}

export const isDark = (c: string) => onColor(c) === '#FFFFFF';

/** Tema derivado de primario/secundario que usan las plantillas nuevas. */
export type Theme = {
  p: string; s: string;
  onP: string; onS: string;
  pDark: string; pDeep: string;
  pSoft: string; pSofter: string;
  sSoft: string;
  ink: string; muted: string; line: string; paper: string;
};

export function buildTheme({ primary: p, secondary: s }: Colores): Theme {
  return {
    p, s,
    onP: onColor(p),
    onS: onColor(s),
    pDark: shade(p, 0.35),
    pDeep: shade(p, 0.6),
    pSoft: tint(p, 0.85),
    pSofter: tint(p, 0.93),
    sSoft: tint(s, 0.75),
    ink: '#1C1D21',
    muted: '#62666E',
    line: '#DADDE2',
    paper: '#FFFFFF',
  };
}

export function themeVars(t: Theme): string {
  return Object.entries(t).map(([k, v]) => `--${k}:${v}`).join(';');
}

/** Primario/secundario de una cotización (también para las guardadas antes de este cambio). */
export function coloresDe(c: Cotizacion): Colores {
  if (c.colores?.primary && c.colores?.secondary) return c.colores;
  const base = TEMPLATES[c.plantilla] ?? TEMPLATES.oscura;
  const o = c.coloresOverride ?? {};
  return { primary: o.bg ?? base.headerBg, secondary: o.accent ?? base.accent };
}

export function disenoDe(c: Cotizacion): DisenoId {
  return DISENOS.some((d) => d.id === c.diseno) ? (c.diseno as DisenoId) : 'clasica';
}
