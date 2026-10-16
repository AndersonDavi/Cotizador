// Selector de color propio: área de saturación/brillo, tono, HEX, RGB,
// cuentagotas (si el navegador lo permite) y colores recientes.

type RGB = [number, number, number];
type HSV = [number, number, number];

const RECENT_KEY = 'cotizador:recentColors';

function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbToHex = ([r, g, b]: RGB) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

function rgbToHsv([r, g, b]: RGB): HSV {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

function hsvToRgb([h, s, v]: HSV): RGB {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function recent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function pushRecent(hex: string) {
  const list = [hex, ...recent().filter((x) => x !== hex)].slice(0, 12);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* sin storage */ }
}

let open: { close: () => void } | null = null;

/**
 * Abre el selector junto a `anchor`. `onInput` se llama mientras se arrastra;
 * el color final queda en recientes al cerrar.
 */
export function openColorPicker(anchor: HTMLElement, initial: string, title: string, onInput: (hex: string) => void, hint?: (hex: string) => string) {
  open?.close();
  let hsv = rgbToHsv(hexToRgb(initial) ?? [0, 0, 0]);
  let hex = rgbToHex(hsvToRgb(hsv));

  const pop = document.createElement('div');
  pop.className = 'cp';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', `Color ${title}`);
  pop.innerHTML = `
    <div class="cp-head"><b>${title}</b><button type="button" class="cp-x" aria-label="Cerrar">✕</button></div>
    <div class="cp-sv" tabindex="0" aria-label="Saturación y brillo"><i class="cp-dot"></i></div>
    <div class="cp-row">
      <button type="button" class="cp-eye" title="Tomar un color de la pantalla" aria-label="Cuentagotas"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg></button>
      <div class="cp-hue" tabindex="0" aria-label="Tono"><i class="cp-knob"></i></div>
      <i class="cp-prev"></i>
    </div>
    <div class="cp-fields">
      <label>HEX<input class="cp-hex" type="text" maxlength="7" spellcheck="false" /></label>
      <label>R<input class="cp-r" type="number" min="0" max="255" /></label>
      <label>G<input class="cp-g" type="number" min="0" max="255" /></label>
      <label>B<input class="cp-b" type="number" min="0" max="255" /></label>
    </div>
    <div class="cp-hint"></div>
    <div class="cp-recent-wrap"><span>Recientes</span><div class="cp-recent"></div></div>`;
  document.body.appendChild(pop);

  const q = <T extends HTMLElement>(s: string) => pop.querySelector(s) as T;
  const sv = q<HTMLDivElement>('.cp-sv'), dot = q<HTMLElement>('.cp-dot');
  const hue = q<HTMLDivElement>('.cp-hue'), knob = q<HTMLElement>('.cp-knob');
  const hexIn = q<HTMLInputElement>('.cp-hex');
  const rgbIn = [q<HTMLInputElement>('.cp-r'), q<HTMLInputElement>('.cp-g'), q<HTMLInputElement>('.cp-b')];
  const prev = q<HTMLElement>('.cp-prev');

  const paint = (skip?: HTMLElement) => {
    const rgb = hsvToRgb(hsv);
    hex = rgbToHex(rgb);
    sv.style.background = `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,hsl(${hsv[0]} 100% 50%))`;
    dot.style.left = `${hsv[1] * 100}%`;
    dot.style.top = `${(1 - hsv[2]) * 100}%`;
    dot.style.background = hex;
    knob.style.left = `${(hsv[0] / 360) * 100}%`;
    knob.style.background = `hsl(${hsv[0]} 100% 50%)`;
    prev.style.background = hex;
    if (skip !== hexIn) hexIn.value = hex;
    rgbIn.forEach((el, i) => { if (skip !== el) el.value = String(Math.round(rgb[i])); });
    const h = pop.querySelector('.cp-hint') as HTMLElement;
    h.innerHTML = hint ? hint(hex) : '';
    h.hidden = !hint;
  };
  const emit = (skip?: HTMLElement) => { paint(skip); onInput(hex); };

  const drag = (el: HTMLElement, fn: (x: number, y: number) => void) => {
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      fn(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
    };
    el.addEventListener('pointerdown', (ev) => {
      el.setPointerCapture(ev.pointerId);
      move(ev);
      const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
  };
  drag(sv, (x, y) => { hsv = [hsv[0], x, 1 - y]; emit(); });
  drag(hue, (x) => { hsv = [x * 359.9, hsv[1], hsv[2]]; emit(); });
  sv.addEventListener('keydown', (ev) => {
    const d = ev.shiftKey ? 0.1 : 0.02;
    const k: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    if (!k[ev.key]) return;
    ev.preventDefault();
    hsv = [hsv[0], Math.min(1, Math.max(0, hsv[1] + k[ev.key][0])), Math.min(1, Math.max(0, hsv[2] + k[ev.key][1]))];
    emit();
  });
  hue.addEventListener('keydown', (ev) => {
    const d = (ev.shiftKey ? 30 : 5) * (ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : 0);
    if (!d) return;
    ev.preventDefault();
    hsv = [(hsv[0] + d + 360) % 360, hsv[1], hsv[2]];
    emit();
  });
  hexIn.addEventListener('input', () => {
    const rgb = hexToRgb(hexIn.value);
    if (!rgb) return;
    hsv = rgbToHsv(rgb);
    emit(hexIn);
  });
  hexIn.addEventListener('paste', (ev) => {
    // Acepta "rgb(79, 209, 197)" pegado en el campo HEX
    const t = ev.clipboardData?.getData('text') ?? '';
    const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(t);
    if (!m) return;
    ev.preventDefault();
    hsv = rgbToHsv([+m[1], +m[2], +m[3]].map((v) => Math.min(255, v)) as RGB);
    emit();
  });
  rgbIn.forEach((el) => el.addEventListener('input', () => {
    const rgb = rgbIn.map((x) => Math.min(255, Math.max(0, Number(x.value) || 0))) as RGB;
    hsv = rgbToHsv(rgb);
    emit(el);
  }));

  const eye = q<HTMLButtonElement>('.cp-eye');
  if (!('EyeDropper' in window)) eye.hidden = true;
  eye.addEventListener('click', async () => {
    try {
      const res = await new (window as any).EyeDropper().open();
      hsv = rgbToHsv(hexToRgb(res.sRGBHex)!);
      emit();
    } catch { /* cancelado */ }
  });

  const recentEl = q<HTMLElement>('.cp-recent');
  const list = recent();
  q<HTMLElement>('.cp-recent-wrap').hidden = !list.length;
  recentEl.innerHTML = list.map((c) => `<button type="button" style="background:${c}" data-c="${c}" title="${c}" aria-label="${c}"></button>`).join('');
  recentEl.addEventListener('click', (ev) => {
    const c = (ev.target as HTMLElement).dataset.c;
    if (!c) return;
    hsv = rgbToHsv(hexToRgb(c)!);
    emit();
  });

  // Posición: debajo del botón (o encima si no cabe)
  const place = () => {
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    let left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left));
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  };

  const onDoc = (ev: Event) => { if (!pop.contains(ev.target as Node) && !anchor.contains(ev.target as Node)) close(); };
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') close(); };
  function close() {
    pushRecent(hex);
    pop.remove();
    document.removeEventListener('pointerdown', onDoc, true);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', place);
    if (open?.close === close) open = null;
    anchor.focus();
  }
  q<HTMLButtonElement>('.cp-x').addEventListener('click', close);
  document.addEventListener('pointerdown', onDoc, true);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', place);
  open = { close };
  paint();
  place();
  sv.focus();
}
