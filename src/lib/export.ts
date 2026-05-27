import { buildExportCanvas } from './render';
import { formatCOP, totalReal, type Cotizacion } from './state';

const CONTACT_H = 88;
const PAGE_BOTTOM_PAD = 24;

function normalizeWebUrl(web: string): string {
  if (!web) return '';
  return /^https?:\/\//i.test(web) ? web : `https://${web}`;
}


function addContactLinks(pdf: any, c: Cotizacion, canvas: HTMLCanvasElement): void {
  const contactY = canvas.height - CONTACT_H - PAGE_BOTTOM_PAD;
  const web = c.branding.contacto.web;
  const webUrl = normalizeWebUrl(web);
  const email = c.branding.contacto.email;
  const webW = Math.max(110, web.length * 7.2);
  const webX = canvas.width / 2 - webW / 2;

  if (email) {
    pdf.link(56, contactY + 40, Math.max(220, email.length * 7.2), 18, {
      url: `mailto:${email}`,
    });
  }

  if (webUrl) {
    pdf.link(webX, contactY + 16, webW, 18, { url: webUrl });
    pdf.link(webX, contactY + 40, webW, 18, { url: webUrl });
  }
}

export async function exportPdf(c: Cotizacion): Promise<void> {
  const canvas = await buildExportCanvas(c);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
    hotfixes: ['px_scaling'],
  });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, canvas.width, canvas.height);
  addContactLinks(pdf, c, canvas);
  pdf.save(`COTIZACION_${c.numero}.pdf`);
}

export async function exportPng(c: Cotizacion): Promise<void> {
  const canvas = await buildExportCanvas(c);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `COTIZACION_${c.numero}.png`;
  a.click();
}

// ── Markdown export ─────────────────────────────────────────────────────────

export function exportMarkdown(c: Cotizacion): void {
  const total = totalReal(c);
  const lines: string[] = [];

  lines.push(`# Propuesta Económica — ${c.numero}`);
  lines.push(`**Fecha:** ${c.fecha}`);
  lines.push('');

  lines.push(`## Alcance`);
  lines.push(c.alcance || '_Sin especificar_');
  lines.push('');

  lines.push(`## Costo total de requerimientos`);
  lines.push(`### ${formatCOP(total)} COP`);
  lines.push('');

  lines.push(`## Ítems`);
  lines.push('');
  for (const it of c.items) {
    lines.push(`### ${it.titulo || '_(sin título)_'}`);
    if (it.descripcion) lines.push(it.descripcion);
    lines.push('');
    lines.push(`**Total: ${formatCOP(it.valor)}**`);
    lines.push('');
  }

  lines.push(`## Tiempo de entrega`);
  lines.push(c.tiempoEntrega);
  lines.push('');

  lines.push(`## Términos y condiciones`);
  for (const t of c.terminos) lines.push(`- ${t}`);
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`**${c.branding.representante.nombre}**  `);
  lines.push(`CC: ${c.branding.representante.cedula}`);
  lines.push('');
  lines.push(c.branding.banco);
  lines.push('');
  const k = c.branding.contacto;
  lines.push(`CEL: ${k.cel} · Email: ${k.email} · Web: ${k.web}  `);
  lines.push(`${k.ciudad}, ${k.pais}`);

  const md = lines.join('\n');
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `COTIZACION_${c.numero}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ── JSON export / import ────────────────────────────────────────────────────

export function exportJson(c: Cotizacion): void {
  const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `COTIZACION_${c.numero}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
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

export async function renderPreview(target: HTMLCanvasElement, c: Cotizacion): Promise<void> {
  const off = await buildExportCanvas(c);
  target.width = off.width;
  target.height = off.height;
  const ctx = target.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(off, 0, 0);
}
