import {
  renderCotizacionHtml, renderCotizacionMarkdown, renderCuentaCobroHtml,
  cuentaDesdeCotizacion, FONT_SPECS, fontKey, type FontUrls,
} from './doc';
import { today, type Cotizacion } from './state';
import r400 from '@fontsource/roboto/files/roboto-latin-400-normal.woff2?url';
import r500 from '@fontsource/roboto/files/roboto-latin-500-normal.woff2?url';
import r700 from '@fontsource/roboto/files/roboto-latin-700-normal.woff2?url';
import r800 from '@fontsource/roboto/files/roboto-latin-800-normal.woff2?url';
import r900 from '@fontsource/roboto/files/roboto-latin-900-normal.woff2?url';
import p400 from '@fontsource/poppins/files/poppins-latin-400-normal.woff2?url';
import p500 from '@fontsource/poppins/files/poppins-latin-500-normal.woff2?url';
import p600 from '@fontsource/poppins/files/poppins-latin-600-normal.woff2?url';
import p700 from '@fontsource/poppins/files/poppins-latin-700-normal.woff2?url';
import p800 from '@fontsource/poppins/files/poppins-latin-800-normal.woff2?url';
import pf400 from '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2?url';
import pf700 from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2?url';
import pf900 from '@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff2?url';

const FONTS: FontUrls = {
  'Roboto:400': r400, 'Roboto:500': r500, 'Roboto:700': r700, 'Roboto:800': r800, 'Roboto:900': r900,
  'Poppins:400': p400, 'Poppins:500': p500, 'Poppins:600': p600, 'Poppins:700': p700, 'Poppins:800': p800,
  'Playfair Display:400': pf400, 'Playfair Display:700': pf700, 'Playfair Display:900': pf900,
};

export function cotizacionHtml(c: Cotizacion): string {
  return renderCotizacionHtml(c, FONTS);
}

export type DocSize = { width: number; height: number };

/** Carga el HTML en el iframe y espera a que el documento termine su layout. */
export async function loadIntoFrame(frame: HTMLIFrameElement, html: string): Promise<DocSize> {
  await new Promise<void>((resolve) => {
    frame.onload = () => resolve();
    frame.srcdoc = html;
  });
  return await (frame.contentWindow as any).__docReady;
}

