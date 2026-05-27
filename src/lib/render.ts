import { loadIconImage } from './icons';
import { TEMPLATES, type Template } from './templates';
import { formatCOP, totalReal, type Cotizacion } from './state';

const W = 1080;
const PAD_X = 56;
const FONT = 'Roboto, Arial, sans-serif';

// Alturas de cada bloque (en px del canvas 1080-ancho)
const HEADER_H = 420;
const ITEM_MIN_H = 150;
const ITEM_GAP = 0;
const ITEMS_PAD_TOP = -60;   // la lista entra sobre el header como en la referencia
const ITEMS_PAD_BOTTOM = 110;
const TIEMPO_H = 130;
const SECTION_GAP = 0;
const FOOTER_H = 150;
const CONTACT_H = 88;
const PAGE_BOTTOM_PAD = 24;

export function computeHeight(itemHeightsOrCount: number[] | number): number {
  const itemHeights = Array.isArray(itemHeightsOrCount)
    ? itemHeightsOrCount
    : Array.from({ length: Math.max(itemHeightsOrCount, 1) }, () => ITEM_MIN_H);
  const n = Math.max(itemHeights.length, 1);
  return (
    HEADER_H +
    ITEMS_PAD_TOP +
    itemHeights.reduce((acc, h) => acc + h, 0) + (n - 1) * ITEM_GAP +
    ITEMS_PAD_BOTTOM +
    TIEMPO_H +
    SECTION_GAP +
    FOOTER_H +
    CONTACT_H +
    PAGE_BOTTOM_PAD
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function trimImageWhitespace(img: HTMLImageElement): HTMLCanvasElement {
  const source = document.createElement('canvas');
  source.width = img.width;
  source.height = img.height;
  const sctx = source.getContext('2d')!;
  sctx.drawImage(img, 0, 0);

  const pixels = sctx.getImageData(0, 0, source.width, source.height);
  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const i = (y * source.width + x) * 4;
      const r = pixels.data[i];
      const g = pixels.data[i + 1];
      const b = pixels.data[i + 2];
      const a = pixels.data[i + 3];
      const isWhite = r > 244 && g > 244 && b > 244;
      if (a > 16 && !isWhite) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX > maxX || minY > maxY) return source;

  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(source.width - 1, maxX + pad);
  maxY = Math.min(source.height - 1, maxY + pad);

  const out = document.createElement('canvas');
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext('2d')!.drawImage(source, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/);
    let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (line && ctx.measureText(t).width > maxWidth) {
        lines.push(line);
        line = w;
      } else {
        line = t;
      }
    }
    lines.push(line);
  }
  return lines;
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontTemplate: (size: number) => string,
  maxWidth: number,
  maxSize: number,
  minSize: number
): number {
  for (let size = maxSize; size >= minSize; size -= 2) {
    ctx.font = fontTemplate(size);
    if (ctx.measureText(text).width <= maxWidth) return size;
  }
  return minSize;
}

function measureItemHeight(
  ctx: CanvasRenderingContext2D,
  it: { titulo: string; descripcion: string }
): number {
  const x = PAD_X;
  const w = W - PAD_X * 2;
  const totalW = 186;
  const totalX = x + w - totalW;
  const contentX = x + 142;
  const contentW = totalX - contentX - 24;

  ctx.font = `700 24px ${FONT}`;
  const titleLines = wrapText(ctx, it.titulo || '—', contentW);
  ctx.font = `400 17px ${FONT}`;
  const descLines = wrapText(ctx, it.descripcion || '', contentW).filter(Boolean);

  const textHeight =
    24 +
    titleLines.length * 29 +
    4 +
    descLines.length * 22 +
    24;

  return Math.max(ITEM_MIN_H, textHeight);
}

async function ensureFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  await document.fonts.ready;
}

function effectiveTemplate(c: Cotizacion): Template {
  const base = TEMPLATES[c.plantilla];
  const o = c.coloresOverride ?? {};
  return {
    ...base,
    headerBg: o.bg ?? base.headerBg,
    accent: o.accent ?? base.accent,
    text: o.text ?? base.text,
    cardBg: o.cardBg ?? base.cardBg,
    cardText: o.cardText ?? base.cardText,
  };
}

