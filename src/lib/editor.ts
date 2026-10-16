import {
  type Cotizacion,
  type Cliente,
  type Item,
  type Estado,
  ESTADOS,
  ESTADO_LABELS,
  estadoDe,
  loadDraft,
  saveDraft,
  loadBranding,
  saveBranding,
  loadSaved,
  persistSaved,
  deleteSaved,
  nuevaCotizacion,
  nextNumero,
  makeId,
  totalReal,
  formatCOP,
  totales,
  valorItem,
  cantidadDe,
  unidadDe,
  logoClase,
  filasDesglose,
  validaHasta,
  ivaGeneral,
  today,
} from './state';
import { getAllIconKeys, getIconLabel, getIconSearchText, buildIconDataUrl, ICON_CATEGORIES, type IconKey } from './icons';
import { DISENOS, PALETAS, coloresDe, disenoDe, buildTheme, contrast, contrastReport, readableOn, type DisenoId } from './theme';
import { cuentaDesdeCotizacion, parseFecha } from './doc';
import {
  cotizacionHtml, loadIntoFrame, exportPdf, exportPng, exportJson, exportMarkdown,
  importJsonFromFile, printCuentaCobro, sharePng, saveTextFile, pdfParaCompartir,
} from './export';
import { startTour, TOURS, type TourId } from './tour';
import { moneyField, dateField } from './inputs';
import { openColorPicker } from './colorpicker';
import { abrirModal, cerrarModal, confirmar, animarSalida } from './ui';
import {
  driveDisponible, driveInfo, prepararDrive, conectarDrive, subirRespaldo, bajarRespaldo,
  desconectarDrive, driveTokenVigente, DriveAuthError,
} from './drive';

let state: Cotizacion;
let saveTimer: number | null = null;
let renderTimer: number | null = null;

const ESTADO_COLOR: Record<Estado, string> = {
  borrador: '#8b93a1',
  enviada: '#5aa9ff',
  aprobada: '#4ec47e',
  cobrada: '#f2a93b',
  pagada: '#2fd5c4',
  descartada: '#ef6767',
};

// Estado de UI de ítems (no afecta el documento)
const collapsedItems = new Set<string>();
type SortField = 'precio' | 'titulo' | 'tipo';
let sortField: SortField | null = null;
let sortDir: 'asc' | 'desc' = 'asc';
let savedFilter: Estado | 'todas' = 'todas';

// ── Helpers ──────────────────────────────────────────────────────────────────

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No #${id}`);
  return el;
}
const $in = (id: string) => $(id) as HTMLInputElement;

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

let toastTimer = 0;
function toast(msg: string, kind: 'ok' | 'err' = 'ok', action?: { label: string; run: () => void }) {
  const el = $('toast');
  el.textContent = msg;
  if (action) {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'toast-action', textContent: action.label });
    b.addEventListener('click', () => { action.run(); el.className = 'toast'; });
    el.appendChild(b);
  }
  el.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { el.className = 'toast'; }, action ? 5000 : 2600);
}

/** dd-mm-aaaa ⇄ aaaa-mm-dd (inputs type=date) */
function toIso(s?: string): string {
  const f = parseFecha(s ?? '');
  return f ? `${f.y}-${String(f.m).padStart(2, '0')}-${String(f.d).padStart(2, '0')}` : '';
}
function fromIso(s: string): string {
  const f = parseFecha(s);
  return f ? `${String(f.d).padStart(2, '0')}-${String(f.m).padStart(2, '0')}-${f.y}` : '';
}

/** Lee la imagen y la reduce (máx. `max` px) para no llenar localStorage. Los SVG se dejan igual. */
function imageToDataUrl(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const src = String(r.result);
      if (file.type === 'image/svg+xml') return resolve(src);
      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        if (k === 1 && file.size < 400_000) return resolve(src);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = src;
    };
    r.readAsDataURL(file);
  });
}

/** Completa campos de cotizaciones guardadas con versiones anteriores. */
function normalize(c: Cotizacion): Cotizacion {
  c.items ??= [];
  c.terminos ??= [];
  c.coloresOverride ??= {};
  c.cliente ??= { nombre: '', nit: '' };
  c.cobro ??= {};
  c.titulo ??= 'Propuesta económica';
  c.estado = estadoDe(c);
  c.diseno = disenoDe(c);
  c.branding.contacto ??= { web: '', email: '', cel: '', ciudad: '', pais: '' };
  c.branding.representante ??= { nombre: '', cedula: '' };
  return c;
}

// ── Guardado y vista previa ──────────────────────────────────────────────────

function scheduleAutosave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      saveDraft(state);
      saveBranding(state.branding);
    } catch {
      toast('El navegador no tiene espacio para guardar. Usa imágenes más livianas.', 'err');
    }
  }, 400);
}

let costoMoney: { paint: () => void } | null = null;
let renderSeq = 0;
/** 'width' = ocupa el ancho disponible, 'page' = documento completo a la vista, número = zoom fijo. */
// Zoom de la vista previa: en PC arranca en "Página" (el documento completo a lo alto), en el
// celular en "Ancho" (a página completa quedaría diminuto). Se recuerda la última elección.
const ZOOM_KEY = 'cotizador:zoom';
let zoomMode: 'width' | 'page' | number = (() => {
  try { const z = localStorage.getItem(ZOOM_KEY); if (z === 'width' || z === 'page') return z; } catch { /* sin storage */ }
  return matchMedia('(max-width: 860px)').matches ? 'width' : 'page';
})();
const recordarZoom = (z: 'width' | 'page') => { try { localStorage.setItem(ZOOM_KEY, z); } catch { /* sin storage */ } };
let zoomK = 1;
let docSize = { width: 1080, height: 1400 };

function frames() {
  const stage = $('previewStage');
  return {
    stage,
    front: stage.querySelector('.pv-frame.front') as HTMLIFrameElement,
    back: stage.querySelector('.pv-frame.back') as HTMLIFrameElement,
  };
}

function applyZoom() {
  const { stage, front } = frames();
  const scroll = $('previewScroll');
  const pad = parseFloat(getComputedStyle(scroll).paddingLeft) * 2;
  const avail = scroll.clientWidth - pad;
  if (avail <= 0) return; // vista previa oculta (modo celular): se ajusta al mostrarla
  const availH = scroll.clientHeight - pad;
  const k = zoomMode === 'width' ? Math.min(1.6, avail / docSize.width)
    : zoomMode === 'page' ? Math.min(avail / docSize.width, availH / docSize.height)
    : zoomMode;
  zoomK = k;
  $('zoomLabel').textContent = `${Math.round(k * 100)}%`;
  $('zoomWidth').classList.toggle('active', zoomMode === 'width');
  $('zoomPage').classList.toggle('active', zoomMode === 'page');
  stage.style.width = `${docSize.width * k}px`;
  stage.style.height = `${docSize.height * k}px`;
  // El borde del documento escalado cae entre píxeles y se mezcla con el fondo blanco del
  // contenedor (línea clara junto a bordes oscuros). Se dibuja 1 px más grande por lado y
  // el contenedor (overflow: hidden) lo recorta.
  const kx = (docSize.width * k + 2) / docSize.width;
  const ky = (docSize.height * k + 2) / docSize.height;
  for (const f of [front, stage.querySelector('.pv-frame.back') as HTMLIFrameElement]) {
    f.style.transform = `translate(-1px, -1px) scale(${kx}, ${ky})`;
  }
  front.style.height = `${docSize.height}px`;
}

/** Renderiza en el iframe oculto y lo intercambia al terminar (sin parpadeo). */
async function renderPreview() {
  const seq = ++renderSeq;
  const { stage, front, back } = frames();
  // Skeleton solo si el render tarda (cambio de diseño, imágenes grandes); al escribir no parpadea
  const skel = window.setTimeout(() => stage.classList.add('loading'), 160);
  try {
    const size = await loadIntoFrame(back, cotizacionHtml(state));
    if (seq !== renderSeq) return;
    clearTimeout(skel);
    stage.classList.remove('loading');
    docSize = size;
    back.style.height = `${size.height}px`;
    back.classList.replace('back', 'front');
    front.classList.replace('front', 'back');
    back.removeAttribute('aria-hidden');
    back.title = 'Vista previa de la cotización';
    front.setAttribute('aria-hidden', 'true');
    front.title = '';
    applyZoom();
  } catch (e) {
    console.error(e);
  }
}

function schedulePreview() {
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderPreview, 120);
}

/** Refresca todo lo derivado del estado (total, etiquetas, vista previa, guardado). */
function refresh() {
  if (state.costoTotalAuto) state.costoTotal = totalReal(state);
  const total = formatCOP(totalReal(state));
  $('totalBig').textContent = total;
  $('previewTotal').textContent = `${total} COP`;
  $('docLabel').textContent = `Cotización ${state.numero}${state.cliente?.nombre ? ' · ' + state.cliente.nombre : ''}`;
  $('itemsCount').textContent = String(state.items.length);
  const n = state.items.length;
  $('itemsSummary').textContent = `${n} ${n === 1 ? 'ítem' : 'ítems'}`;
  const sum = $('itemsTotal');
  if (sum.textContent !== total) { sum.textContent = total; pulse(sum); pulse($('totalBig')); }
  $('totalHint').textContent = state.costoTotalAuto ? `Suma de ${n} ${n === 1 ? 'ítem' : 'ítems'}` : 'Valor escrito a mano';
  ($('costoManualWrap') as HTMLElement).hidden = state.costoTotalAuto;
  const est = estadoDe(state);
  const badge = $('previewEstado');
  badge.textContent = ESTADO_LABELS[est];
  badge.style.setProperty('--dot', ESTADO_COLOR[est]);
  renderCobroResumen();
  renderExtras();
  schedulePreview();
  scheduleAutosave();
}

// ── Pestañas ─────────────────────────────────────────────────────────────────

// Pestañas visitadas, para que el gesto atrás vuelva a la anterior
const pilaTabs: string[] = [];
let tabActual = '';
let volviendoTab = false;

