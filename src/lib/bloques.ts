// Bloques que comparten todas las plantillas: opciones para comparar, plan de pagos y costos
// de terceros. Solo salen si la cotización tiene esos datos: sin ellos el documento queda igual.
// Toman los colores de variables --bq-* que define cada plantilla (layouts.ts y la clásica en doc.ts).
// Las reglas van con ".doc" delante para ganarle a los th/td genéricos de cada plantilla.

import {
  conOpciones, opcionRecomendada, totalesOpcion, gruposItems, valorItem, valoresHitos, valorTercero, formatCOP,
  PERIODOS, NOTA_TERCEROS, type Cotizacion, type Item,
} from './state';
import { escapeHtml as e } from './esc';

export const BLOQUES_CSS = `
.doc .bq{margin-top:40px;color:var(--bq-ink);font-size:15px;line-height:1.4;text-align:left}
.doc .bq-t{font-size:15px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 12px}
.doc .bq-t small{font-weight:400;letter-spacing:0;text-transform:none;color:var(--bq-muted);font-size:14px}
.doc table.bq-tab{width:100%;border-collapse:collapse;border:0;margin:0}
.doc .bq-tab th{background:var(--bq-head-bg);color:var(--bq-head-fg);font-weight:600;font-size:13px;text-align:left;padding:10px 14px;vertical-align:bottom;border:0;text-transform:none;letter-spacing:0}
.doc .bq-tab td{padding:10px 14px;border:0;border-bottom:1px solid var(--bq-line);vertical-align:top;background:transparent;color:inherit;font-size:15px;font-weight:400;text-align:left;width:auto}
.doc .bq-tab .bq-r{text-align:right;white-space:nowrap}
.doc .bq-tab .bq-c{text-align:center;width:170px;vertical-align:middle}
.doc .bq-tab td.bq-rec{background:var(--bq-soft)}
.doc .bq-tab th.bq-rec{background:var(--bq-acc);color:var(--bq-acc-fg)}
.doc .bq-tab th b{display:block;font-size:14px;font-weight:700}
.doc .bq-tab th small{display:block;font-weight:400;font-size:12px;opacity:.85;margin-top:2px}
.doc .bq-badge{display:block;margin-bottom:4px;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.doc .bq-tab td b{font-weight:600;display:inline}
.doc .bq-tab td small{display:block;color:var(--bq-muted);font-size:13px;margin-top:2px}
.doc .bq-tab tr.bq-sub td:first-child{padding-left:30px;font-size:14px}
.doc .bq-tab tfoot td{font-weight:700;border-bottom:0;border-top:2px solid var(--bq-ink)}
.doc .bq-ok{display:inline-block;width:20px;height:20px;vertical-align:middle}
.doc .bq-no{color:var(--bq-muted)}
.doc .bq-parcial{font-size:13px;font-weight:600}
.doc .bq-nota{font-size:13px;color:var(--bq-muted);margin-top:10px}
`;

const CHECK = '<svg class="bq-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const NO = '<span class="bq-no">—</span>';

const pctTxt = (n: number) => `${String(Math.round(n * 100) / 100).replace('.', ',')} %`;

/** Tabla comparativa: filas = fases (o ítems sueltos), columnas = opciones, y el total de cada una. */
export function bloqueOpciones(c: Cotizacion): string {
  if (!conOpciones(c)) return '';
  const ops = c.opciones!;
  const rec = opcionRecomendada(c);
  const sets = ops.map((o) => new Set(o.items));
  const recCls = (i: number) => (ops[i] === rec ? ' bq-rec' : '');

  // Fases seguidas como en el documento; los ítems sin fase del principio van uno por uno
  const g = gruposItems(c.items);
  const runs: { nombre: string | null; items: Item[] }[] = [];
  let run: { nombre: string | null; items: Item[] } | null = null;
  c.items.forEach((it, i) => {
    if (g[i]) { run = { nombre: g[i]!.nombre, items: [] }; runs.push(run); }
    if (run) run.items.push(it);
    else runs.push({ nombre: null, items: [it] });
  });

  const celdaItem = (it: Item) => sets.map((s, i) => `<td class="bq-c${recCls(i)}">${s.has(it.id) ? CHECK : NO}</td>`).join('');
  const filas = runs.map((r) => {
    if (r.nombre == null) {
      const it = r.items[0];
      return `<tr><td>${e(it.titulo || '—')}<small>${formatCOP(valorItem(it))}</small></td>${celdaItem(it)}</tr>`;
    }
    const n = r.items.length;
    const cuenta = sets.map((s) => r.items.filter((it) => s.has(it.id)).length);
    const sub = r.items.reduce((a, it) => a + valorItem(it), 0);
    const celdas = cuenta.map((k, i) => `<td class="bq-c${recCls(i)}">${k === n ? CHECK : k === 0 ? NO : `<span class="bq-parcial">Parcial · ${k} de ${n}</span>`}</td>`).join('');
    const detalle = cuenta.some((k) => k > 0 && k < n)
      ? r.items.map((it) => `<tr class="bq-sub"><td>${e(it.titulo || '—')}<small>${formatCOP(valorItem(it))}</small></td>${celdaItem(it)}</tr>`).join('')
      : '';
    return `<tr><td><b>${e(r.nombre)}</b><small>${formatCOP(sub)}</small></td>${celdas}</tr>${detalle}`;
  }).join('');

  const cab = ops.map((o, i) => `<th class="bq-c${recCls(i)}">${o === rec ? '<span class="bq-badge">Recomendada</span>' : ''}<b>${e(o.nombre)}</b>${o.descripcion?.trim() ? `<small>${e(o.descripcion)}</small>` : ''}</th>`).join('');
  const pie = ops.map((o, i) => `<td class="bq-c${recCls(i)}">${formatCOP(totalesOpcion(c, o).total)}</td>`).join('');
  return `<section class="bq bq-opciones"><div class="bq-t">Opciones <small>elige la que mejor se ajuste</small></div>
<table class="bq-tab"><thead><tr><th>Qué incluye</th>${cab}</tr></thead><tbody>${filas}</tbody><tfoot><tr><td>Total</td>${pie}</tr></tfoot></table></section>`;
}

