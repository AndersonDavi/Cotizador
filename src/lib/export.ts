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
 * PDF para compartir (WhatsApp, correo): una página con la imagen del documento.
 * El PDF con texto seleccionable solo sale del diálogo de impresión, que no entrega un
 * archivo; este se arma aquí mismo, con la imagen en JPEG, y se ve igual.
 */
export async function pdfParaCompartir(c: Cotizacion): Promise<File> {
  const img = new Image();
  img.src = await pngDataUrl(c);
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
  // El PNG sale a escala 2 y 1 px CSS = 0,75 pt: misma medida que el PDF del CLI
  const pdf = pdfConImagen(jpeg, canvas.width, canvas.height, (canvas.width / 2) * 0.75, (canvas.height / 2) * 0.75, `Cotización ${c.numero}`);
  return new File([pdf], `COTIZACION_${c.numero}.pdf`, { type: 'application/pdf' });
}

/** Texto para el diccionario /Info en UTF-16BE (admite tildes y ñ). */
const pdfTexto = (s: string) => '<FEFF' + [...s].map((ch) => ch.charCodeAt(0).toString(16).padStart(4, '0')).join('').toUpperCase() + '>';

/** PDF mínimo de una página con una imagen JPEG que la llena. */
function pdfConImagen(jpeg: Uint8Array, w: number, h: number, wPt: number, hPt: number, titulo: string): Blob {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const xref: number[] = [];
  let pos = 0;
  const add = (x: string | Uint8Array) => { const b = typeof x === 'string' ? enc.encode(x) : x; partes.push(b); pos += b.length; };
  const obj = (n: number, ...cuerpo: (string | Uint8Array)[]) => { xref[n] = pos; add(`${n} 0 obj\n`); cuerpo.forEach(add); add('\nendobj\n'); };
  const f = (n: number) => String(+n.toFixed(2));
  const contenido = `q ${f(wPt)} 0 0 ${f(hPt)} 0 0 cm /Im0 Do Q`;
  add('%PDF-1.4\n%âãÏÓ\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(wPt)} ${f(hPt)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
  obj(4, `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
  obj(5, `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, '\nendstream');
  obj(6, `<< /Title ${pdfTexto(titulo)} /Producer (Cotizador) >>`);
  const inicio = pos;
  add(`xref\n0 7\n0000000000 65535 f \n${[1, 2, 3, 4, 5, 6].map((n) => `${String(xref[n]).padStart(10, '0')} 00000 n \n`).join('')}`);
  add(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${inicio}\n%%EOF\n`);
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