function showTab(tab: string) {
  if (tabActual && tabActual !== tab && !volviendoTab) { pilaTabs.push(tabActual); if (pilaTabs.length > 20) pilaTabs.shift(); }
  tabActual = tab;
  document.querySelectorAll<HTMLElement>('.tab').forEach((t) => {
    const on = t.dataset.tab === tab;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll<HTMLElement>('.pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === tab));
  document.querySelector('.panes')!.scrollTop = 0;
  requestAnimationFrame(() => document.querySelectorAll<HTMLTextAreaElement>('.pane.active textarea.auto').forEach(autosize));
  try { localStorage.setItem('cotizador:tab', tab); } catch { /* sin storage */ }
  if (tab === 'guardadas') renderSavedList();
  if (tab === 'diseno') renderDesign();
  ($('tab-' + tab) as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// ── Estado ───────────────────────────────────────────────────────────────────

function renderEstado() {
  const wrap = $('estadoGroup');
  const cur = estadoDe(state);
  wrap.innerHTML = ESTADOS.map((e) =>
    `<button type="button" role="radio" aria-checked="${e === cur}" class="${e === cur ? 'active' : ''}" data-estado="${e}" style="--dot:${ESTADO_COLOR[e]}">${ESTADO_LABELS[e]}</button>`
  ).join('');
}

// ── Ítems ────────────────────────────────────────────────────────────────────

/** Categorías del selector; los íconos que no estén en ninguna van a "Otros". */
function iconGroups(): { nombre: string; keys: IconKey[] }[] {
  const all = new Set(getAllIconKeys() as string[]);
  const groups = ICON_CATEGORIES.map((c) => ({ nombre: c.nombre, keys: c.keys.filter((k) => all.has(k)) as IconKey[] }));
  const used = new Set(groups.flatMap((g) => g.keys as string[]));
  const rest = [...all].filter((k) => !used.has(k)) as IconKey[];
  if (rest.length) groups.push({ nombre: 'Otros', keys: rest });
  return groups;
}

/** Selector de íconos: popover con buscador (hoja inferior en celular). */
let closeIconPicker: (() => void) | null = null;

function openIconPicker(anchor: HTMLElement, selected: IconKey, onPick: (k: IconKey) => void) {
  closeIconPicker?.();
  const pop = document.createElement('div');
  pop.className = 'ip';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Elegir ícono');
  pop.innerHTML = `
    <div class="ip-head"><input class="ip-search" type="search" placeholder="Buscar ícono: diseño, web, datos…" aria-label="Buscar ícono" /><button type="button" class="ip-x" aria-label="Cerrar">✕</button></div>
    <div class="ip-body">${iconGroups().map((g) => `
      <section class="ip-group"><h4>${g.nombre}</h4><div class="ip-grid">${g.keys.map((k) => `
        <button type="button" class="ip-item${k === selected ? ' active' : ''}" data-key="${k}" data-search="${escapeHtml(getIconSearchText(k))}">
          <img src="${buildIconDataUrl(k, k === selected ? '#1a1a10' : '#e8eaee')}" alt="" /><span>${escapeHtml(getIconLabel(k))}</span>
        </button>`).join('')}</div></section>`).join('')}
      <p class="ip-empty" hidden>Ningún ícono coincide. Prueba con otra palabra.</p></div>`;
  document.body.appendChild(pop);
  const mobile = window.matchMedia('(max-width: 860px)').matches;
  if (mobile) pop.classList.add('sheet');
  else {
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = `${Math.min(window.innerWidth - w - 12, Math.max(12, r.left))}px`;
    pop.style.top = `${r.bottom + 8 + h > window.innerHeight - 12 ? Math.max(12, r.top - h - 8) : r.bottom + 8}px`;
  }
  void pop.offsetWidth; // fuerza el estilo inicial para que la transición de entrada se vea
  pop.classList.add('on');
  const search = pop.querySelector('.ip-search') as HTMLInputElement;
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    let any = false;
    pop.querySelectorAll<HTMLElement>('.ip-group').forEach((g) => {
      let n = 0;
      g.querySelectorAll<HTMLElement>('.ip-item').forEach((b) => {
        const hit = !q || q.split(/s+/).every((w) => (b.dataset.search ?? '').includes(w));
        b.hidden = !hit;
        if (hit) n++;
      });
      g.hidden = !n;
      any ||= n > 0;
    });
    (pop.querySelector('.ip-empty') as HTMLElement).hidden = any;
  });
  const close = () => {
    pop.remove();
    document.removeEventListener('pointerdown', onDoc, true);
    document.removeEventListener('keydown', onKey);
    if (closeIconPicker === close) closeIconPicker = null;
  };
  const onDoc = (ev: Event) => { if (!pop.contains(ev.target as Node) && !anchor.contains(ev.target as Node)) close(); };
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { close(); anchor.focus(); } };
  pop.addEventListener('click', (ev) => {
    if ((ev.target as HTMLElement).closest('.ip-x')) { close(); return; }
    const k = (ev.target as HTMLElement).closest<HTMLElement>('[data-key]')?.dataset.key as IconKey | undefined;
    if (!k) return;
    close();
    onPick(k);
    anchor.focus();
  });
  document.addEventListener('pointerdown', onDoc, true);
  document.addEventListener('keydown', onKey);
  closeIconPicker = close;
  if (!mobile) search.focus();
}

function updateSortButtons() {
  const labels: Record<SortField, string> = { precio: 'Precio', titulo: 'Título', tipo: 'Tipo' };
  (Object.keys(labels) as SortField[]).forEach((f) => {
    const btn = $(`sort-${f}`);
    btn.classList.toggle('sort-active', sortField === f);
    btn.textContent = labels[f] + (sortField === f ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');
  });
}

function applySort(field: SortField) {
  if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortField = field; sortDir = 'asc'; }
  const before = cardRects();
  state.items.sort((a, b) => {
    let cmp = 0;
    if (field === 'precio') cmp = valorItem(a) - valorItem(b);
    else if (field === 'titulo') cmp = (a.titulo || '').localeCompare(b.titulo || '', 'es', { sensitivity: 'base' });
    else cmp = getIconLabel(a.iconKey).localeCompare(getIconLabel(b.iconKey), 'es', { sensitivity: 'base' });
    return sortDir === 'asc' ? cmp : -cmp;
  });
  updateSortButtons();
  renderItems();
  flip(before);
  refresh();
}

const svgI = (d: string) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS: Record<string, string> = {
  up: svgI('<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>'),
  down: svgI('<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>'),
  copy: svgI('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  collapse: svgI('<path d="m18 15-6-6-6 6"/>'),
  expand: svgI('<path d="m6 9 6 6 6-6"/>'),
  bookmark: svgI('<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>'),
  trash: svgI('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
};

// ── Animaciones de la lista (FLIP: las tarjetas se deslizan a su nueva posición) ──
function cardRects(): Map<string, DOMRect> {
  const m = new Map<string, DOMRect>();
  $('items').querySelectorAll<HTMLElement>('.item-card').forEach((c) => m.set(c.dataset.id!, c.getBoundingClientRect()));
  return m;
}

function flip(before: Map<string, DOMRect>, enterId?: string) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('items').querySelectorAll<HTMLElement>('.item-card').forEach((c) => {
    const old = before.get(c.dataset.id!);
    if (c.dataset.id === enterId || !old) {
      if (c.dataset.id === enterId) c.classList.add('enter');
      return;
    }
    const dy = old.top - c.getBoundingClientRect().top;
    if (!dy || reduce) return;
    c.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
}

export function autosize(el: HTMLTextAreaElement) {
  if (!el.offsetParent) return; // oculto: se ajusta al mostrar la pestaña
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight + 2, 420)}px`;
  el.toggleAttribute('data-long', el.scrollHeight > 126); // descripciones largas se ven recortadas hasta editarlas
}

function renderItems() {
  const wrap = $('items');
  wrap.innerHTML = '';
  const allCollapsed = state.items.length > 0 && state.items.every((it) => collapsedItems.has(it.id));
  $('toggleAllItems').textContent = allCollapsed ? 'Expandir todo' : 'Colapsar todo';

  state.items.forEach((it, idx) => {
    if (it.unidad && !unidadDe(it)) it.unidad = undefined; // un número en Unidad (p. ej. "-1") era un error de digitación
    const collapsed = collapsedItems.has(it.id);
    const card = document.createElement('div');
    card.className = 'item-card' + (collapsed ? ' item-collapsed' : '');
    card.dataset.id = it.id;
    const btn = (action: string, label: string, icon: string, extra = '') =>
      `<button type="button" class="icon-btn${action === 'remove' ? ' danger' : ''}" data-action="${action}" title="${label}" aria-label="${label}" ${extra}>${ICONS[icon]}</button>`;
    const iconBtn = `<button type="button" class="ic-icon" data-action="icon" title="Ícono: ${escapeHtml(getIconLabel(it.iconKey))} (cambiar)" aria-label="Cambiar ícono, actual: ${escapeHtml(getIconLabel(it.iconKey))}"><img src="${buildIconDataUrl(it.iconKey, '#e8eaee')}" alt="" /></button>`;
    if (collapsed) {
      card.innerHTML = `<div class="ic-top ic-compact" data-action="toggle" title="Mostrar detalles">
        ${iconBtn}
        <span class="ic-ctitle">${escapeHtml(it.titulo || 'Ítem sin título')}</span>
        <span class="ic-cval">${formatCOP(valorItem(it))}</span>
        ${btn('toggle', 'Mostrar detalles', 'expand')}</div>`;
    } else {
      card.innerHTML = `
        <div class="ic-top">
          ${iconBtn}
          <input class="ic-title" type="text" data-action="titulo" value="${escapeHtml(it.titulo)}" placeholder="Nombre del servicio" aria-label="Título del ítem ${idx + 1}" />
          ${btn('toggle', 'Ocultar detalles', 'collapse')}
        </div>
        <textarea class="ic-desc auto" data-action="descripcion" rows="2" placeholder="Qué incluye: entregables, alcance, número de revisiones…" aria-label="Descripción del ítem ${idx + 1}">${escapeHtml(it.descripcion)}</textarea>
        <div class="ic-price">
          <label class="ic-qty"><span>Cantidad</span><input type="text" inputmode="decimal" data-action="cantidad" value="${String(cantidadDe(it)).replace('.', ',')}" aria-label="Cantidad del ítem ${idx + 1}" /></label>
          <label class="ic-unit"><span>Unidad</span><input type="text" list="unidades" data-action="unidad" value="${escapeHtml(it.unidad ?? '')}" placeholder="und" aria-label="Unidad del ítem ${idx + 1}" /></label>
          <span class="ic-x" aria-hidden="true">×</span>
          <label class="ic-unitprice"><span>Precio unitario</span><input class="valor-slot" aria-label="Precio unitario del ítem ${idx + 1}" /></label>
          ${(state.impuestos?.ivaModo ?? 'ninguno') === 'ninguno' ? '' : `<label class="ic-iva"><span>IVA</span><select data-action="iva" aria-label="IVA del ítem ${idx + 1}">
            <option value=""${it.ivaTasa == null ? ' selected' : ''}>General (${ivaGeneral(state)}%)</option>
            ${[19, 5, 0].map((t) => `<option value="${t}"${it.ivaTasa === t ? ' selected' : ''}>${t ? t + '%' : 'Exento (0%)'}</option>`).join('')}
          </select></label>`}
        </div>
        <div class="ic-bottom">
          <div class="ic-actions">
            <span class="ic-num">#${idx + 1}</span>
            ${btn('up', 'Subir', 'up', idx === 0 ? 'disabled' : '')}${btn('down', 'Bajar', 'down', idx === state.items.length - 1 ? 'disabled' : '')}${btn('dup', 'Duplicar', 'copy')}${btn('cat', 'Guardar en el catálogo', 'bookmark')}${btn('remove', 'Eliminar', 'trash')}
          </div>
          <span class="ic-sub">Valor del ítem <b data-sub>${formatCOP(valorItem(it))}</b></span>
        </div>`;
      moneyField(card.querySelector('.valor-slot') as HTMLInputElement, () => it.valor, (v) => { it.valor = v; updSub(); refresh(); });
    }
    const updSub = () => {
      const el = card.querySelector<HTMLElement>('[data-sub]');
      if (el && el.textContent !== formatCOP(valorItem(it))) { el.textContent = formatCOP(valorItem(it)); pulse(el); }
    };
    card.addEventListener('input', (ev) => {
      const t = ev.target as HTMLInputElement | HTMLTextAreaElement;
      if (t.dataset.action === 'titulo') it.titulo = t.value;
      else if (t.dataset.action === 'descripcion') { it.descripcion = t.value; autosize(t as HTMLTextAreaElement); }
      else if (t.dataset.action === 'cantidad') {
        t.value = t.value.replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '');
        const q = parseFloat(t.value.replace(',', '.'));
        it.cantidad = Number.isFinite(q) && q > 0 ? q : 1;
        updSub();
      } else if (t.dataset.action === 'unidad') {
        const u = t.value.trim();
        const numero = /^[-+\d.,\s]+$/.test(u) && u !== '';
        t.classList.toggle('invalid', numero);
        t.title = numero ? 'La unidad es un texto (und, m, hora…). La cantidad va en el campo Cantidad.' : '';
        it.unidad = u && !numero ? u : undefined;
      }
      else if (t.dataset.action === 'iva') it.ivaTasa = t.value === '' ? undefined : Number(t.value);
      else return;
      refresh();
    });
    card.addEventListener('click', (ev) => {
      const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
      const action = el?.dataset.action;
      if (!action || el?.hasAttribute('disabled')) return;
      if (action === 'icon') {
        ev.stopPropagation();
        openIconPicker(el!, it.iconKey, (k) => { it.iconKey = k; renderItems(); refresh(); flash(it.id); });
        return;
      }
      if (action === 'remove') { removeItem(it.id); return; }
      if (action === 'cat') { guardarEnCatalogo(it); pulse(el!); return; }
      const before = cardRects();
      let enter: string | undefined;
      if (action === 'dup') {
        const copy = { ...it, id: makeId() };
        state.items.splice(idx + 1, 0, copy);
        enter = copy.id;
        toast('Ítem duplicado');
      } else if (action === 'up' && idx > 0) {
        [state.items[idx - 1], state.items[idx]] = [state.items[idx], state.items[idx - 1]];
      } else if (action === 'down' && idx < state.items.length - 1) {
        [state.items[idx + 1], state.items[idx]] = [state.items[idx], state.items[idx + 1]];
      } else if (action === 'toggle') {
        if (collapsedItems.has(it.id)) collapsedItems.delete(it.id); else collapsedItems.add(it.id);
        renderItems();
        flip(before);
        return;
      } else return;
      renderItems();
      flip(before, enter);
      refresh();
      if (enter) wrap.querySelector<HTMLElement>(`[data-id="${enter}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      // Mantiene el foco en el botón que se usó (para mover varias veces con teclado)
      wrap.querySelector<HTMLElement>(`[data-id="${it.id}"] [data-action="${action}"]`)?.focus({ preventScroll: true });
    });
    wrap.appendChild(card);
  });
  requestAnimationFrame(() => wrap.querySelectorAll<HTMLTextAreaElement>('textarea.auto').forEach(autosize));
}