export async function buildExportCanvas(c: Cotizacion): Promise<HTMLCanvasElement> {
  await ensureFontsReady();

  const t = effectiveTemplate(c);
  const items = c.items;
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d')!;
  const itemHeights = items.map(it => measureItemHeight(measureCtx, it));
  const H = computeHeight(itemHeights);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Fondo de página (blanco) ──────────────────────────────────────────────
  ctx.fillStyle = t.pageBg;
  ctx.fillRect(0, 0, W, H);

  // ── Fondo del header (degradado de plantilla) ─────────────────────────────
  const headerGradient = ctx.createLinearGradient(0, 0, W, HEADER_H);
  headerGradient.addColorStop(0, t.headerBg);
  headerGradient.addColorStop(1, t.headerBg2);
  ctx.fillStyle = headerGradient;
  ctx.fillRect(0, 0, W, HEADER_H);

  // ── Header ────────────────────────────────────────────────────────────────
  await drawHeader(ctx, c, t);

  // ── Items ─────────────────────────────────────────────────────────────────
  let y = HEADER_H + ITEMS_PAD_TOP;
  for (let i = 0; i < items.length; i++) {
    await drawItemCard(ctx, items[i], t, y, itemHeights[i]);
    y += itemHeights[i] + ITEM_GAP;
  }
  y = y - ITEM_GAP + ITEMS_PAD_BOTTOM;

  // ── Tiempo de entrega ────────────────────────────────────────────────────
  await drawTiempo(ctx, c, t, y);
  y += TIEMPO_H + SECTION_GAP;

  // ── Footer ────────────────────────────────────────────────────────────────
  await drawFooter(ctx, c, t, y);
  y += FOOTER_H;

  // ── Contacto ──────────────────────────────────────────────────────────────
  drawContacto(ctx, c, t, y);

  return canvas;
}

async function drawHeader(
  ctx: CanvasRenderingContext2D,
  c: Cotizacion,
  t: Template
) {
  ctx.textBaseline = 'top';

  // ── Logo arriba a la derecha (se dibuja primero para reservar espacio) ────
  let logoReserveW = 0;
  if (c.branding.logoDataUrl) {
    try {
      const img = await loadImage(c.branding.logoDataUrl);
      const maxS = 72;
      const ratio = img.width / img.height;
      let lw = maxS, lh = maxS / ratio;
      if (lh > maxS) { lh = maxS; lw = maxS * ratio; }
      logoReserveW = lw + 20;
      ctx.drawImage(img, W - PAD_X - lw, 38, lw, lh);
    } catch { /* sin logo */ }
  }

  // ── Título "PROPUESTA ECONÓMICA | 00001" ─────────────────────────────────
  const titleAreaRight = W - PAD_X - logoReserveW;
  const titleText = 'PROPUESTA ECONÓMICA';

  // Ajusta tamaño del título para que quede en el espacio disponible
  const titleFontSize = fitFontSize(ctx, titleText, s => `900 ${s}px ${FONT}`, titleAreaRight - PAD_X - 160, 50, 28);
  ctx.font = `900 ${titleFontSize}px ${FONT}`;
  ctx.fillStyle = t.text;
  ctx.fillText(titleText, PAD_X, 44);
  const titleW = ctx.measureText(titleText).width;

  // Separador vertical
  const sepX = PAD_X + titleW + 28;
  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sepX, 44);
  ctx.lineTo(sepX, 44 + titleFontSize);
  ctx.stroke();

  // Número — se ajusta al espacio que queda antes del logo
  const numMaxW = titleAreaRight - sepX - 30;
  const numFontSize = fitFontSize(ctx, c.numero, s => `900 ${s}px ${FONT}`, numMaxW, titleFontSize, 24);
  ctx.fillStyle = t.accent;
  ctx.font = `900 ${numFontSize}px ${FONT}`;
  ctx.fillText(c.numero, sepX + 22, 44);

  // Fecha
  ctx.fillStyle = t.text;
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText(`Fecha: ${c.fecha}`, PAD_X, 44 + titleFontSize + 14);

  // ── Divider horizontal ────────────────────────────────────────────────────
  const divY = 44 + titleFontSize + 14 + 28 + 14;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD_X, divY);
  ctx.lineTo(W - PAD_X, divY);
  ctx.stroke();

  // ── Bloque Alcance (izquierda) + Costo total (derecha) ────────────────────
  const blockY = divY + 24;
  const halfW = W / 2 - PAD_X - 20;

  // Alcance — izquierda
  ctx.fillStyle = t.text;
  ctx.font = `900 42px ${FONT}`;
  ctx.fillText('Alcance', PAD_X, blockY);

  ctx.font = `400 21px ${FONT}`;
  ctx.fillStyle = t.text;
  const alcanceLines = wrapText(ctx, c.alcance || '—', halfW).slice(0, 3);
  let ay = blockY + 52;
  for (const line of alcanceLines) {
    ctx.fillText(line, PAD_X, ay);
    ay += 24;
  }

  // Separador vertical central
  const midX = W / 2 + 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(midX, blockY);
  ctx.lineTo(midX, blockY + 140);
  ctx.stroke();

  // Costo total — derecha
  const rightX = midX + 30;
  const rightAreaW = W - PAD_X - rightX;

  // Etiqueta — ajusta fuente para no salirse del área
  const labelText = 'COSTO TOTAL DE REQUERIMIENTOS';
  const labelSize = fitFontSize(ctx, labelText, s => `700 ${s}px ${FONT}`, rightAreaW, 16, 10);
  ctx.fillStyle = t.text;
  ctx.font = `700 ${labelSize}px ${FONT}`;
  ctx.fillText(labelText, rightX, blockY + 8);

  // Monto + "COP" — reserva espacio del COP antes de ajustar el tamaño del monto
  const total = totalReal(c);
  const totalStr = formatCOP(total);
  const moneyFont = (size: number) => `900 ${size}px ${FONT}`;
  const copText = 'COP';
  const copSize = 38;
  ctx.font = `900 ${copSize}px ${FONT}`;
  const copW = ctx.measureText(copText).width + 16;
  const moneyMaxW = rightAreaW - copW - 8;
  const moneySize = fitFontSize(ctx, totalStr, moneyFont, moneyMaxW, 58, 28);
  ctx.font = moneyFont(moneySize);
  ctx.fillStyle = t.text;
  ctx.fillText(totalStr, rightX, blockY + 38);
  const tw = ctx.measureText(totalStr).width;
  ctx.fillStyle = t.accent;
  ctx.font = `900 ${copSize}px ${FONT}`;
  ctx.fillText(copText, rightX + tw + 14, blockY + 50 - Math.max(0, 58 - moneySize) * 0.3);
}