function offscreenFrame(width: number): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:1000px;border:0;visibility:hidden;`;
  document.body.appendChild(frame);
  return frame;
}

/**
 * Imprime el documento: en el diálogo, "Guardar como PDF" da un PDF vectorial
 * (texto seleccionable, links activos) del tamaño exacto del documento.
 */
async function printHtml(html: string, title: string, width: number): Promise<void> {
  const frame = offscreenFrame(width);
  try {
    await loadIntoFrame(frame, html);
    const prev = document.title;
    document.title = title; // nombre sugerido del archivo en "Guardar como PDF"
    frame.contentWindow!.focus();
    frame.contentWindow!.print();
    document.title = prev;
  } finally {
    setTimeout(() => frame.remove(), 1000);
  }
}

export async function exportPdf(c: Cotizacion): Promise<void> {
  await printHtml(cotizacionHtml(c), `COTIZACION_${c.numero}`, 1080);
}

export async function printCuentaCobro(c: Cotizacion): Promise<void> {
  const html = renderCuentaCobroHtml(cuentaDesdeCotizacion(c, today()), FONTS);
  await printHtml(html, `CUENTA-COBRO-COTIZACION-${c.numero}`, 816);
}

let inlineFontsCache: Promise<FontUrls> | null = null;

/** Las mismas fuentes como data URL, para que el SVG del PNG no dependa de la red. */
function inlineFonts(): Promise<FontUrls> {
  inlineFontsCache ??= Promise.all(Object.entries(FONTS).map(async ([k, url]) => {
    const blob = await fetch(url).then((r) => r.blob());
    const data = await new Promise<string>((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(blob); });
    return [k, data] as const;
  })).then((pairs) => Object.fromEntries(pairs));
  return inlineFontsCache;
}

/**
 * PNG con el motor del navegador: el documento ya maquetado se serializa dentro de un
 * SVG <foreignObject> y se pinta en un canvas. Sale igual a la vista previa.
 */
async function rasterize(doc: Document, size: DocSize, scale: number): Promise<string> {
  const root = doc.documentElement.cloneNode(true) as HTMLElement;
  root.querySelectorAll('script').forEach((s) => s.remove());
  const xhtml = new XMLSerializer().serializeToString(root);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}"><foreignObject x="0" y="0" width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  await new Promise((r) => setTimeout(r, 60));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size.width * scale);
  canvas.height = Math.round(size.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, size.width, size.height);
  return canvas.toDataURL('image/png'); // lanza si el navegador marca el canvas como "tainted"
}

/** PNG del documento como data URL (escala 2). */
export async function pngDataUrl(c: Cotizacion): Promise<string> {
  const frame = offscreenFrame(1080);
  try {
    const size = await loadIntoFrame(frame, renderCotizacionHtml(c, await inlineFonts()));
    frame.style.height = `${size.height}px`;
    try {
      return await rasterize(frame.contentDocument!, size, 2);
    } catch {
      // Navegadores que no permiten leer un canvas con foreignObject (Safari): html2canvas
      const { default: html2canvas } = await import('html2canvas');
      const doc = frame.contentDocument!.querySelector('.doc') as HTMLElement;
      return (await html2canvas(doc, { scale: 2, backgroundColor: '#ffffff', logging: false })).toDataURL('image/png');
    }
  } finally {
    frame.remove();
  }
}

export async function exportPng(c: Cotizacion): Promise<void> {
  download(await pngDataUrl(c), `COTIZACION_${c.numero}.png`);
}

/**
 * Comparte la imagen con el menú del sistema (WhatsApp, correo, Drive…).
 * Devuelve false si el navegador no permite compartir archivos (entonces se descarga).
 */
export async function sharePng(c: Cotizacion, text: string): Promise<boolean> {
  const blob = await (await fetch(await pngDataUrl(c))).blob();
  const file = new File([blob], `COTIZACION_${c.numero}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text, title: `Cotización ${c.numero}` }); } catch { /* cancelado */ }
    return true;
  }
  download(URL.createObjectURL(blob), file.name);
  return false;
}

/**
 * PDF directo (sin diálogo de imprimir): la imagen del documento y encima una capa de texto
 * invisible en la posición de cada palabra, como un PDF escaneado. Se ve igual al documento,
 * el texto se selecciona, se copia y se busca, y los enlaces (correo, web) funcionan.
 */
export async function pdfParaCompartir(c: Cotizacion): Promise<File> {
  return pdfDeHtml(renderCotizacionHtml(c, await inlineFonts()), 1080, `Cotización ${c.numero}`, `COTIZACION_${c.numero}.pdf`);
}

/** La cuenta de cobro como PDF directo (tamaño carta), igual que la cotización. */
export async function pdfCuentaCobro(c: Cotizacion): Promise<File> {
  const html = renderCuentaCobroHtml(cuentaDesdeCotizacion(c, today()), await inlineFonts());
  return pdfDeHtml(html, 816, `Cuenta de cobro ${c.numero}`, `CUENTA-COBRO-COTIZACION-${c.numero}.pdf`);
}

async function pdfDeHtml(html: string, ancho: number, titulo: string, nombre: string): Promise<File> {
  const frame = offscreenFrame(ancho);
  try {
    const size = await loadIntoFrame(frame, html);
    frame.style.height = `${size.height}px`;
    const doc = frame.contentDocument!;
    const root = doc.querySelector('.doc') as HTMLElement;
    const capa = capaDeTexto(doc, root);
    let png: string;
    try { png = await rasterize(doc, size, 2); }
    catch {
      const { default: html2canvas } = await import('html2canvas');
      png = (await html2canvas(root, { scale: 2, backgroundColor: '#ffffff', logging: false })).toDataURL('image/png');
    }
    const img = new Image();
    img.src = png;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo crear la imagen'))), 'image/jpeg', 0.9));
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    const pdf = armarPdf({ jpeg, w: canvas.width, h: canvas.height, docW: size.width, docH: size.height, titulo, ...capa });
    return new File([pdf], nombre, { type: 'application/pdf' });
  } finally {
    frame.remove();
  }
}