/** Plan de pagos por hitos (reemplaza anticipo y saldo). */
export function bloqueHitos(c: Cotizacion): string {
  const v = valoresHitos(c);
  if (!v.length) return '';
  const total = v.reduce((a, x) => a + x.valor, 0);
  const filas = v.map(({ hito: h, pct, valor }) =>
    `<tr><td><b>${e(h.nombre)}</b>${h.grupo?.trim() ? `<small>${e(h.grupo)}</small>` : ''}</td><td>${e(h.condicion ?? '')}</td><td class="bq-r">${pctTxt(pct)}</td><td class="bq-r">${formatCOP(valor)}</td></tr>`).join('');
  const rec = conOpciones(c) ? opcionRecomendada(c) : undefined;
  return `<section class="bq bq-hitos"><div class="bq-t">Plan de pagos</div>
<table class="bq-tab"><thead><tr><th>Pago</th><th>Cuándo</th><th class="bq-r">%</th><th class="bq-r">Valor</th></tr></thead><tbody>${filas}</tbody>
<tfoot><tr><td colspan="2">Total</td><td class="bq-r">${pctTxt(v.reduce((a, x) => a + x.pct, 0))}</td><td class="bq-r">${formatCOP(total)}</td></tr></tfoot></table>
${rec ? `<p class="bq-nota">Valores de la opción ${e(rec.nombre)}; los porcentajes se aplican al total de la opción que se elija.</p>` : ''}</section>`;
}

/** Costos que paga el cliente a otros proveedores. Informativos: no suman al total. */
export function bloqueTerceros(c: Cotizacion): string {
  const l = (c.costosTerceros ?? []).filter((x) => x.concepto?.trim());
  if (!l.length) return '';
  const filas = l.map((x) => {
    const v = valorTercero(x, c.trm);
    const valor = v.valor ? `${e(v.valor)}${v.cop ? `<small>${e(v.cop)}</small>` : ''}` : e(x.nota ?? '—');
    return `<tr><td><b>${e(x.concepto)}</b>${v.valor && x.nota?.trim() ? `<small>${e(x.nota)}</small>` : ''}</td><td>${e(x.proveedor ?? '')}</td><td class="bq-r">${valor}</td><td>${x.periodo ? PERIODOS[x.periodo] ?? '' : ''}</td></tr>`;
  }).join('');
  const usd = l.some((x) => x.moneda === 'USD' && x.valor != null);
  return `<section class="bq bq-terceros"><div class="bq-t">Costos de terceros <small>(no incluidos en el valor)</small></div>
<table class="bq-tab"><thead><tr><th>Concepto</th><th>Proveedor</th><th class="bq-r">Valor</th><th>Periodicidad</th></tr></thead><tbody>${filas}</tbody></table>
${usd && c.trm ? `<p class="bq-nota">Equivalencias con una TRM de referencia de ${formatCOP(c.trm)} por dólar.</p>` : ''}
<p class="bq-nota">${e(c.notaTerceros?.trim() || NOTA_TERCEROS)}</p></section>`;
}

/** Lo que va antes de los totales (opciones) y después (plan de pagos y costos de terceros). */
export function bloques(c: Cotizacion): { antes: string; despues: string } {
  return { antes: bloqueOpciones(c), despues: bloqueHitos(c) + bloqueTerceros(c) };
}

/** Los bloques con el margen lateral de la plantilla (vacío si no hay nada). */
export const envolver = (html: string, estilo = '') => (html ? `<div class="bq-wrap"${estilo ? ` style="${estilo}"` : ''}>${html}</div>` : '');