async function drawItemCard(
  ctx: CanvasRenderingContext2D,
  it: { iconKey: any; titulo: string; descripcion: string; valor: number },
  t: Template,
  y: number,
  h: number
) {
  const x = PAD_X;
  const w = W - PAD_X * 2;

  ctx.fillStyle = t.cardBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = t.cardBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Ícono
  try {
    const img = await loadIconImage(it.iconKey, t.iconColor, 2);
    const iSize = 56;
    ctx.drawImage(img, x + 34, y + (h - iSize) / 2, iSize, iSize);
  } catch { /* */ }

  // Separador ícono | contenido
  ctx.strokeStyle = t.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 118, y + 18);
  ctx.lineTo(x + 118, y + h - 18);
  ctx.stroke();

  // Bloque "Total" — derecha
  const totalW = 186;
  const totalX = x + w - totalW;
  ctx.strokeStyle = t.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(totalX, y + 18);
  ctx.lineTo(totalX, y + h - 18);
  ctx.stroke();

  ctx.fillStyle = t.cardMuted;
  ctx.font = `500 18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Total', totalX + totalW / 2, y + h / 2 - 24);

  const itemTotal = formatCOP(it.valor);
  const itemMoneyFont = (size: number) => `900 ${size}px ${FONT}`;
  const itemMoneySize = fitFontSize(ctx, itemTotal, itemMoneyFont, totalW - 26, 30, 18);
  ctx.fillStyle = t.cardText;
  ctx.font = itemMoneyFont(itemMoneySize);
  ctx.fillText(itemTotal, totalX + totalW / 2, y + h / 2 + 14);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Título y descripción
  const contentX = x + 142;
  const contentW = totalX - contentX - 24;

  ctx.fillStyle = t.cardText;
  ctx.font = `700 24px ${FONT}`;
  const titleLines = wrapText(ctx, it.titulo || '—', contentW);
  let ty = y + 24;
  for (const ln of titleLines) {
    ctx.fillText(ln, contentX, ty);
    ty += 29;
  }

  ctx.fillStyle = t.cardMuted;
  ctx.font = `400 17px ${FONT}`;
  const descLines = wrapText(ctx, it.descripcion || '', contentW).filter(Boolean);
  ty += 4;
  for (const ln of descLines) {
    ctx.fillText(ln, contentX, ty);
    ty += 22;
  }
}

async function drawTiempo(
  ctx: CanvasRenderingContext2D,
  c: Cotizacion,
  t: Template,
  y: number
) {
  const x = PAD_X;
  const w = W - PAD_X * 2;
  const h = TIEMPO_H;

  ctx.fillStyle = t.cardBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = t.cardBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  try {
    const img = await loadIconImage('clock', t.iconColor, 2);
    ctx.drawImage(img, x + 42, y + (h - 54) / 2, 54, 54);
  } catch { /* */ }

  ctx.strokeStyle = t.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 118, y + 20);
  ctx.lineTo(x + 118, y + h - 20);
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.fillStyle = t.cardText;
  ctx.font = `700 18px ${FONT}`;
  ctx.fillText('Tiempo de entrega', x + 138, y + 28);

  ctx.fillStyle = t.cardMuted;
  ctx.font = `400 16px ${FONT}`;
  const lines = wrapText(ctx, c.tiempoEntrega, w - 180).slice(0, 4);
  let ty = y + 62;
  for (const ln of lines) {
    ctx.fillText(ln, x + 138, ty);
    ty += 22;
  }
}

async function drawFooter(
  ctx: CanvasRenderingContext2D,
  c: Cotizacion,
  t: Template,
  y: number
) {
  const x = PAD_X;
  const w = W - PAD_X * 2;
  const h = FOOTER_H;

  ctx.fillStyle = t.footerBg;
  ctx.fillRect(x, y, w, h);

  const leftW = w * 0.30;

  // Firma
  if (c.branding.representante.firmaDataUrl) {
    try {
      const img = await loadImage(c.branding.representante.firmaDataUrl);
      const sig = trimImageWhitespace(img);
      const maxW = 240, maxH = 58;
      const r = sig.width / sig.height;
      let fw = maxW, fh = maxW / r;
      if (fh > maxH) { fh = maxH; fw = maxH * r; }
      ctx.drawImage(sig, x + 28, y + 16, fw, fh);
    } catch { /* */ }
  }

  ctx.strokeStyle = '#1A1A1A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 78);
  ctx.lineTo(x + leftW - 8, y + 78);
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.fillStyle = t.footerText;
  const nombreMaxW = leftW - 24;
  const nombreSize = fitFontSize(ctx, c.branding.representante.nombre, s => `800 ${s}px ${FONT}`, nombreMaxW, 16, 10);
  ctx.font = `800 ${nombreSize}px ${FONT}`;
  ctx.fillText(c.branding.representante.nombre, x + 12, y + 84);
  ctx.font = `500 13px ${FONT}`;
  ctx.fillStyle = '#555';
  ctx.fillText(`CC: ${c.branding.representante.cedula}`, x + 12, y + 106);

  // Divisor
  const sepX = x + leftW;
  ctx.strokeStyle = t.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sepX, y);
  ctx.lineTo(sepX, y + h - 4);
  ctx.stroke();

  // Términos y condiciones
  ctx.fillStyle = t.footerText;
  ctx.font = `800 17px ${FONT}`;
  ctx.fillText('Terminos y condiciones', sepX + 24, y + 10);

  ctx.font = `400 15px ${FONT}`;
  ctx.fillStyle = '#555';
  let ty = y + 42;
  for (const term of c.terminos.slice(0, 6)) {
    const lines = wrapText(ctx, term, w - leftW - 42).slice(0, 3);
    for (const ln of lines) {
      ctx.fillText(ln, sepX + 24, ty);
      ty += 20;
    }
  }
}

function drawContacto(
  ctx: CanvasRenderingContext2D,
  c: Cotizacion,
  t: Template,
  y: number
) {
  const k = c.branding.contacto;
  ctx.textBaseline = 'top';

  ctx.fillStyle = t.cardMuted || '#777';
  ctx.font = `500 14px ${FONT}`;
  ctx.fillText(`CEL: ${k.cel}`, PAD_X, y + 18);
  ctx.font = `800 14px ${FONT}`;
  ctx.fillText(`Email: ${k.email}`, PAD_X, y + 42);

  ctx.fillStyle = t.cardText || '#1A1A1A';
  ctx.font = `500 14px ${FONT}`;
  ctx.fillText(k.web, W / 2 - ctx.measureText(k.web).width / 2, y + 18);
  ctx.font = `800 14px ${FONT}`;
  ctx.fillText(k.web, W / 2 - ctx.measureText(k.web).width / 2, y + 42);

  ctx.fillStyle = t.cardText || '#1A1A1A';
  ctx.font = `700 14px ${FONT}`;
  const ciudadStr = `${k.ciudad}`;
  ctx.fillText(ciudadStr, W - PAD_X - ctx.measureText(ciudadStr).width, y + 18);
  ctx.font = `800 14px ${FONT}`;
  ctx.fillText(k.pais, W - PAD_X - ctx.measureText(k.pais).width, y + 42);
}