type Trozo = { t: string; x: number; y: number; w: number; h: number; fs: number };
type Enlace = { url: string; x: number; y: number; w: number; h: number };

/** Palabras visibles del documento agrupadas por renglón, con su caja en px CSS, y los enlaces. */
function capaDeTexto(doc: Document, root: HTMLElement): { trozos: Trozo[]; enlaces: Enlace[] } {
  const win = doc.defaultView!;
  const base = root.getBoundingClientRect();
  const range = doc.createRange();
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const trozos: Trozo[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const txt = n.nodeValue ?? '';
    if (!txt.trim()) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style')) continue;
    const cs = win.getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    const fs = parseFloat(cs.fontSize) || 14;
    const tt = cs.textTransform;
    let cur: Trozo | null = null;
    for (const m of txt.matchAll(/\S+/g)) {
      range.setStart(n, m.index!);
      range.setEnd(n, m.index! + m[0].length);
      const r = range.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const palabra = tt === 'uppercase' ? m[0].toUpperCase() : tt === 'lowercase' ? m[0].toLowerCase() : m[0];
      const x = r.left - base.left, y = r.top - base.top;
      if (cur && Math.abs(cur.y - y) < fs * 0.5 && x >= cur.x + cur.w - 1) {
        cur.t += ' ' + palabra;
        cur.w = x + r.width - cur.x;
        cur.h = Math.max(cur.h, r.height);
      } else {
        if (cur) trozos.push(cur);
        cur = { t: palabra, x, y, w: r.width, h: r.height, fs };
      }
    }
    if (cur) trozos.push(cur);
  }
  const enlaces: Enlace[] = [];
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    const url = a.getAttribute('href') ?? '';
    if (!/^(https?:|mailto:|tel:)/i.test(url)) return;
    const r = a.getBoundingClientRect();
    if (r.width && r.height) enlaces.push({ url, x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
  });
  return { trozos, enlaces };
}

/** Texto para el diccionario /Info en UTF-16BE (admite tildes y ñ). */
const pdfTexto = (s: string) => '<FEFF' + [...s].map((ch) => ch.charCodeAt(0).toString(16).padStart(4, '0')).join('').toUpperCase() + '>';

/** Texto en WinAnsi (lo que entiende Helvetica sin incrustar fuentes) como cadena hex. */
const WIN: Record<string, number> = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '™': 0x99 };
function winAnsiHex(s: string): string {
  let out = '';
  for (const ch of s.replace(/→/g, '->').replace(/[✓✔]/g, 'v')) {
    const c = ch.codePointAt(0)!;
    const b = WIN[ch] ?? (c === 0xa0 ? 0x20 : (c >= 0x20 && c <= 0x7e) || (c >= 0xa1 && c <= 0xff) ? c : 0x3f);
    out += b.toString(16).padStart(2, '0');
  }
  return out;
}