function flash(id: string) {
  const c = $('items').querySelector<HTMLElement>(`[data-id="${id}"]`);
  c?.classList.remove('enter');
  void c?.offsetWidth;
  c?.classList.add('enter');
}

/** Elimina con animación y ofrece deshacer (sin ventana de confirmación). */
function removeItem(id: string) {
  const idx = state.items.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const card = $('items').querySelector<HTMLElement>(`[data-id="${id}"]`);
  const doRemove = () => {
    const before = cardRects();
    const [removed] = state.items.splice(idx, 1);
    collapsedItems.delete(id);
    if (!state.items.length) state.items.push({ id: makeId(), iconKey: 'code', titulo: '', descripcion: '', valor: 0 });
    renderItems();
    flip(before);
    refresh();
    toast(`Eliminaste "${removed.titulo || 'ítem sin título'}"`, 'ok', {
      label: 'Deshacer',
      run: () => {
        const b = cardRects();
        if (state.items.length === 1 && !state.items[0].titulo && !state.items[0].descripcion && !state.items[0].valor) state.items = [];
        state.items.splice(Math.min(idx, state.items.length), 0, removed);
        renderItems();
        flip(b, removed.id);
        refresh();
      },
    });
  };
  if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { doRemove(); return; }
  const h = card.offsetHeight;
  card.animate([
    { opacity: 1, transform: 'none', height: `${h}px` },
    { opacity: 0, transform: 'translateX(-24px) scale(.98)', height: `${h}px`, offset: 0.6 },
    { opacity: 0, transform: 'translateX(-24px) scale(.98)', height: '0px', marginTop: `-${parseFloat(getComputedStyle($('items')).rowGap) || 10}px`, paddingTop: '0', paddingBottom: '0' },
  ], { duration: 320, easing: 'ease-in' }).onfinish = doRemove;
}

// ── Diseño ───────────────────────────────────────────────────────────────────

/** Miniatura esquemática de cada diseño, pintada con los colores actuales. */
function thumb(id: DisenoId, p: string, s: string): string {
  const t = buildTheme({ primary: p, secondary: s });
  const g = (x: number, y: number, w: number, h: number, bg: string, extra = '') =>
    `<i style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;background:${bg};${extra}"></i>`;
  const lines = (x: number, y: number, n: number, gap = 7, w = 60, c = '#d5d8de') =>
    Array.from({ length: n }, (_, i) => g(x, y + i * gap, w - (i % 2) * 12, 2.2, c, 'border-radius:2px')).join('');
  switch (id) {
    case 'clasica': return g(0, 0, 100, 30, `linear-gradient(111deg,${p},${t.pDeep})`) + g(8, 6, 50, 5, t.onP) + g(62, 6, 18, 5, s) + g(8, 26, 84, 18, '#fff', 'border:1px solid #e3e3e3') + g(8, 44, 84, 18, '#fff', 'border:1px solid #e3e3e3') + g(8, 62, 84, 18, '#fff', 'border:1px solid #e3e3e3') + g(8, 86, 84, 6, '#eee');
    case 'bloque': return g(0, 0, 100, 100, t.pSofter) + g(0, 0, 58, 22, p) + g(58, 0, 42, 22, s) + g(6, 6, 40, 5, s) + g(6, 34, 88, 5, s) + g(74, 34, 20, 5, p) + lines(8, 44, 5, 6, 80) + g(56, 78, 38, 6, s) + g(0, 93, 100, 7, p);
    case 'noche': return g(0, 0, 100, 100, p) + g(-30, -24, 60, 46, 'transparent', `border:5px solid ${s};border-radius:50%`) + g(70, 80, 60, 46, 'transparent', `border:5px solid ${s};border-radius:50%`) + g(56, 14, 34, 4, s) + lines(10, 36, 6, 7, 80, 'rgba(255,255,255,.35)') + g(64, 80, 26, 5, '#fff');
    case 'diagonal': return g(8, 7, 50, 6, t.pDeep) + g(0, 20, 50, 6, p, 'clip-path:polygon(0 0,100% 0,85% 100%,0 100%)') + g(46, 20, 54, 6, s, 'clip-path:polygon(10% 0,100% 0,100% 100%,0 100%)') + g(8, 40, 84, 5, t.pDeep) + g(8, 45, 8, 30, p) + lines(20, 48, 4, 7, 70) + g(78, 72, 14, 4, s) + g(0, 86, 42, 14, p) + g(42, 86, 58, 14, s);
    case 'estudio': return g(0, 0, 100, 4, p) + g(0, 0, 12, 9, s, 'clip-path:polygon(0 0,100% 0,0 100%)') + g(8, 10, 50, 7, '#1c1d21') + g(8, 36, 84, 5, s) + lines(10, 44, 5, 6, 78) + g(0, 76, 100, 6, p) + g(0, 96, 100, 4, p) + g(88, 91, 12, 9, s, 'clip-path:polygon(100% 0,100% 100%,0 100%)');
    case 'editorial': return g(10, 8, 34, 9, p) + g(62, 9, 28, 4, '#555') + g(10, 32, 80, 3, p) + lines(10, 42, 6, 6, 80) + g(62, 80, 28, 4, p) + g(10, 88, 80, 1.5, p);
    case 'redonda': return g(8, 6, 30, 5, p) + g(0, 18, 100, 22, p) + g(52, 12, 40, 14, '#fff', 'border-radius:0 0 12px 12px') + g(58, 17, 28, 4, s) + g(6, 34, 88, 46, '#fff', 'border-radius:12px 12px 0 0') + lines(12, 42, 5, 7, 76) + g(0, 82, 46, 10, p) + g(0, 96, 100, 4, s);
    case 'lateral': return g(0, 0, 32, 100, p) + g(6, 6, 20, 10, '#fff', 'border-radius:4px') + g(6, 40, 18, 4, s) + g(40, 8, 48, 6, t.pDeep) + Array.from({ length: 4 }, (_, i) => g(40, 22 + i * 17, 52, 13, '#fff', `border:1px solid #dfe2e6;border-left:3px solid ${s};border-radius:4px`)).join('');
  }
}

function renderDesign() {
  const { primary, secondary } = coloresDe(state);
  const cur = disenoDe(state);
  $('designGallery').innerHTML = DISENOS.map((d) => `
    <button type="button" class="design${d.id === cur ? ' active' : ''}" data-diseno="${d.id}" aria-pressed="${d.id === cur}" title="${d.descripcion}">
      <div class="thumb">${thumb(d.id, primary, secondary)}</div>
      <div><b>${d.nombre}</b><small>${d.descripcion}</small></div>
    </button>`).join('');
  renderContrast(primary, secondary);
  $('colorPrimarySw').style.background = primary;
  $('colorSecondarySw').style.background = secondary;
  $('colorPrimaryHex').textContent = primary.toUpperCase();
  $('colorSecondaryHex').textContent = secondary.toUpperCase();
  const same = (p: { primary: string; secondary: string }) =>
    p.primary.toLowerCase() === primary.toLowerCase() && p.secondary.toLowerCase() === secondary.toLowerCase();
  const chip = (p: { primary: string; secondary: string; nombre?: string }, attr: string, del = '') =>
    `<span class="palette-wrap"><button type="button" class="palette${same(p) ? ' active' : ''}" ${attr} title="${p.nombre ?? `${p.primary} · ${p.secondary}`}"><i style="background:${p.primary}"></i><i style="background:${p.secondary}"></i></button>${del}</span>`;
  $('paletteRow').innerHTML = PALETAS.map((p, i) => chip(p, `data-paleta="${i}"`)).join('');
  const mine = misPaletas();
  $('myPalettes').innerHTML = mine.length
    ? mine.map((p, i) => chip(p, `data-mia="${i}"`, `<button type="button" class="palette-del" data-del="${i}" title="Quitar paleta" aria-label="Quitar paleta">×</button>`)).join('')
    : '<span class="hint">Guarda aquí los colores de tu marca o de tus clientes.</span>';
  const save = $('savePalette') as HTMLButtonElement;
  const yaMia = mine.some(same), rapida = PALETAS.some(same);
  save.disabled = yaMia || rapida;
  save.textContent = yaMia ? '✓ Guardada en tus paletas' : rapida ? '✓ Es una paleta rápida' : '＋ Guardar mis colores';
  save.title = save.disabled ? '' : 'Guarda el principal y el secundario actuales para usarlos en otras cotizaciones';
}

/** Medidor de contraste entre principal y secundario, con arreglos de un clic. */
function renderContrast(primary: string, secondary: string) {
  const r = contrastReport({ primary, secondary });
  const ratio = r.ratio.toFixed(1).replace('.', ',');
  const box = $('contrastBox');
  box.className = `contrast ${r.level}`;
  const sample = `<span class="contrast-sample" style="background:${primary};color:${secondary}" aria-hidden="true">Aa</span>`;
  if (r.level === 'bien') {
    box.innerHTML = `${sample}<div><b>Buen contraste (${ratio}:1)</b><span>El secundario se lee bien sobre el principal.</span></div>`;
    return;
  }
  const fixed = readableOn(secondary, primary, 4.5);
  box.innerHTML = `${sample}<div><b>${r.level === 'justo' ? `Contraste justo (${ratio}:1)` : `Poco contraste (${ratio}:1)`}</b>
    <span>${r.level === 'justo' ? 'Se lee en títulos grandes, pero los textos pequeños pueden costar.' : 'El secundario casi no se ve sobre el principal. En el documento lo ajustamos solo a un tono legible, pero puedes elegirlo tú:'}</span>
    <div class="contrast-fixes">
      <button type="button" data-fix="${fixed}"><i style="background:${fixed}"></i>Usar tono legible</button>
      <button type="button" data-fix="swap">Intercambiar</button>
      <button type="button" data-fix="suggest">Colores sugeridos</button>
    </div></div>`;
}

// Paletas propias en localStorage
/** Animación tipo burbuja: la paleta entra con rebote o se encoge y desaparece. */
function burbuja(el: Element | null, entra: boolean): Promise<void> {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  const kf = entra
    ? [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.22)', opacity: 1, offset: 0.55 }, { transform: 'scale(.92)', offset: 0.78 }, { transform: 'scale(1)', opacity: 1 }]
    : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.18)', opacity: 1, offset: 0.35 }, { transform: 'scale(0)', opacity: 0 }];
  const anim = el.animate(kf, { duration: entra ? 520 : 320, easing: entra ? 'cubic-bezier(.2,.8,.2,1)' : 'ease-in', fill: entra ? 'none' : 'forwards' });
  // La salida se queda en escala 0 hasta que quien llama esconde o reemplaza el elemento; después se cancela
  // para que el mismo elemento (logo, firma) vuelva a verse cuando se cargue otro.
  return anim.finished.then(() => { if (!entra) setTimeout(() => anim.cancel(), 60); }, () => undefined);
}

const PALETAS_KEY = 'cotizador:paletas';
function misPaletas(): { primary: string; secondary: string }[] {
  try { return JSON.parse(localStorage.getItem(PALETAS_KEY) || '[]'); } catch { return []; }
}
function guardarPaletas(list: { primary: string; secondary: string }[]) {
  try { localStorage.setItem(PALETAS_KEY, JSON.stringify(list.slice(0, 24))); } catch { toast('No se pudo guardar la paleta', 'err'); }
}

function setColores(primary: string, secondary: string) {
  state.colores = { primary: primary.toUpperCase(), secondary: secondary.toUpperCase() };
  state.coloresOverride = {};
  renderDesign();
  refresh();
}

// ── Marca: logo y firma ──────────────────────────────────────────────────────

function paintImages() {
  const logo = state.branding.logoDataUrl;
  ($('logoPreview') as HTMLImageElement).src = logo || '';
  $('logoArea').classList.toggle('has-img', !!logo);
  ($('logoClear') as HTMLElement).hidden = !logo;
  // Estilo del logo: solo tiene sentido con logo; la vista previa de Mi marca lo refleja
  const estilo = state.branding.logoEstilo ?? 'original';
  ($('logoEstiloWrap') as HTMLElement).hidden = !logo;
  $('logoPreview').className = logoClase(state.branding).trim();
  const col = coloresDe(state);
  $('logoTinteUi').setAttribute('flood-color', estilo === 'secundario' ? col.secondary : col.primary);
  document.querySelectorAll<HTMLElement>('#logoEstilo [data-logo]').forEach((b) => {
    const on = b.dataset.logo === estilo;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', String(on));
  });
  const firma = state.branding.representante.firmaDataUrl;
  ($('firmaPreview') as HTMLImageElement).src = firma || '';
  $('firmaArea').classList.toggle('has-img', !!firma);
  ($('firmaClear') as HTMLElement).hidden = !firma;
}

