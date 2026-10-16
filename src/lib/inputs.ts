// Campos con máscara: dinero (1.160.000,50) y fecha (dd-mm-aaaa con calendario).

import { parseFecha } from './doc';

// ── Dinero ───────────────────────────────────────────────────────────────────

/** 1160000.5 → "1.160.000,5" */
export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '';
  const [ent, dec] = String(Math.abs(Math.round(n * 100) / 100)).split('.');
  const grouped = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + grouped + (dec ? ',' + dec : '');
}

/** "1.160.000,5" → 1160000.5 */
export function parseMoney(s: string): number {
  const clean = (s || '').replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

/** Reescribe el texto con la máscara conservando la posición del cursor. */
export function maskMoneyText(raw: string, caret: number): { text: string; caret: number } {
  // Dígitos (y la coma decimal) que había antes del cursor
  const before = raw.slice(0, caret).replace(/[^\d,]/g, '');
  let [ent, dec] = raw.replace(/[^\d,]/g, '').split(',');
  ent = (ent || '').replace(/^0+(?=\d)/, '');
  const hasComma = raw.includes(',');
  dec = (dec ?? '').slice(0, 2);
  const text = (ent ? ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : (hasComma ? '0' : '')) + (hasComma ? ',' + dec : '');
  // Ubica el cursor después del mismo número de dígitos/coma
  let count = 0, pos = 0;
  const target = before.replace(/^0+(?=\d)/, '').length;
  while (pos < text.length && count < target) {
    if (/[\d,]/.test(text[pos])) count++;
    pos++;
  }
  return { text, caret: pos };
}

/**
 * Convierte un <input> en campo de dinero: texto con máscara, prefijo $ y botones −/+.
 * `step` con flechas o botones; Shift multiplica por 10.
 */
export function moneyField(input: HTMLInputElement, get: () => number, set: (n: number) => void, step = 10000) {
  input.type = 'text';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.classList.add('money-input');
  const wrap = document.createElement('span');
  wrap.className = 'money';
  input.replaceWith(wrap);
  const minus = Object.assign(document.createElement('button'), { type: 'button', className: 'step', textContent: '−', title: `Restar ${formatMoney(step)}` });
  const plus = Object.assign(document.createElement('button'), { type: 'button', className: 'step', textContent: '+', title: `Sumar ${formatMoney(step)}` });
  minus.setAttribute('aria-label', 'Restar');
  plus.setAttribute('aria-label', 'Sumar');
  const prefix = Object.assign(document.createElement('span'), { className: 'prefix', textContent: '$' });
  wrap.append(prefix, input, minus, plus);

  const paint = () => { input.value = formatMoney(get()); };
  const bump = (dir: 1 | -1, big: boolean) => {
    const v = Math.max(0, get() + dir * step * (big ? 10 : 1));
    set(v);
    paint();
  };
  input.addEventListener('input', () => {
    const { text, caret } = maskMoneyText(input.value, input.selectionStart ?? input.value.length);
    input.value = text;
    input.setSelectionRange(caret, caret);
    set(parseMoney(text));
  });
  input.addEventListener('blur', paint);
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowUp') { ev.preventDefault(); bump(1, ev.shiftKey); }
    if (ev.key === 'ArrowDown') { ev.preventDefault(); bump(-1, ev.shiftKey); }
  });
  minus.addEventListener('click', (ev) => bump(-1, ev.shiftKey));
  plus.addEventListener('click', (ev) => bump(1, ev.shiftKey));
  paint();
  return { paint };
}

// ── Fecha ────────────────────────────────────────────────────────────────────

/** "15102026" → "15-10-2026" mientras se escribe. */
function maskDate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
}

const CAL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

/** dd-mm-aaaa con máscara y botón de calendario (usa el selector nativo solo para elegir). */
export function dateField(input: HTMLInputElement, onChange: (v: string) => void) {
  input.inputMode = 'numeric';
  input.autocomplete = 'off';
  input.maxLength = 10;
  const wrap = document.createElement('span');
  wrap.className = 'with-btn';
  input.replaceWith(wrap);
  const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'icon-only', title: 'Elegir en el calendario', innerHTML: CAL });
  btn.setAttribute('aria-label', 'Abrir calendario');
  const hidden = Object.assign(document.createElement('input'), { type: 'date', className: 'sr-only', tabIndex: -1 });
  hidden.setAttribute('aria-hidden', 'true');
  wrap.append(input, btn, hidden);

  // Incompleta (fuera del campo) o fecha imposible → borde rojo
  const validate = () => {
    const v = input.value;
    const f = parseFecha(v);
    const ok = !!f && f.m >= 1 && f.m <= 12 && f.d >= 1 && f.d <= 31;
    input.classList.toggle('invalid', !!v && (v.length === 10 ? !ok : document.activeElement !== input));
  };
  input.addEventListener('input', () => {
    input.value = maskDate(input.value);
    validate();
    onChange(input.value);
  });
  input.addEventListener('blur', validate);
  btn.addEventListener('click', () => {
    const f = parseFecha(input.value);
    hidden.value = f ? `${f.y}-${String(f.m).padStart(2, '0')}-${String(f.d).padStart(2, '0')}` : '';
    try { (hidden as any).showPicker(); } catch { hidden.click(); }
  });
  hidden.addEventListener('change', () => {
    const f = parseFecha(hidden.value);
    if (!f) return;
    input.value = `${String(f.d).padStart(2, '0')}-${String(f.m).padStart(2, '0')}-${f.y}`;
    validate();
    onChange(input.value);
  });
}