/** PDF de una página: imagen JPEG que la llena + texto invisible (modo 3) + enlaces. */
function armarPdf(p: { jpeg: Uint8Array; w: number; h: number; docW: number; docH: number; titulo: string; trozos: Trozo[]; enlaces: Enlace[] }): Blob {
  const PT = 0.75; // 1 px CSS = 0,75 pt (misma medida que el PDF del CLI)
  const W = p.docW * PT, H = p.docH * PT;
  const f = (n: number) => String(+n.toFixed(2));
  const medir = document.createElement('canvas').getContext('2d')!; // Arial mide igual que Helvetica

  let texto = '';
  for (const t of p.trozos) {
    medir.font = `${t.fs}px Arial`;
    const ancho = medir.measureText(t.t).width || 1;
    const tz = Math.max(20, Math.min(400, (t.w / ancho) * 100)); // estira el texto a la caja real
    const linea = t.y + (t.h - t.fs) / 2 + t.fs * 0.8; // línea base aproximada
    texto += `BT 3 Tr /F1 ${f(t.fs * PT)} Tf ${f(tz)} Tz 1 0 0 1 ${f(t.x * PT)} ${f(H - linea * PT)} Tm <${winAnsiHex(t.t)}> Tj ET\n`;
  }
  const contenido = `q ${f(W)} 0 0 ${f(H)} 0 0 cm /Im0 Do Q\n${texto}`;

  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const xref: number[] = [];
  let pos = 0;
  const add = (x: string | Uint8Array) => { const b = typeof x === 'string' ? enc.encode(x) : x; partes.push(b); pos += b.length; };
  const obj = (n: number, ...cuerpo: (string | Uint8Array)[]) => { xref[n] = pos; add(`${n} 0 obj\n`); cuerpo.forEach(add); add('\nendobj\n'); };
  const lit = (s: string) => `(${s.replace(/[\\()]/g, (m) => '\\' + m).replace(/[^\x20-\x7e]/g, (m) => encodeURI(m))})`;

  const annots = p.enlaces.map((_, i) => 8 + i);
  const contenidoBytes = enc.encode(contenido);
  add('%PDF-1.4\n%âãÏÓ\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] /Resources << /XObject << /Im0 5 0 R >> /Font << /F1 7 0 R >> >> /Contents 4 0 R${annots.length ? ` /Annots [${annots.map((n) => `${n} 0 R`).join(' ')}]` : ''} >>`);
  obj(4, `<< /Length ${contenidoBytes.length} >>\nstream\n`, contenidoBytes, '\nendstream');
  obj(5, `<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`, p.jpeg, '\nendstream');
  obj(6, `<< /Title ${pdfTexto(p.titulo)} /Producer (Cotizador) >>`);
  obj(7, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  p.enlaces.forEach((e, i) => {
    const x1 = e.x * PT, y1 = H - (e.y + e.h) * PT, x2 = (e.x + e.w) * PT, y2 = H - e.y * PT;
    obj(8 + i, `<< /Type /Annot /Subtype /Link /Rect [${f(x1)} ${f(y1)} ${f(x2)} ${f(y2)}] /Border [0 0 0] /A << /S /URI /URI ${lit(e.url)} >> >>`);
  });
  const total = 8 + p.enlaces.length;
  const inicio = pos;
  add(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let n = 1; n < total; n++) add(`${String(xref[n]).padStart(10, '0')} 00000 n \n`);
  add(`trailer\n<< /Size ${total} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${inicio}\n%%EOF\n`);
  return new Blob(partes as BlobPart[], { type: 'application/pdf' });
}

/** Descarga (o comparte en el celular) un archivo de texto. */
export async function saveTextFile(text: string, name: string, type = 'application/json'): Promise<void> {
  const file = new File([text], name, { type });
  if (window.matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch { /* cancelado: descarga */ }
  }
  downloadText(text, type, name);
}

function download(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

function downloadText(text: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── Markdown export ─────────────────────────────────────────────────────────

export function exportMarkdown(c: Cotizacion): void {
  downloadText(renderCotizacionMarkdown(c), 'text/markdown;charset=utf-8', `COTIZACION_${c.numero}.md`);
}

// ── JSON export / import ────────────────────────────────────────────────────

export function exportJson(c: Cotizacion): void {
  downloadText(JSON.stringify(c, null, 2), 'application/json', `COTIZACION_${c.numero}.json`);
}

export function importJsonFromFile(file: File): Promise<Cotizacion> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result)) as Cotizacion;
        // Validación mínima de campos requeridos
        if (!raw.numero || !Array.isArray(raw.items) || !raw.branding) {
          reject(new Error('El archivo no es una cotización válida.'));
          return;
        }
        resolve(raw);
      } catch {
        reject(new Error('El archivo no es un JSON válido.'));
      }
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });
}

// Si se agrega una fuente a FONT_SPECS hay que importarla arriba también.
if (import.meta.env.DEV) {
  const missing = FONT_SPECS.filter((f) => !FONTS[fontKey(f)]).map(fontKey);
  if (missing.length) console.warn('Fuentes sin importar en export.ts:', missing);
}