function setupDrop(areaId: string, inputId: string, onFile: (f: File) => Promise<void>) {
  const area = $(areaId);
  const input = $in(inputId);
  area.addEventListener('click', () => input.click());
  area.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); input.click(); } });
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    if (f) await onFile(f);
    input.value = '';
  });
  area.addEventListener('dragover', (ev) => { ev.preventDefault(); area.classList.add('dragover'); });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', async (ev) => {
    ev.preventDefault();
    area.classList.remove('dragover');
    const f = ev.dataTransfer?.files?.[0];
    if (f && f.type.startsWith('image/')) await onFile(f);
  });
}

// ── Cobro ────────────────────────────────────────────────────────────────────

function faltantesCobro(): string[] {
  const f: string[] = [];
  if (!state.cliente?.nombre) f.push('Nombre del cliente (pestaña Cotización)');
  if (!state.cliente?.nit) f.push('NIT del cliente (pestaña Cotización)');
  if (!parseFecha(state.cobro?.desde ?? '') || !parseFecha(state.cobro?.hasta ?? '')) f.push('Período del trabajo (desde / hasta, dd-mm-aaaa)');
  if (!state.branding.banco) f.push('Cuenta bancaria (pestaña Mi marca)');
  if (!state.branding.contacto?.ciudad?.trim()) f.push('Tu ciudad (pestaña Mi marca → Contacto)');
  if (!state.branding.representante.nombre && !state.branding.nombreLegal) f.push('Tu nombre (pestaña Mi marca)');
  return f;
}

function renderCobroResumen() {
  const falt = faltantesCobro();
  const w = $('cobroFaltan');
  w.hidden = !falt.length;
  w.innerHTML = falt.length ? `Falta completar:<ul>${falt.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : '';
  const cc = cuentaDesdeCotizacion(state, today());
  $('cobroResumen').innerHTML = `<b>${escapeHtml(cc.cliente.nombre || 'Cliente')}</b> debe a <b>${escapeHtml(cc.emisor.nombre || 'ti')}</b> la suma de <b>${formatCOP(cc.valor)}</b>.<br>${escapeHtml(cc.concepto)}`;
}

// ── Guardadas ────────────────────────────────────────────────────────────────

function renderSavedList() {
  renderDashboard();
  const q = ($in('savedSearch').value || '').toLowerCase().trim();
  const all = loadSaved();
  const counts = new Map<string, number>();
  all.forEach((c) => counts.set(estadoDe(c), (counts.get(estadoDe(c)) ?? 0) + 1));
  $('savedFilters').innerHTML = [`<button class="chip${savedFilter === 'todas' ? ' active' : ''}" data-filter="todas">Todas (${all.length})</button>`]
    .concat(ESTADOS.filter((e) => counts.get(e)).map((e) =>
      `<button class="chip${savedFilter === e ? ' active' : ''}" data-filter="${e}">${ESTADO_LABELS[e]} (${counts.get(e)})</button>`)).join('');

  const list = all
    .filter((c) => savedFilter === 'todas' || estadoDe(c) === savedFilter)
    .filter((c) => !q || [c.numero, c.cliente?.nombre, c.alcance].join(' ').toLowerCase().includes(q))
    .sort((a, b) => b.numero.localeCompare(a.numero));
  const wrap = $('savedList');
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${all.length ? 'Nada coincide con la búsqueda.' : 'Aún no tienes cotizaciones guardadas.<br>Usa “Guardar” para tenerlas aquí.'}</div>`;
    return;
  }
  wrap.innerHTML = list.map((c) => {
    const e = estadoDe(c);
    return `<div class="saved-row${c.numero === state.numero ? ' current' : ''}">
      <div class="top"><span class="id">${escapeHtml(c.numero)}</span><span class="badge" style="--dot:${ESTADO_COLOR[e]}">${ESTADO_LABELS[e]}</span>
        <span class="who">${escapeHtml(c.cliente?.nombre || c.alcance || '—')}</span>${venceBadge(c)}</div>
      <div class="meta">${formatCOP(totalReal(c))} · ${escapeHtml(c.fecha)}${c.cliente?.nombre && c.alcance ? ' · ' + escapeHtml(c.alcance) : ''}</div>
      <div class="acts">
        <button data-num="${escapeHtml(c.numero)}" data-act="load">Abrir</button>
        <button data-num="${escapeHtml(c.numero)}" data-act="dup" title="Duplicar como nueva">⧉</button>
        <button data-num="${escapeHtml(c.numero)}" data-act="del" class="del" title="Eliminar">✕</button>
      </div></div>`;
  }).join('');
}

// ── Impuestos, descuento, anticipo y vigencia ────────────────────────────────

const parseNum = (v: string): number | undefined => {
  const n = parseFloat((v || '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};
const fmtNum = (n?: number) => (n == null ? '' : String(n).replace('.', ','));

function setImp(patch: Partial<NonNullable<Cotizacion['impuestos']>>) {
  state.impuestos = { ...state.impuestos, ...patch };
}

/** Pinta los controles de impuestos, el desglose, la vigencia y la parte a cobrar. */
function renderExtras() {
  const t = totales(state);
  const modo = state.impuestos?.ivaModo ?? 'ninguno';
  document.querySelectorAll<HTMLElement>('#ivaSeg [data-iva]').forEach((b) => {
    const on = b.dataset.iva === modo;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', String(on));
  });
  ($('ivaTasaWrap') as HTMLElement).hidden = modo === 'ninguno';
  $('descTipo').textContent = state.impuestos?.descuentoTipo === 'valor' ? '$' : '%';
  const dl = $('desglose');
  dl.hidden = !t.conDesglose;
  dl.innerHTML = t.conDesglose
    ? filasDesglose(t).map((r) => r.tipo === 'nota'
      ? `<dd class="nota">${escapeHtml(r.label)}</dd>`
      : `<dt${r.tipo === 'total' ? ' class="tot"' : ''}>${escapeHtml(r.label)}</dt><dd${r.tipo === 'total' ? ' class="tot"' : ''}>${r.value}</dd>`).join('')
    : '';
  const hasta = validaHasta(state);
  $('validaHint').textContent = hasta ? `Hasta el ${hasta}` : 'Sin fecha de vencimiento';
  ($('cobroParteWrap') as HTMLElement).hidden = !(t.anticipoPct > 0);
  const parte = state.cobro?.parte ?? 'total';
  document.querySelectorAll<HTMLElement>('#cobroParte [data-parte]').forEach((b) => b.classList.toggle('active', b.dataset.parte === parte));
}

// ── Catálogo de servicios ────────────────────────────────────────────────────

type CatItem = Omit<Item, 'id'>;
const CAT_KEY = 'cotizador:catalogo';
const loadJson = <T,>(k: string, def: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') as T; } catch { return def; } };
const saveJson = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('El navegador no tiene espacio para guardar', 'err'); } };
const catalogo = () => loadJson<CatItem[]>(CAT_KEY, []);

function guardarEnCatalogo(it: Item) {
  const { id: _id, ...rest } = it;
  const list = catalogo().filter((x) => x.titulo.trim().toLowerCase() !== it.titulo.trim().toLowerCase());
  saveJson(CAT_KEY, [rest, ...list].slice(0, 200));
  toast(`"${it.titulo || 'Ítem'}" quedó en tu catálogo`);
}

function openCatalog(anchor: HTMLElement) {
  closeIconPicker?.();
  const pop = document.createElement('div');
  pop.className = 'ip cat';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Catálogo de servicios');
  const paint = (q = '') => {
    const list = catalogo();
    const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const rows = list.map((x, i) => ({ x, i })).filter(({ x }) => !q || n(`${x.titulo} ${x.descripcion}`).includes(n(q)));
    (pop.querySelector('.cat-list') as HTMLElement).innerHTML = !list.length
      ? '<p class="ip-empty">Tu catálogo está vacío. En cualquier ítem usa el botón <b>Guardar en el catálogo</b> para reutilizarlo después.</p>'
      : !rows.length ? '<p class="ip-empty">Nada coincide con la búsqueda.</p>'
      : rows.map(({ x, i }) => `<div class="cat-row">
          <button type="button" class="cat-add" data-add="${i}"><img src="${buildIconDataUrl(x.iconKey, '#e8eaee')}" alt="" />
            <span><b>${escapeHtml(x.titulo || 'Sin título')}</b><small>${escapeHtml(x.descripcion || '')}</small></span>
            <em>${formatCOP(x.valor)}${unidadDe(x) ? ' / ' + escapeHtml(unidadDe(x)) : ''}</em></button>
          <button type="button" class="icon-btn danger" data-del="${i}" title="Quitar del catálogo" aria-label="Quitar del catálogo">${ICONS.trash}</button>
        </div>`).join('');
  };
  pop.innerHTML = `<div class="ip-head"><input class="ip-search" type="search" placeholder="Buscar en tu catálogo" aria-label="Buscar en el catálogo" /><button type="button" class="ip-x" aria-label="Cerrar">✕</button></div><div class="cat-list"></div>`;
  document.body.appendChild(pop);
  paint();
  const mobile = window.matchMedia('(max-width: 860px)').matches;
  if (mobile) pop.classList.add('sheet');
  else {
    const r = anchor.getBoundingClientRect();
    pop.style.left = `${Math.max(12, Math.min(window.innerWidth - pop.offsetWidth - 12, r.left))}px`;
    pop.style.top = `${Math.max(12, r.top - pop.offsetHeight - 8)}px`;
  }
  void pop.offsetWidth;
  pop.classList.add('on');
  const search = pop.querySelector('.ip-search') as HTMLInputElement;
  search.addEventListener('input', () => paint(search.value));
  const close = () => { pop.remove(); document.removeEventListener('pointerdown', onDoc, true); document.removeEventListener('keydown', onKey); if (closeIconPicker === close) closeIconPicker = null; };
  const onDoc = (ev: Event) => { if (!pop.contains(ev.target as Node) && !anchor.contains(ev.target as Node)) close(); };
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') close(); };
  pop.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement;
    if (t.closest('.ip-x')) { close(); return; }
    const del = t.closest<HTMLElement>('[data-del]')?.dataset.del;
    if (del != null) { const l = catalogo(); l.splice(Number(del), 1); saveJson(CAT_KEY, l); paint(search.value); return; }
    const add = t.closest<HTMLElement>('[data-add]')?.dataset.add;
    if (add == null) return;
    const x = catalogo()[Number(add)];
    if (!x) return;
    const before = cardRects();
    const nuevo: Item = { ...x, id: makeId() };
    // Si solo hay un ítem vacío, lo reemplaza
    if (state.items.length === 1 && !state.items[0].titulo && !state.items[0].descripcion && !state.items[0].valor) state.items = [];
    state.items.push(nuevo);
    renderItems();
    flip(before, nuevo.id);
    refresh();
    toast(`Agregaste "${x.titulo}"`);
    close();
    $('items').querySelector<HTMLElement>(`[data-id="${nuevo.id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  document.addEventListener('pointerdown', onDoc, true);
  document.addEventListener('keydown', onKey);
  closeIconPicker = close;
  if (!mobile) search.focus();
}

// ── Clientes guardados ───────────────────────────────────────────────────────

const CLI_KEY = 'cotizador:clientes';
const clientes = () => loadJson<Cliente[]>(CLI_KEY, []);

function recordarCliente(c: Cliente | undefined) {
  if (!c?.nombre?.trim()) return;
  const list = clientes().filter((x) => x.nombre.trim().toLowerCase() !== c.nombre.trim().toLowerCase());
  saveJson(CLI_KEY, [{ nombre: c.nombre.trim(), nit: c.nit ?? '', cel: c.cel ?? '' }, ...list].slice(0, 300));
  renderClientes();
}

function renderClientes() {
  $('clientesList').innerHTML = clientes().map((c) => `<option value="${escapeHtml(c.nombre)}">${escapeHtml(c.nit)}</option>`).join('');
}

/** Al elegir un cliente guardado, completa NIT y celular. */
function autocompletarCliente() {
  const nombre = $in('clienteNombre').value.trim().toLowerCase();
  const c = clientes().find((x) => x.nombre.trim().toLowerCase() === nombre);
  if (!c) return;
  state.cliente = { nombre: c.nombre, nit: c.nit, cel: c.cel };
  $in('clienteNit').value = c.nit;
  $in('clienteCel').value = c.cel ?? '';
  pulse($in('clienteNit'));
  refresh();
}

// ── Tablero de Guardadas ─────────────────────────────────────────────────────

/** Días que faltan para que venza la oferta (negativo = vencida), o null. */
function diasParaVencer(c: Cotizacion): number | null {
  const f = parseFecha(validaHasta(c));
  if (!f) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(f.y, f.m - 1, f.d).getTime() - hoy.getTime()) / 86400000);
}

function venceBadge(c: Cotizacion): string {
  if (estadoDe(c) !== 'enviada' && estadoDe(c) !== 'borrador') return '';
  const d = diasParaVencer(c);
  if (d == null) return '';
  if (d < 0) return '<span class="vence late">Vencida</span>';
  if (d <= 3) return `<span class="vence soon">${d === 0 ? 'Vence hoy' : `Vence en ${d} ${d === 1 ? 'día' : 'días'}`}</span>`;
  return '';
}

function renderDashboard() {
  const all = loadSaved();
  const sum = (e: Estado) => all.filter((c) => estadoDe(c) === e).reduce((a, c) => a + totalReal(c), 0);
  const count = (e: Estado) => all.filter((c) => estadoDe(c) === e).length;
  const card = (e: Estado, label: string, hint: string) => `
    <button type="button" class="dash-card" data-filter="${e}" style="--dot:${ESTADO_COLOR[e]}">
      <span>${label}</span><b>${formatCOP(sum(e))}</b><small>${count(e)} ${count(e) === 1 ? 'cotización' : 'cotizaciones'} · ${hint}</small>
    </button>`;
  $('dashboard').innerHTML = all.length ? card('enviada', 'Por aprobar', 'enviadas') + card('aprobada', 'Por cobrar', 'aprobadas') + card('cobrada', 'Esperando pago', 'cobradas') + card('pagada', 'Pagado', 'pagadas') : '';
}

// ── Compartir ────────────────────────────────────────────────────────────────

function mensajeCliente(): string {
  const t = totales(state);
  const hasta = validaHasta(state);
  const nombre = state.cliente?.nombre?.trim();
  return [
    `Hola${nombre ? ' ' + nombre : ''}, te comparto la ${(state.titulo || 'propuesta económica').toLowerCase()} N.º ${state.numero}`,
    state.alcance?.trim() ? `para: ${state.alcance.trim()}` : '',
    `Total: ${formatCOP(t.total)} COP${t.ivaModo === 'incluido' ? ' (IVA incluido)' : ''}.`,
    t.anticipoPct ? `Anticipo del ${t.anticipoPct}%: ${formatCOP(t.anticipo)}.` : '',
    hasta ? `La oferta es válida hasta el ${hasta}.` : '',
    '¡Quedo atento a tus comentarios!',
    state.branding.empresa || state.branding.representante.nombre || '',
  ].filter(Boolean).join('\n');
}

/**
 * Celular: comparte el PDF con el mensaje desde el menú del sistema (se elige WhatsApp y el chat).
 * PC: wa.me solo lleva texto, así que abre el chat con el mensaje y descarga el PDF para adjuntarlo.
 */
async function abrirWhatsApp() {
  const texto = mensajeCliente();
  const dig = (state.cliente?.cel ?? '').replace(/\D/g, '');
  const tel = dig.length === 10 && dig.startsWith('3') ? '57' + dig : dig;
  const movil = matchMedia('(pointer: coarse)').matches && typeof navigator.canShare === 'function';
  // La ventana se abre ya (dentro del clic); si se abre después de generar el PDF, el navegador la bloquea
  // (sin 'noopener': con él window.open devuelve null siempre y no sabríamos si la bloquearon)
  const chat = movil ? null : window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank');
  if (chat) chat.opener = null;
  toast('Preparando el PDF…');
  let pdf: File;
  try { pdf = await pdfParaCompartir(state); } catch (e) { console.error(e); toast('No se pudo crear el PDF', 'err'); return; }
  if (movil && navigator.canShare({ files: [pdf] })) {
    // Por si WhatsApp no pega el texto junto al archivo
    navigator.clipboard?.writeText(texto).catch(() => { /* sin permiso */ });
    try {
      await navigator.share({ files: [pdf], text: texto, title: `Cotización ${state.numero}` });
      toast('Listo. El mensaje también quedó copiado por si hace falta pegarlo.');
    } catch { /* canceló */ }
    return;
  }
  const url = URL.createObjectURL(pdf);
  const a = Object.assign(document.createElement('a'), { href: url, download: pdf.name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  if (!chat && !movil) toast('Tu navegador bloqueó la ventana de WhatsApp. El PDF se descargó.', 'err');
  else toast(`${pdf.name} descargado: arrástralo al chat de WhatsApp${tel ? '' : ' (agrega el celular del cliente para abrir su chat directo)'}`);
}

// ── Respaldo completo ────────────────────────────────────────────────────────

type Respaldo = {
  app: 'cotizador'; version: 1; fecha: string;
  guardadas: Cotizacion[]; borrador: Cotizacion; marca: Cotizacion['branding'];
  catalogo: CatItem[]; clientes: Cliente[]; paletas: unknown[];
};

function armarRespaldo(): Respaldo {
  return {
    app: 'cotizador', version: 1, fecha: new Date().toISOString(),
    guardadas: loadSaved(), borrador: state, marca: state.branding,
    catalogo: catalogo(), clientes: clientes(), paletas: loadJson<unknown[]>('cotizador:paletas', []),
  };
}

const esRespaldo = (d: any): d is Respaldo => d?.app === 'cotizador' && Array.isArray(d.guardadas);
const resumenRespaldo = (d: Respaldo) => `${d.guardadas.length} cotizaciones, ${d.catalogo?.length ?? 0} servicios y ${d.clientes?.length ?? 0} clientes`;

async function respaldar() {
  const data = armarRespaldo();
  const f = new Date();
  const name = `cotizador-respaldo-${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}.json`;
  await saveTextFile(JSON.stringify(data), name);
  toast(`Respaldo listo: ${resumenRespaldo(data)}`);
}

function restaurar(file: File) {
  const r = new FileReader();
  r.onload = async () => {
    let data: Respaldo;
    try { data = JSON.parse(String(r.result)); } catch { toast('El archivo no es un respaldo válido', 'err'); return; }
    if (!esRespaldo(data)) { toast('El archivo no es un respaldo del Cotizador', 'err'); return; }
    if (!(await confirmar({ titulo: 'Restaurar respaldo', mensaje: `Trae ${resumenRespaldo(data)}. Se combinan con lo que ya tienes; si un número se repite, gana el del respaldo.`, aceptar: 'Restaurar', icono: 'restore' }))) return;
    aplicarRespaldo(data);
    toast('Respaldo restaurado');
  };
  r.readAsText(file);
}

/** Combina un respaldo con lo que hay en el navegador (si un número se repite, gana el respaldo). */
function aplicarRespaldo(data: Respaldo) {
  const byNum = new Map(loadSaved().map((c) => [c.numero, c]));
  data.guardadas.forEach((c) => byNum.set(c.numero, c));
  saveJson('cotizador:saved', [...byNum.values()]);
  const mergeBy = <T,>(a: T[], b: T[], key: (x: T) => string) => { const m = new Map(a.map((x) => [key(x), x])); b.forEach((x) => m.set(key(x), x)); return [...m.values()]; };
  saveJson(CAT_KEY, mergeBy(catalogo(), data.catalogo ?? [], (x) => x.titulo.toLowerCase()));
  saveJson(CLI_KEY, mergeBy(clientes(), data.clientes ?? [], (x) => x.nombre.toLowerCase()));
  if (Array.isArray(data.paletas)) saveJson('cotizador:paletas', mergeBy(loadJson<{ primary: string; secondary: string }[]>('cotizador:paletas', []), data.paletas as { primary: string; secondary: string }[], (x) => x.primary + x.secondary));
  if (data.marca && !state.branding.representante.nombre) { state.branding = data.marca; saveBranding(data.marca); hydrateForm(); }
  renderClientes();
  renderSavedList();
  refresh();
}

// ── Respaldo en Google Drive ─────────────────────────────────────────────────

function hace(iso?: string): string {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `el ${new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

const cloud = (extra = '') => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>${extra}</svg>`;
const DRIVE_ICON = {
  off: cloud('<path d="M12 11v5"/><path d="M9.5 13.5h5"/>'),
  ok: cloud('<path d="m9.5 14 2 2 3.5-3.5"/>'),
  subiendo: cloud('<path d="M12 17v-5"/><path d="m9.5 14 2.5-2.5 2.5 2.5"/>'),
  pendiente: cloud('<path d="M12 11.5v2.5"/><path d="M12 17h.01"/>'),
};

/** off: sin conectar · ok: al día · subiendo · pendiente: hay cambios sin respaldar o falló. */
type DriveEstado = keyof typeof DRIVE_ICON;
let driveEstado: DriveEstado = 'off';
let driveSugerido = false;
const lsNum = (k: string) => { try { return Number(localStorage.getItem(k) || 0); } catch { return 0; } };
const NUDGE_KEY = 'cotizador:driveNudge';

function setDriveEstado(e: DriveEstado) { driveEstado = e; renderDrive(); }

function renderDrive() {
  if (!driveDisponible()) return;
  const info = driveInfo();
  if (!info.conectado) driveEstado = 'off';
  else if (driveEstado === 'off') driveEstado = 'ok';

  const chip = $('driveChip');
  chip.hidden = false;
  chip.dataset.state = driveEstado;
  chip.querySelector('.drive-ic')!.innerHTML = DRIVE_ICON[driveEstado];
  chip.querySelector('.drive-label')!.textContent =
    { off: 'Respaldar', ok: 'En Drive', subiendo: 'Subiendo…', pendiente: 'Sin respaldar' }[driveEstado];
  chip.title = {
    off: 'Respalda tus cotizaciones en Google Drive',
    ok: `Respaldado en Google Drive ${hace(info.ultimo)}`,
    subiendo: 'Subiendo el respaldo a Google Drive…',
    pendiente: 'Hay cambios sin respaldar. Toca para respaldar ahora.',
  }[driveEstado];

  $('driveStatus').innerHTML = info.conectado
    ? `<b>Conectado.</b> ${info.ultimo ? `Último respaldo ${hace(info.ultimo)}.` : 'Todavía no hay respaldo.'}${driveEstado === 'pendiente' ? ' Hay cambios sin respaldar.' : ''}`
    : 'No conectado. Tus cotizaciones solo están en este navegador.';
  $('driveStatus').classList.toggle('on', info.conectado);
  ($('driveConnect') as HTMLElement).hidden = info.conectado;
  for (const id of ['driveSync', 'driveRestore', 'driveDisconnect']) ($(id) as HTMLElement).hidden = !info.conectado;
  $('driveBtn').textContent = info.conectado ? 'Google Drive: conectado' : 'Respaldo en Google Drive…';

  // Aviso en Guardadas: solo si hay algo que perder y no lo pospuso hace poco
  const n = loadSaved().length;
  const pospuesto = lsNum(NUDGE_KEY) > Date.now() - 14 * 864e5;
  $('driveNudge').hidden = info.conectado || n === 0 || pospuesto;
  $('driveNudgeTitle').textContent = n === 1 ? 'Tu cotización solo está en este navegador' : `Tus ${n} cotizaciones solo están en este navegador`;
}

/** Una vez por sesión, al guardar sin Drive, el aviso de "guardada" ofrece conectarlo. */
function driveSugerir(): boolean {
  if (!driveDisponible() || driveInfo().conectado || driveSugerido) return false;
  driveSugerido = true;
  return true;
}

function abrirDrive() {
  prepararDrive().catch(() => toast('No se pudo cargar Google. Revisa la conexión.', 'err'));
  renderDrive();
  abrirModal($('driveModal'));
}

function driveError(e: unknown) {
  console.error(e);
  toast(e instanceof Error ? e.message : 'Algo falló con Google Drive', 'err');
  if (driveInfo().conectado) driveEstado = 'pendiente';
  renderDrive();
}

/** Respaldo automático después de guardar o borrar. `interactivo`: dentro de un clic puede renovar el permiso. */
function driveAuto(interactivo: boolean) {
  if (!driveDisponible()) return;
  if (!driveInfo().conectado) { renderDrive(); return; }
  if (!interactivo && !driveTokenVigente()) { setDriveEstado('pendiente'); return; }
  setDriveEstado('subiendo');
  subirRespaldo(() => JSON.stringify(armarRespaldo()), interactivo)
    .then(() => setDriveEstado('ok'))
    .catch((e) => {
      setDriveEstado('pendiente');
      if (e instanceof DriveAuthError) toast(`No se respaldó en Drive: ${e.message}`, 'err', { label: 'Reintentar', run: () => driveAuto(true) });
      else driveError(e);
    });
}

function initDrive() {
  if (!driveDisponible()) return;
  ($('driveBtn') as HTMLElement).hidden = false;
  const overlay = $('driveModal');
  const close = () => cerrarModal(overlay);
  const busy = async (btn: HTMLElement, fn: () => Promise<void>) => {
    btn.setAttribute('aria-busy', 'true');
    try { await fn(); } catch (e) { driveError(e); } finally { btn.removeAttribute('aria-busy'); renderDrive(); }
  };
  $('driveBtn').addEventListener('click', abrirDrive);
  // El indicador: con cambios pendientes respalda de una vez; si no, abre la ventana
  $('driveChip').addEventListener('click', () => { if (driveEstado === 'pendiente') driveAuto(true); else abrirDrive(); });
  $('driveNudgeBtn').addEventListener('click', abrirDrive);
  $('driveNudgeLater').addEventListener('click', () => {
    try { localStorage.setItem(NUDGE_KEY, String(Date.now())); } catch { /* sin storage */ }
    renderDrive();
  });
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
  $('driveClose').addEventListener('click', close);
  $('driveConnect').addEventListener('click', () => busy($('driveConnect'), async () => {
    await prepararDrive();
    const r = await conectarDrive();
    if (r.existe) {
      const data = await bajarRespaldo(false);
      if (esRespaldo(data) && await confirmar({ titulo: 'Ya tienes un respaldo en Drive', mensaje: `Es de ${hace(r.fecha)} y trae ${resumenRespaldo(data)}. ¿Lo traes a este navegador? Se combina con lo que ya tienes.`, aceptar: 'Traerlo', cancelar: 'No, gracias', icono: 'cloud' })) aplicarRespaldo(data);
    }
    setDriveEstado('subiendo');
    await subirRespaldo(() => JSON.stringify(armarRespaldo()), false);
    driveEstado = 'ok';
    toast('Drive conectado: cada vez que guardes se respalda solo');
    void close();
  }));
  $('driveSync').addEventListener('click', () => busy($('driveSync'), async () => {
    setDriveEstado('subiendo');
    await subirRespaldo(() => JSON.stringify(armarRespaldo()), true);
    driveEstado = 'ok';
    toast('Respaldado en Google Drive');
  }));
  $('driveRestore').addEventListener('click', () => busy($('driveRestore'), async () => {
    const data = await bajarRespaldo(true);
    if (!esRespaldo(data)) { toast('No hay un respaldo en tu Drive todavía', 'err'); return; }
    if (!(await confirmar({ titulo: 'Traer desde Drive', mensaje: `Trae ${resumenRespaldo(data)}. Se combinan con lo que ya tienes; si un número se repite, gana el de Drive.`, aceptar: 'Traer', icono: 'cloud' }))) return;
    aplicarRespaldo(data);
    toast('Respaldo de Drive restaurado');
  }));
  $('driveDisconnect').addEventListener('click', async () => {
    if (!(await confirmar({ titulo: '¿Desconectar Google Drive?', mensaje: 'El respaldo sigue en tu Drive, pero ya no se actualizará cuando guardes.', aceptar: 'Desconectar', peligro: true, icono: 'unplug' }))) return;
    desconectarDrive();
    renderDrive();
    toast('Drive desconectado');
  });
  // Al salir de la pestaña, sube lo pendiente si el permiso sigue vigente
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && driveEstado === 'pendiente') driveAuto(false); });
  // El texto "hace X min" se mantiene al día
  window.setInterval(() => { if (driveEstado === 'ok') renderDrive(); }, 60_000);
  if (driveInfo().conectado) prepararDrive().catch(() => { /* sin conexión */ });
  renderDrive();
}

// ── App instalable (PWA) y actualizaciones ───────────────────────────────────

const INSTALL_KEY = 'cotizador:installNudge';
let installEvent: any = null;

const esStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
const esIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function renderInstall() {
  const puede = !esStandalone() && (!!installEvent || esIos());
  const pospuesto = lsNum(INSTALL_KEY) > Date.now() - 30 * 864e5;
  ($('installBtn') as HTMLElement).hidden = !puede;
  ($('installChip') as HTMLElement).hidden = !puede || pospuesto;
}

async function instalar() {
  if (installEvent) {
    installEvent.prompt();
    const r = await installEvent.userChoice.catch(() => null);
    installEvent = null;
    // Si dijo que no, el botón de arriba descansa un mes (sigue en Más)
    if (r?.outcome !== 'accepted') { try { localStorage.setItem(INSTALL_KEY, String(Date.now())); } catch { /* */ } }
  } else if (esIos()) {
    abrirModal($('iosModal'));
    try { localStorage.setItem(INSTALL_KEY, String(Date.now())); } catch { /* */ }
  }
  renderInstall();
}

/**
 * Cada build genera un sw.js distinto (src/pages/sw.js.ts). El navegador lo revisa al abrir
 * la app y aquí también al volver a la pestaña y cada 30 min. La versión nueva queda en
 * espera hasta que la persona toca "Actualizar": así no cambia nada mientras edita.
 */
function initActualizaciones() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  let actualizando = false;
  const avisar = (w: ServiceWorker | null) => {
    if (!w || !navigator.serviceWorker.controller) return; // primera visita: no es una actualización
    $('updateBar').hidden = false;
    $('updateBtn').onclick = () => {
      actualizando = true;
      try { saveDraft(state); } catch { /* sin storage */ }
      w.postMessage('activar');
      window.setTimeout(() => location.reload(), 3000); // por si el evento no llega
    };
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (actualizando) location.reload(); });
  navigator.serviceWorker.register('/sw.js').then((reg) => {
    avisar(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed') avisar(w); });
    });
    const revisar = () => { reg.update().catch(() => { /* sin conexión */ }); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') revisar(); });
    window.setInterval(revisar, 30 * 60_000);
  }).catch(() => { /* sin modo offline */ });
}

function initPwa() {
  initActualizaciones();
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    installEvent = ev;
    renderInstall();
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    renderInstall();
    toast('Listo: el Cotizador quedó instalado como app');
  });
  $('installBtn').addEventListener('click', instalar);
  $('installChip').addEventListener('click', instalar);
  const ios = $('iosModal');
  $('iosClose').addEventListener('click', () => cerrarModal(ios));
  ios.addEventListener('click', (ev) => { if (ev.target === ios) cerrarModal(ios); });
  renderInstall();
}

function initExtras() {
  $('ivaSeg').addEventListener('click', (ev) => {
    const m = (ev.target as HTMLElement).closest<HTMLElement>('[data-iva]')?.dataset.iva as 'ninguno' | 'agregar' | 'incluido' | undefined;
    if (!m) return;
    setImp({ ivaModo: m });
    renderItems();
    refresh();
  });
  $('descTipo').addEventListener('click', () => {
    setImp({ descuentoTipo: state.impuestos?.descuentoTipo === 'valor' ? 'porcentaje' : 'valor' });
    refresh();
  });
  $('cobroParte').addEventListener('click', (ev) => {
    const p = (ev.target as HTMLElement).closest<HTMLElement>('[data-parte]')?.dataset.parte as 'total' | 'anticipo' | 'saldo' | undefined;
    if (!p) return;
    state.cobro = { ...state.cobro, parte: p };
    refresh();
  });
  $('fromCatalog').addEventListener('click', (ev) => { ev.stopPropagation(); openCatalog($('fromCatalog')); });
  $in('clienteNombre').addEventListener('change', autocompletarCliente);
  $('dashboard').addEventListener('click', (ev) => {
    const f = (ev.target as HTMLElement).closest<HTMLElement>('[data-filter]')?.dataset.filter;
    if (!f) return;
    savedFilter = f as Estado;
    renderSavedList();
  });
  $('waBtn').addEventListener('click', abrirWhatsApp);
  $('shareBtn').addEventListener('click', async () => {
    toast('Preparando imagen…');
    try {
      const shared = await sharePng(state, mensajeCliente());
      if (!shared) toast('Tu navegador no comparte archivos: la imagen se descargó');
    } catch (e) { console.error(e); toast('No se pudo compartir', 'err'); }
  });
  $('backupBtn').addEventListener('click', () => { respaldar().catch(() => toast('No se pudo crear el respaldo', 'err')); });
  const restoreInput = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json', hidden: true });
  document.body.appendChild(restoreInput);
  restoreInput.addEventListener('change', () => { const f = restoreInput.files?.[0]; restoreInput.value = ''; if (f) restaurar(f); });
  $('restoreBtn').addEventListener('click', () => restoreInput.click());
  renderClientes();
  initPwa();
  initDrive();
  initSincronizacion();
  initTeclado();
  initAtras();
}

/**
 * Gesto / botón atrás en el celular (sobre todo en la app instalada, donde sin historial
 * cierra la app). Atrás cierra primero lo que esté abierto, luego vuelve de la vista previa
 * o a la pestaña anterior; en la pantalla inicial pide un segundo gesto para salir.
 */
function initAtras() {
  if (!matchMedia('(pointer: coarse)').matches && !esStandalone()) return;
  const abierto = () => document.querySelector('.modal-overlay:not([hidden]):not(.closing), #moreMenu:not([hidden]), .ip, .cp, .driver-popover');
  const atras = (): boolean => {
    if (abierto()) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return true; }
    if ((document.querySelector('.app') as HTMLElement).dataset.view === 'preview') { setView('edit'); return true; }
    const prev = pilaTabs.pop();
    if (prev) { volviendoTab = true; showTab(prev); volviendoTab = false; return true; }
    return false;
  };
  // Una entrada "guardia" en el historial: atrás la consume y aquí se decide qué hacer
  if (history.state?.cot !== 'guardia') {
    history.replaceState({ cot: 'base' }, '');
    history.pushState({ cot: 'guardia' }, '');
  }
  let salirHasta = 0;
  window.addEventListener('popstate', () => {
    if (atras()) { history.pushState({ cot: 'guardia' }, ''); return; }
    if (Date.now() < salirHasta) { history.back(); return; } // segundo gesto: ahora sí sale
    salirHasta = Date.now() + 2000;
    toast('Desliza atrás otra vez para salir');
    history.pushState({ cot: 'guardia' }, '');
  });
}

/**
 * Teclado del celular: la app se encoge (interactive-widget=resizes-content) y aquí se marca
 * html.teclado para esconder las barras de abajo. Si el navegador dejó la página corrida
 * (pasa en la app instalada al cerrar el teclado), se devuelve a su lugar.
 */
function initTeclado() {
  const vv = window.visualViewport;
  let alto = vv?.height ?? innerHeight;
  const ajustar = () => {
    const h = vv?.height ?? innerHeight;
    const enCampo = !!(document.activeElement as HTMLElement | null)?.matches?.('input, textarea, [contenteditable]');
    // Sin un campo activo no hay teclado: esa es la altura completa de referencia
    if (!enCampo || h > alto) alto = h;
    document.documentElement.classList.toggle('teclado', enCampo && h < alto - 120);
    const se = document.scrollingElement;
    if (se && se.scrollTop !== 0) se.scrollTop = 0;
  };
  vv?.addEventListener('resize', ajustar);
  window.addEventListener('resize', ajustar);
  vv?.addEventListener('scroll', () => { if (!document.documentElement.classList.contains('teclado')) ajustar(); });
  document.addEventListener('focusout', () => setTimeout(ajustar, 250));
  window.addEventListener('orientationchange', () => { alto = 0; setTimeout(ajustar, 400); });
  document.addEventListener('focusin', () => setTimeout(ajustar, 300));
}

/**
 * La app instalada y las pestañas del navegador comparten localStorage, pero cada ventana
 * dibuja su lista al abrir. Si otra ventana guarda, borra o restaura, aquí se refresca sola.
 */
function initSincronizacion() {
  window.addEventListener('storage', (ev) => {
    if (ev.key === null || ev.key === 'cotizador:saved') { renderSavedList(); renderDrive(); }
    if (ev.key === null || ev.key === CLI_KEY) renderClientes();
    if (ev.key === 'cotizador:drive') renderDrive();
  });
  // Al volver a la app (otra pestaña, segundo plano en el celular) la lista se pone al día
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') renderSavedList(); });
}

// ── Formulario ───────────────────────────────────────────────────────────────

const FIELDS: [string, () => string, (v: string) => void][] = [
  ['numero', () => state.numero, (v) => { state.numero = v; }],
  ['fecha', () => state.fecha, (v) => { state.fecha = v; }],
  ['titulo', () => state.titulo ?? '', (v) => { state.titulo = v; }],
  ['clienteNombre', () => state.cliente?.nombre ?? '', (v) => { state.cliente = { nit: '', ...state.cliente, nombre: v }; }],
  ['clienteNit', () => state.cliente?.nit ?? '', (v) => { state.cliente = { nombre: '', ...state.cliente, nit: v }; }],
  ['clienteCel', () => state.cliente?.cel ?? '', (v) => { state.cliente = { nombre: '', nit: '', ...state.cliente, cel: v }; }],
  ['vigencia', () => fmtNum(state.vigenciaDias), (v) => { const n = parseNum(v); state.vigenciaDias = n && n > 0 ? Math.round(n) : undefined; }],
  ['ivaTasa', () => fmtNum(state.impuestos?.ivaTasa), (v) => { setImp({ ivaTasa: parseNum(v) }); }],
  ['descuento', () => fmtNum(state.impuestos?.descuento), (v) => { setImp({ descuento: parseNum(v) }); }],
  ['anticipo', () => fmtNum(state.impuestos?.anticipo), (v) => { setImp({ anticipo: parseNum(v) }); }],
  ['alcance', () => state.alcance, (v) => { state.alcance = v; }],
  ['tiempoEntrega', () => state.tiempoEntrega, (v) => { state.tiempoEntrega = v; }],
  ['empresa', () => state.branding.empresa ?? '', (v) => { state.branding.empresa = v; }],
  ['repNombre', () => state.branding.representante.nombre, (v) => { state.branding.representante.nombre = v; }],
  ['repCedula', () => state.branding.representante.cedula, (v) => { state.branding.representante.cedula = v; }],
  ['cWeb', () => state.branding.contacto.web, (v) => { state.branding.contacto.web = v; }],
  ['cEmail', () => state.branding.contacto.email, (v) => { state.branding.contacto.email = v; }],
  ['cCel', () => state.branding.contacto.cel, (v) => { state.branding.contacto.cel = v; }],
  ['cCiudad', () => state.branding.contacto.ciudad, (v) => { state.branding.contacto.ciudad = v; }],
  ['cPais', () => state.branding.contacto.pais, (v) => { state.branding.contacto.pais = v; }],
  ['banco', () => state.branding.banco ?? '', (v) => { state.branding.banco = v; }],
  ['nombreLegal', () => state.branding.nombreLegal ?? '', (v) => { state.branding.nombreLegal = v; }],
  ['direccion', () => state.branding.direccion ?? '', (v) => { state.branding.direccion = v; }],
  ['cobroDesde', () => state.cobro?.desde ?? '', (v) => { state.cobro = { ...state.cobro, desde: v }; }],
  ['cobroHasta', () => state.cobro?.hasta ?? '', (v) => { state.cobro = { ...state.cobro, hasta: v }; }],
  ['cobroFecha', () => state.cobro?.fecha || today(), (v) => { state.cobro = { ...state.cobro, fecha: v }; }],
  ['cobroConcepto', () => state.cobro?.concepto ?? '', (v) => { state.cobro = { ...state.cobro, concepto: v }; }],
];

/** Breve animación para señalar que un valor cambió. */
function pulse(el: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', color: '#f2d22b' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
}

// ── Términos como lista editable ─────────────────────────────────────────────
function renderTerminos(focusIdx?: number) {
  const wrap = $('terminosList');
  if (!state.terminos.length) {
    wrap.innerHTML = '<p class="hint">Sin términos. Ejemplos: forma de pago, vigencia de la oferta, número de revisiones.</p>';
    return;
  }
  wrap.innerHTML = state.terminos.map((t, i) => `
    <div class="term-row">
      <span class="term-dot" aria-hidden="true"></span>
      <textarea class="auto" rows="1" data-term="${i}" aria-label="Término ${i + 1}" placeholder="Ej. 50% para iniciar y 50% contra entrega">${escapeHtml(t)}</textarea>
      <button type="button" class="icon-btn danger" data-del-term="${i}" title="Quitar término" aria-label="Quitar término ${i + 1}">${ICONS.trash}</button>
    </div>`).join('');
  requestAnimationFrame(() => {
    wrap.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(autosize);
    if (focusIdx != null) {
      const ta = wrap.querySelector<HTMLTextAreaElement>(`[data-term="${focusIdx}"]`);
      ta?.focus();
      ta?.closest('.term-row')?.classList.add('enter');
    }
  });
}

function hydrateForm() {
  for (const [id, get] of FIELDS) $in(id).value = get();
  $in('costoAuto').checked = state.costoTotalAuto;
  $in('aceptacionCliente').checked = !!state.aceptacionCliente;
  $in('iconosItems').checked = state.iconosItems !== false;
  costoMoney?.paint();
  renderEstado();
  renderTerminos();
  paintImages();
  renderItems();
  renderDesign();
}

function load(c: Cotizacion, msg?: string) {
  state = normalize(c);
  collapsedItems.clear();
  hydrateForm();
  refresh();
  if (msg) toast(msg);
}

// ── Init ─────────────────────────────────────────────────────────────────────

export function initEditor() {
  const draft = loadDraft();
  const branding = loadBranding();
  const initial = draft ?? nuevaCotizacion(nextNumero());
  if (branding && !draft) initial.branding = branding;
  state = normalize(initial);

  // Fechas dd-mm-aaaa con máscara y calendario (antes de FIELDS, para que lean el valor ya formateado)
  document.querySelectorAll<HTMLInputElement>('input[data-date]').forEach((el) => dateField(el, () => el.dispatchEvent(new Event('change'))));
  // Campos numéricos: solo dígitos y una coma; nada de negativos. Porcentajes hasta 100.
  const NUMERICOS: Record<string, number | undefined> = { vigencia: undefined, ivaTasa: 100, descuento: undefined, anticipo: 100 };
  for (const [id, , set] of FIELDS) {
    const el = $in(id);
    const tope = NUMERICOS[id];
    const h = () => {
      if (id in NUMERICOS) {
        const limpio = el.value.replace(/[^\d.,]/g, '').replace(/,(?=.*,)/g, '');
        if (limpio !== el.value) el.value = limpio;
        const n = parseFloat(limpio.replace(/\./g, '').replace(',', '.'));
        const esPct = id !== 'descuento' || state.impuestos?.descuentoTipo !== 'valor';
        if (tope != null && n > tope) el.value = String(tope);
        else if (id === 'descuento' && esPct && n > 100) el.value = '100';
      }
      set(el.value);
      refresh();
    };
    el.addEventListener('input', h);
    el.addEventListener('change', h);
  }
  costoMoney = moneyField($in('costoTotal'), () => state.costoTotal, (v) => { state.costoTotal = v; refresh(); }, 50000);
  $in('costoAuto').addEventListener('change', () => { state.costoTotalAuto = $in('costoAuto').checked; refresh(); costoMoney?.paint(); });

  // Textareas que crecen con el contenido
  document.addEventListener('input', (ev) => {
    const t = ev.target as HTMLElement;
    if (t instanceof HTMLTextAreaElement && t.classList.contains('auto')) autosize(t);
  });

  // Términos
  const terms = $('terminosList');
  terms.addEventListener('input', (ev) => {
    const t = ev.target as HTMLTextAreaElement;
    if (t.dataset.term == null) return;
    state.terminos[Number(t.dataset.term)] = t.value.replace(/\n/g, ' ');
    refresh();
  });
  terms.addEventListener('keydown', (ev) => {
    const t = ev.target as HTMLTextAreaElement;
    if (t.dataset.term == null || ev.key !== 'Enter') return;
    // Enter crea el siguiente término; Shift+Enter no aplica (los términos son de una línea)
    ev.preventDefault();
    const i = Number(t.dataset.term) + 1;
    state.terminos.splice(i, 0, '');
    renderTerminos(i);
    refresh();
  });
  terms.addEventListener('click', (ev) => {
    const del = (ev.target as HTMLElement).closest<HTMLElement>('[data-del-term]')?.dataset.delTerm;
    if (del == null) return;
    const i = Number(del);
    const [quitado] = state.terminos.splice(i, 1);
    renderTerminos();
    refresh();
    if (quitado?.trim()) toast('Término quitado', 'ok', { label: 'Deshacer', run: () => { state.terminos.splice(i, 0, quitado); renderTerminos(); refresh(); } });
  });
  $('addTermino').addEventListener('click', () => {
    state.terminos.push('');
    renderTerminos(state.terminos.length - 1);
  });

  // Pestañas
  document.querySelectorAll<HTMLElement>('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab!)));
  let lastTab = 'cotizacion';
  try { lastTab = localStorage.getItem('cotizador:tab') || lastTab; } catch { /* */ }
  const tabUrl = new URLSearchParams(location.search).get('tab');
  if (tabUrl) { lastTab = tabUrl; history.replaceState(history.state, '', location.pathname); }
  if (!document.querySelector(`.tab[data-tab="${lastTab}"]`)) lastTab = 'cotizacion';

  // Estado
  $('estadoGroup').addEventListener('click', (ev) => {
    const e = (ev.target as HTMLElement).closest<HTMLElement>('[data-estado]')?.dataset.estado as Estado | undefined;
    if (!e) return;
    state.estado = e;
    renderEstado();
    refresh();
  });

  // Ítems
  $('addItem').addEventListener('click', () => {
    const before = cardRects();
    const nuevo = { id: makeId(), iconKey: state.items.at(-1)?.iconKey ?? 'code', titulo: '', descripcion: '', valor: 0 };
    state.items.push(nuevo);
    renderItems();
    flip(before, nuevo.id);
    refresh();
    const card = $('items').querySelector<HTMLElement>(`[data-id="${nuevo.id}"]`);
    card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card?.querySelector<HTMLInputElement>('input[data-action=titulo]')?.focus({ preventScroll: true });
  });
  $('toggleAllItems').addEventListener('click', () => {
    const all = state.items.every((it) => collapsedItems.has(it.id));
    state.items.forEach((it) => (all ? collapsedItems.delete(it.id) : collapsedItems.add(it.id)));
    renderItems();
  });
  (['precio', 'titulo', 'tipo'] as SortField[]).forEach((f) => $(`sort-${f}`).addEventListener('click', () => applySort(f)));

  // Diseño y colores
  $('designGallery').addEventListener('click', (ev) => {
    const id = (ev.target as HTMLElement).closest<HTMLElement>('[data-diseno]')?.dataset.diseno as DisenoId | undefined;
    if (!id) return;
    state.diseno = id;
    renderDesign();
    refresh();
  });
  const onColor = (which: 'primary' | 'secondary', v: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    const c = coloresDe(state);
    setColores(which === 'primary' ? v : c.primary, which === 'secondary' ? v : c.secondary);
  };
  for (const which of ['primary', 'secondary'] as const) {
    const btn = $(which === 'primary' ? 'colorPrimaryBtn' : 'colorSecondaryBtn');
    const other = which === 'primary' ? 'secondary' : 'primary';
    btn.addEventListener('click', () => openColorPicker(btn, coloresDe(state)[which], which === 'primary' ? 'Color principal' : 'Color secundario', (hex) => onColor(which, hex),
      (hex) => {
        const r = contrast(hex, coloresDe(state)[other]);
        const lvl = r >= 4.5 ? 'bien' : r >= 3 ? 'justo' : 'bajo';
        return `<span class="cp-ct ${lvl}">Contraste con el ${other === 'primary' ? 'principal' : 'secundario'}: <b>${r.toFixed(1).replace('.', ',')}:1</b> ${lvl === 'bien' ? '✓' : lvl === 'justo' ? '· justo' : '· bajo'}</span>`;
      }));
  }
  $('contrastBox').addEventListener('click', (ev) => {
    const fix = (ev.target as HTMLElement).closest<HTMLElement>('[data-fix]')?.dataset.fix;
    if (!fix) return;
    const c = coloresDe(state);
    if (fix === 'swap') setColores(c.secondary, c.primary);
    else if (fix === 'suggest') { const d = DISENOS.find((x) => x.id === disenoDe(state))!; setColores(d.colores.primary, d.colores.secondary); }
    else setColores(c.primary, fix);
    toast('Colores ajustados');
  });
  $('paletteRow').addEventListener('click', (ev) => {
    const i = (ev.target as HTMLElement).closest<HTMLElement>('[data-paleta]')?.dataset.paleta;
    if (i == null) return;
    const p = PALETAS[Number(i)];
    setColores(p.primary, p.secondary);
  });
  $('myPalettes').addEventListener('click', async (ev) => {
    const t = ev.target as HTMLElement;
    const del = t.closest<HTMLElement>('[data-del]')?.dataset.del;
    if (del != null) {
      const idx = Number(del);
      await burbuja(t.closest('.palette-wrap'), false);
      const list = misPaletas();
      const [quitada] = list.splice(idx, 1);
      guardarPaletas(list);
      renderDesign();
      toast('Paleta quitada', 'ok', {
        label: 'Deshacer',
        run: () => {
          const l = misPaletas();
          l.splice(idx, 0, quitada);
          guardarPaletas(l);
          renderDesign();
          burbuja($('myPalettes').children[idx] ?? null, true);
        },
      });
      return;
    }
    const i = t.closest<HTMLElement>('[data-mia]')?.dataset.mia;
    if (i == null) return;
    const p = misPaletas()[Number(i)];
    if (p) setColores(p.primary, p.secondary);
  });
  $('savePalette').addEventListener('click', () => {
    const c = coloresDe(state);
    guardarPaletas([{ primary: c.primary.toUpperCase(), secondary: c.secondary.toUpperCase() }, ...misPaletas()]);
    renderDesign();
    burbuja($('myPalettes').querySelector('.palette-wrap'), true);
    toast('Paleta guardada en este navegador');
  });
  $('swapColors').addEventListener('click', () => { const c = coloresDe(state); setColores(c.secondary, c.primary); });
  $('suggestColors').addEventListener('click', () => {
    const d = DISENOS.find((x) => x.id === disenoDe(state))!;
    setColores(d.colores.primary, d.colores.secondary);
  });

  // Logo y firma
  // Logo y firma entran y salen con la misma animación tipo burbuja de las paletas
  setupDrop('logoArea', 'logoFile', async (f) => { state.branding.logoDataUrl = await imageToDataUrl(f, 700); paintImages(); refresh(); burbuja($('logoPreview'), true); });
  setupDrop('firmaArea', 'firmaFile', async (f) => { state.branding.representante.firmaDataUrl = await imageToDataUrl(f, 900); paintImages(); refresh(); burbuja($('firmaPreview'), true); });
  $('logoClear').addEventListener('click', async () => {
    await burbuja($('logoPreview'), false);
    state.branding.logoDataUrl = undefined;
    paintImages();
    refresh();
    burbuja($('logoArea').querySelector('.drop-empty'), true);
  });
  $('logoEstilo').addEventListener('click', (ev) => {
    const v = (ev.target as HTMLElement).closest<HTMLElement>('[data-logo]')?.dataset.logo as Cotizacion['branding']['logoEstilo'];
    if (!v) return;
    state.branding.logoEstilo = v === 'original' ? undefined : v;
    paintImages();
    refresh();
  });
  $in('iconosItems').addEventListener('change', () => { state.iconosItems = $in('iconosItems').checked ? undefined : false; refresh(); });
  $in('aceptacionCliente').addEventListener('change', () => { state.aceptacionCliente = $in('aceptacionCliente').checked || undefined; refresh(); });
  $('firmaClear').addEventListener('click', async () => {
    await burbuja($('firmaPreview'), false);
    state.branding.representante.firmaDataUrl = undefined;
    paintImages();
    refresh();
    burbuja($('firmaArea').querySelector('.drop-empty'), true);
  });

  // Cuenta de cobro
  const cuenta = async () => {
    const falt = faltantesCobro();
    if (falt.length) { showTab('cobro'); toast('Completa los datos que faltan para la cuenta de cobro', 'err'); return; }
    try {
      await printCuentaCobro(state);
      if ($in('cobroMarcar').checked && estadoDe(state) !== 'pagada') {
        state.estado = 'cobrada';
        renderEstado();
        refresh();
        persistSaved(state);
      }
    } catch (e) { console.error(e); toast('No se pudo generar la cuenta de cobro', 'err'); }
  };
  $('cuentaBtn').addEventListener('click', cuenta);

  // Acciones
  $('saveBtn').addEventListener('click', () => {
    try {
      persistSaved(state);
      recordarCliente(state.cliente);
      const msg = `Cotización ${state.numero} guardada`;
      if (driveSugerir()) toast(msg, 'ok', { label: 'Respaldar en Drive', run: abrirDrive }); else toast(msg);
      renderSavedList();
    }
    catch { toast('No hay espacio en el navegador para guardar', 'err'); return; }
    driveAuto(true);
  });
  $('newBtn').addEventListener('click', async () => {
    if (!(await confirmar({ titulo: '¿Empezar una cotización nueva?', mensaje: 'Lo que no hayas guardado de la actual se perderá. Si quieres conservarla, toca Guardar primero.', aceptar: 'Empezar nueva', icono: 'doc' }))) return;
    const keep = { diseno: state.diseno, colores: coloresDe(state), terminos: state.terminos, tiempoEntrega: state.tiempoEntrega };
    const c = nuevaCotizacion(nextNumero());
    c.branding = loadBranding() ?? state.branding;
    Object.assign(c, keep);
    load(c, `Cotización ${c.numero} lista`);
    showTab('cotizacion');
  });
  // PDF: se descarga directo (imagen + capa de texto seleccionable, ver pdfParaCompartir).
  // El de imprimir (vectorial) queda en Más: en Android y en algunos navegadores abre la impresora.
  const pdfImprimir = async () => {
    try { await exportPdf(state); }
    catch (e) { console.error(e); toast('Error generando el PDF', 'err'); }
  };
  $('pdfBtn').addEventListener('click', async () => {
    toast('Preparando el PDF…');
    try {
      const pdf = await pdfParaCompartir(state);
      const url = URL.createObjectURL(pdf);
      Object.assign(document.createElement('a'), { href: url, download: pdf.name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast(`${pdf.name} descargado`);
    } catch (e) { console.error(e); toast('Error generando el PDF', 'err'); }
  });
  $('pdfPrintBtn').addEventListener('click', pdfImprimir);

  const menu = $('moreMenu');
  const closeMenu = () => { menu.hidden = true; $('moreBtn').setAttribute('aria-expanded', 'false'); };
  $('moreBtn').addEventListener('click', (ev) => {
    ev.stopPropagation();
    menu.hidden = !menu.hidden;
    $('moreBtn').setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu.addEventListener('click', closeMenu);
  $('pngBtn').addEventListener('click', async () => {
    toast('Generando PNG…');
    try { await exportPng(state); toast('PNG descargado'); }
    catch (e) { console.error(e); toast('Error exportando PNG', 'err'); }
  });
  $('cuentaMenuBtn').addEventListener('click', cuenta);
  $('exportJsonBtn').addEventListener('click', () => { exportJson(state); toast(`COTIZACION_${state.numero}.json descargado`); });
  $('exportMdBtn').addEventListener('click', () => { exportMarkdown(state); toast(`COTIZACION_${state.numero}.md descargado`); });
  $('importJsonBtn').addEventListener('click', () => $in('importJsonFile').click());
  $in('importJsonFile').addEventListener('change', async () => {
    const f = $in('importJsonFile').files?.[0];
    $in('importJsonFile').value = '';
    if (!f) return;
    try { load(await importJsonFromFile(f), `Cotización importada`); }
    catch (e: any) { toast(e?.message ?? 'Error al importar JSON', 'err'); }
  });

  // Guardadas
  $in('savedSearch').addEventListener('input', renderSavedList);
  $('savedFilters').addEventListener('click', (ev) => {
    const f = (ev.target as HTMLElement).closest<HTMLElement>('[data-filter]')?.dataset.filter;
    if (!f) return;
    savedFilter = f as Estado | 'todas';
    renderSavedList();
  });
  $('savedList').addEventListener('click', async (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!btn) return;
    const num = btn.dataset.num!;
    const found = loadSaved().find((x) => x.numero === num);
    if (btn.dataset.act === 'load' && found) { load(found, `Cotización ${num} abierta`); showTab('cotizacion'); }
    else if (btn.dataset.act === 'dup' && found) {
      const c = structuredClone(found);
      c.numero = nextNumero();
      c.fecha = today();
      c.estado = 'borrador';
      c.cobro = {};
      load(c, `Copia creada como ${c.numero}`);
      showTab('cotizacion');
    } else if (btn.dataset.act === 'del') {
      const quien = found?.cliente?.nombre || found?.alcance || '';
      if (!(await confirmar({ titulo: `¿Eliminar la cotización ${num}?`, mensaje: `${quien ? quien + ' · ' : ''}Total ${found ? formatCOP(totalReal(found)) : '$0'}. Se borra de este navegador${driveInfo().conectado ? ' y del respaldo en Drive' : ''}; no se puede deshacer.`, aceptar: 'Eliminar', peligro: true }))) return;
      await animarSalida(btn.closest('.saved-row'));
      deleteSaved(num);
      renderSavedList();
      driveAuto(false);
    }
  });

  // Vista previa: zoom y modo celular
  const zoomBy = (d: number) => { zoomMode = Math.min(2, Math.max(0.2, Math.round((zoomK + d) * 10) / 10)); applyZoom(); };
  $('zoomIn').addEventListener('click', () => zoomBy(0.1));
  $('zoomOut').addEventListener('click', () => zoomBy(-0.1));
  $('zoomWidth').addEventListener('click', () => { zoomMode = 'width'; recordarZoom('width'); applyZoom(); });
  $('zoomPage').addEventListener('click', () => { zoomMode = 'page'; recordarZoom('page'); applyZoom(); $('previewScroll').scrollTop = 0; });
  // Ctrl + rueda sobre la vista previa = zoom
  $('previewScroll').addEventListener('wheel', (ev) => {
    if (!ev.ctrlKey) return;
    ev.preventDefault();
    zoomBy(ev.deltaY < 0 ? 0.1 : -0.1);
  }, { passive: false });
  new ResizeObserver(() => applyZoom()).observe($('previewScroll'));
  document.querySelectorAll<HTMLElement>('.mobile-switch [data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view as 'edit' | 'preview')));

  // Cierra menús al hacer clic fuera
  document.addEventListener('click', (ev) => {
    document.querySelectorAll('.icon-picker-panel:not(.hidden)').forEach((p) => p.classList.add('hidden'));
    if (!(ev.target as HTMLElement).closest('.menu-wrap')) closeMenu();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      closeMenu();
      if (!$('helpModal').hidden) closeHelp();
      for (const id of ['driveModal', 'iosModal']) if (!$(id).hidden) void cerrarModal($(id));
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); $('saveBtn').click(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'p') { ev.preventDefault(); $('pdfBtn').click(); }
  });

  // Ayuda: centro de ayuda y guías por sección
  $('tourList').innerHTML = TOURS.map((t) => `<button type="button" data-tour="${t.id}" class="${t.id === 'completa' ? 'main' : ''}"><b>${t.nombre}</b><span>${t.descripcion}</span></button>`).join('');
  $('helpBtn').addEventListener('click', openHelp);
  $('helpClose').addEventListener('click', closeHelp);
  $('helpModal').addEventListener('click', (ev) => { if (ev.target === $('helpModal')) closeHelp(); });
  document.addEventListener('click', (ev) => {
    const id = (ev.target as HTMLElement).closest<HTMLElement>('[data-tour]')?.dataset.tour as TourId | undefined;
    if (!id) return;
    closeHelp();
    window.setTimeout(() => tour(id), 150);
  });

  initExtras();
  hydrateForm();
  updateSortButtons();
  showTab(lastTab);
  refresh();
  showWelcomeIfNeeded();
  avisarVersion();
}

function setView(view: 'edit' | 'preview') {
  (document.querySelector('.app') as HTMLElement).dataset.view = view;
  document.querySelectorAll<HTMLElement>('.mobile-switch [data-view]').forEach((x) => x.classList.toggle('active', x.dataset.view === view));
  applyZoom();
}

function tour(id: TourId) {
  startTour(id, { showTab, setView });
}

function openHelp() {
  abrirModal($('helpModal'));
}

function closeHelp() {
  void cerrarModal($('helpModal'));
  ($('helpVideo') as HTMLVideoElement).pause();
}

/** Después de actualizar, avisa a qué versión quedó y ofrece ver las novedades. */
function avisarVersion() {
  const KEY = 'cotizador:version';
  const v = __BUILD__.version;
  let antes: string | null = null;
  try { antes = localStorage.getItem(KEY); localStorage.setItem(KEY, v); } catch { return; }
  if (!antes || antes === v) return;
  window.setTimeout(() => toast(`Actualizado a la versión ${v}`, 'ok', {
    label: 'Novedades',
    run: () => { openHelp(); window.setTimeout(() => document.getElementById('novedades')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); },
  }), 800);
}

function showWelcomeIfNeeded() {
  const KEY = 'cotizador:welcomed';
  try { if (localStorage.getItem(KEY) === 'true') return; } catch { return; }
  const overlay = $('welcomeModal');
  abrirModal(overlay);
  const close = () => cerrarModal(overlay);
  $('welcomeStart').addEventListener('click', () => { close(); window.setTimeout(() => tour('completa'), 250); });
  $('welcomeSkip').addEventListener('click', close);
  $('welcomeNever').addEventListener('click', () => { try { localStorage.setItem(KEY, 'true'); } catch { /* */ } close(); });
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
  document.addEventListener('keydown', function onEsc(ev) {
    if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
  });
}
