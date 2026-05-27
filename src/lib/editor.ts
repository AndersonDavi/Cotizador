import {
  type Cotizacion,
  type Item,
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
} from './state';
import { getAllIconKeys, getIconLabel, buildIconDataUrl, type IconKey } from './icons';
import { TEMPLATE_IDS, TEMPLATES, type TemplateId } from './templates';
import { renderPreview, exportPdf, exportPng, exportJson, importJsonFromFile, exportMarkdown } from './export';

let state: Cotizacion;
let renderTimer: number | null = null;
let saveTimer: number | null = null;
let previewCanvas: HTMLCanvasElement;

// ── Estado de UI de items (no afecta el canvas/PDF) ──────────────────────────
const collapsedItems = new Set<string>();
type SortField = 'precio' | 'titulo' | 'tipo';
type SortDir   = 'asc' | 'desc';
let sortField: SortField | null = null;
let sortDir:   SortDir = 'asc';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No #${id}`);
  return el;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function toast(msg: string, kind: 'ok' | 'err' = 'ok') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast show ${kind}`;
  setTimeout(() => { el.className = 'toast'; }, 2200);
}

function schedulePreview() {
  if (renderTimer) cancelAnimationFrame(renderTimer);
  renderTimer = requestAnimationFrame(() => {
    renderPreview(previewCanvas, state).catch(err => console.error(err));
  });
}

function scheduleAutosave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveDraft(state);
    saveBranding(state.branding);
  }, 500);
}

function refresh() {
  if (state.costoTotalAuto) {
    state.costoTotal = totalReal(state);
    const tot = $('costoTotal') as HTMLInputElement;
    tot.value = String(state.costoTotal);
  }
  schedulePreview();
  scheduleAutosave();
  renderSavedList();
}

// ---------- builders ----------

/** Crea el botón disparador del icon-picker y lo devuelve listo para insertar. */
function buildIconPicker(
  selected: IconKey,
  onChange: (newKey: IconKey) => void
): HTMLElement {
  const keys = getAllIconKeys();

  const wrap = document.createElement('div');
  wrap.className = 'icon-picker-wrap';

  // Botón principal — muestra SVG + label del ícono seleccionado
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'icon-picker-trigger';
  const updateTrigger = (key: IconKey) => {
    trigger.innerHTML = `
      <img src="${buildIconDataUrl(key, 'currentColor')}" class="icon-picker-preview" />
      <span>${escapeHtml(getIconLabel(key))}</span>
      <svg class="icon-picker-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
    `;
  };
  updateTrigger(selected);

  // Panel dropdown
  const panel = document.createElement('div');
  panel.className = 'icon-picker-panel hidden';
  panel.innerHTML = keys.map(k => `
    <button type="button" class="icon-picker-item${k === selected ? ' active' : ''}" data-key="${k}" title="${escapeAttr(getIconLabel(k))}">
      <img src="${buildIconDataUrl(k, '#e6e8ec')}" width="18" height="18" />
      <span>${escapeHtml(getIconLabel(k))}</span>
    </button>
  `).join('');

  // Toggle panel
  trigger.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const isOpen = !panel.classList.contains('hidden');
    // Cierra cualquier otro picker abierto
    document.querySelectorAll('.icon-picker-panel:not(.hidden)').forEach(p => p.classList.add('hidden'));
    if (!isOpen) panel.classList.remove('hidden');
  });

  // Seleccionar ícono
  panel.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest('[data-key]') as HTMLElement | null;
    if (!btn) return;
    const key = btn.dataset.key as IconKey;
    panel.querySelectorAll('.icon-picker-item').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
    updateTrigger(key);
    panel.classList.add('hidden');
    onChange(key);
  });

  wrap.appendChild(trigger);
  wrap.appendChild(panel);
  return wrap;
}

function buildTemplateOptions(selected: TemplateId): string {
  return TEMPLATE_IDS.map(k => `<option value="${k}"${k === selected ? ' selected' : ''}>${TEMPLATES[k].label}</option>`).join('');
}

const SORT_LABELS: Record<SortField, string> = { precio: 'Precio', titulo: 'Título', tipo: 'Tipo' };

// Actualiza los botones de ordenamiento en la cabecera de la sección
function updateSortButtons() {
  (['precio', 'titulo', 'tipo'] as SortField[]).forEach(field => {
    const btn = document.getElementById(`sort-${field}`) as HTMLButtonElement | null;
    if (!btn) return;
    const arrow = sortDir === 'asc' ? ' ↑' : ' ↓';
    const svg = btn.querySelector('svg');
    btn.innerHTML = '';
    if (svg) btn.appendChild(svg);
    if (sortField === field) {
      btn.classList.add('sort-active');
      btn.append(SORT_LABELS[field] + arrow);
    } else {
      btn.classList.remove('sort-active');
      btn.append(SORT_LABELS[field]);
    }
  });
}

function applySort(field: SortField) {
  if (sortField === field) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortDir = 'asc';
  }
  state.items.sort((a, b) => {
    let cmp = 0;
    if (field === 'precio') {
      cmp = a.valor - b.valor;
    } else if (field === 'titulo') {
      cmp = (a.titulo || '').localeCompare(b.titulo || '', 'es', { sensitivity: 'base' });
    } else if (field === 'tipo') {
      cmp = getIconLabel(a.iconKey).localeCompare(getIconLabel(b.iconKey), 'es', { sensitivity: 'base' });
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });
  updateSortButtons();
  renderItems();
  refresh();
}

function renderItems() {
  const wrap = $('items');
  wrap.innerHTML = '';

  // Actualizar botón expandir/colapsar todos
  const allCollapsed = state.items.length > 0 && state.items.every(it => collapsedItems.has(it.id));
  const toggleAllBtn = document.getElementById('toggleAllItems') as HTMLButtonElement | null;
  if (toggleAllBtn) {
    const svg = toggleAllBtn.querySelector('svg');
    toggleAllBtn.innerHTML = '';
    if (svg) toggleAllBtn.appendChild(svg);
    toggleAllBtn.append(allCollapsed ? 'Expandir todo' : 'Colapsar todo');
  }

  state.items.forEach((it, idx) => {
    const isCollapsed = collapsedItems.has(it.id);
    const card = document.createElement('div');
    card.className = 'item-card' + (isCollapsed ? ' item-collapsed' : '');

    if (isCollapsed) {
      // ── Vista compacta ──────────────────────────────────────
      card.innerHTML = `
        <div class="item-head item-head-compact">
          <span class="handle">≡</span>
          <span class="item-icon-label">${escapeHtml(getIconLabel(it.iconKey))}</span>
          <span class="item-titulo-compact">${escapeHtml(it.titulo || '_(sin título)_')}</span>
          <span class="item-valor-compact">${formatCOP(it.valor)}</span>
          <button class="icon-btn" data-action="up" title="Subir">▲</button>
          <button class="icon-btn" data-action="down" title="Bajar">▼</button>
          <button class="icon-btn" data-action="toggle" title="Expandir">▾</button>
          <button class="icon-btn danger" data-action="remove" title="Eliminar">✕</button>
        </div>
      `;
    } else {
      // ── Vista expandida ─────────────────────────────────────
      card.innerHTML = `
        <div class="item-head" id="item-head-${it.id}">
          <span class="handle">≡</span>
          <!-- icon-picker se inyecta por JS debajo -->
          <button class="icon-btn" data-action="up" title="Subir">▲</button>
          <button class="icon-btn" data-action="down" title="Bajar">▼</button>
          <button class="icon-btn" data-action="toggle" title="Colapsar">▴</button>
          <button class="icon-btn danger" data-action="remove" title="Eliminar">✕</button>
        </div>
        <div>
          <label>Título</label>
          <input type="text" data-action="titulo" value="${escapeAttr(it.titulo)}" />
        </div>
        <div>
          <label>Descripción</label>
          <textarea data-action="descripcion">${escapeHtml(it.descripcion)}</textarea>
        </div>
        <div>
          <label>Valor (COP)</label>
          <input type="number" min="0" step="1000" data-action="valor" value="${it.valor}" />
        </div>
      `;

      // Inyecta el icon-picker después del handle
      const head = card.querySelector(`#item-head-${it.id}`)!;
      const picker = buildIconPicker(it.iconKey, (newKey) => {
        it.iconKey = newKey;
        refresh();
      });
      head.insertBefore(picker, head.children[1]); // después del .handle
    }

    card.addEventListener('input', (ev) => {
      const tgt = ev.target as HTMLInputElement | HTMLTextAreaElement;
      const action = tgt.dataset.action;
      if (!action) return;
      if (action === 'titulo') it.titulo = tgt.value;
      else if (action === 'descripcion') it.descripcion = tgt.value;
      else if (action === 'valor') it.valor = Number(tgt.value) || 0;
      refresh();
    });

    card.addEventListener('click', (ev) => {
      const tgt = ev.target as HTMLElement;
      const action = tgt.dataset?.action;
      if (action === 'remove') {
        state.items.splice(idx, 1);
        collapsedItems.delete(it.id);
        if (!state.items.length) state.items.push({ id: makeId(), iconKey: 'code', titulo: '', descripcion: '', valor: 0 });
        renderItems();
        refresh();
      } else if (action === 'up' && idx > 0) {
        [state.items[idx - 1], state.items[idx]] = [state.items[idx], state.items[idx - 1]];
        renderItems();
        refresh();
      } else if (action === 'down' && idx < state.items.length - 1) {
        [state.items[idx + 1], state.items[idx]] = [state.items[idx], state.items[idx + 1]];
        renderItems();
        refresh();
      } else if (action === 'toggle') {
        if (collapsedItems.has(it.id)) collapsedItems.delete(it.id);
        else collapsedItems.add(it.id);
        renderItems(); // solo re-render UI, no refresh del canvas
      }
    });

    wrap.appendChild(card);
  });
}

function renderSavedList() {
  const wrap = $('savedList');
  const list = loadSaved();
  if (!list.length) {
    wrap.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:6px;">Sin cotizaciones guardadas.</div>';
    return;
  }
  wrap.innerHTML = '';
  list.sort((a, b) => a.numero.localeCompare(b.numero)).forEach(c => {
    const row = document.createElement('div');
    row.className = 'saved-row';
    row.innerHTML = `
      <span class="id">${c.numero}</span>
      <span class="scope" title="${escapeAttr(c.alcance)}">${escapeHtml(c.alcance || '—')}</span>
      <span style="color:var(--muted);font-size:11px;">${formatCOP(totalReal(c))}</span>
      <button class="icon-btn" data-num="${c.numero}" data-act="load">Abrir</button>
      <button class="icon-btn danger" data-num="${c.numero}" data-act="del">✕</button>
    `;
    row.addEventListener('click', (ev) => {
      const tgt = ev.target as HTMLElement;
      const num = tgt.dataset?.num;
      const act = tgt.dataset?.act;
      if (!num || !act) return;
      if (act === 'load') {
        const found = loadSaved().find(x => x.numero === num);
        if (found) {
          state = found;
          hydrateForm();
          refresh();
          toast(`Cotización ${num} cargada`);
        }
      } else if (act === 'del') {
        if (confirm(`¿Eliminar cotización ${num}?`)) {
          deleteSaved(num);
          renderSavedList();
        }
      }
    });
    wrap.appendChild(row);
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
function escapeAttr(s: string): string { return escapeHtml(s); }

// ---------- form hydration ----------

function hydrateForm() {
  (document.getElementById('numero') as HTMLInputElement).value = state.numero;
  (document.getElementById('fecha') as HTMLInputElement).value = state.fecha;
  (document.getElementById('alcance') as HTMLTextAreaElement).value = state.alcance;
  (document.getElementById('costoTotal') as HTMLInputElement).value = String(state.costoTotal);
  (document.getElementById('costoAuto') as HTMLInputElement).checked = state.costoTotalAuto;
  (document.getElementById('plantilla') as HTMLSelectElement).value = state.plantilla;
  (document.getElementById('tiempoEntrega') as HTMLTextAreaElement).value = state.tiempoEntrega;
  (document.getElementById('terminos') as HTMLTextAreaElement).value = state.terminos.join('\n');

  (document.getElementById('colorBg') as HTMLInputElement).value = state.coloresOverride.bg ?? TEMPLATES[state.plantilla].headerBg;
  (document.getElementById('colorBg2') as HTMLInputElement).value = state.coloresOverride.bg2 ?? TEMPLATES[state.plantilla].headerBg2;
  (document.getElementById('colorAccent') as HTMLInputElement).value = state.coloresOverride.accent ?? TEMPLATES[state.plantilla].accent;
  (document.getElementById('colorText') as HTMLInputElement).value = state.coloresOverride.text ?? TEMPLATES[state.plantilla].cardText;

  const b = state.branding;
  (document.getElementById('repNombre') as HTMLInputElement).value = b.representante.nombre;
  (document.getElementById('repCedula') as HTMLInputElement).value = b.representante.cedula;
  (document.getElementById('cWeb') as HTMLInputElement).value = b.contacto.web;
  (document.getElementById('cEmail') as HTMLInputElement).value = b.contacto.email;
  (document.getElementById('cCel') as HTMLInputElement).value = b.contacto.cel;
  (document.getElementById('cCiudad') as HTMLInputElement).value = b.contacto.ciudad;
  (document.getElementById('cPais') as HTMLInputElement).value = b.contacto.pais;

  updateLogoPreview();
  updateFirmaPreview();
  renderItems();
}

function updateLogoPreview() {
  const img = $('logoPreview') as HTMLImageElement;
  if (state.branding.logoDataUrl) { img.src = state.branding.logoDataUrl; img.style.display = 'block'; }
  else { img.style.display = 'none'; }
}
function updateFirmaPreview() {
  const img = $('firmaPreview') as HTMLImageElement;
  const url = state.branding.representante.firmaDataUrl;
  if (url) { img.src = url; img.style.display = 'block'; }
  else { img.style.display = 'none'; }
}

// ---------- init ----------


export function initEditor() {
  previewCanvas = $('previewCanvas') as HTMLCanvasElement;

  const draft = loadDraft();
  const branding = loadBranding();
  state = draft ?? nuevaCotizacion(nextNumero());
  if (branding && !draft) state.branding = branding;

  // Populate selects/options
  ($('plantilla') as HTMLSelectElement).innerHTML = buildTemplateOptions(state.plantilla);

  hydrateForm();

  // Bind inputs
  bind('numero', v => state.numero = v);
  bind('fecha', v => state.fecha = v);

  // Calendario: botón abre input[type=date] oculto; convierte yyyy-mm-dd → dd-mm-yyyy
  const fechaHidden = document.getElementById('fechaHidden') as HTMLInputElement;
  document.getElementById('fechaPickerBtn')?.addEventListener('click', () => fechaHidden.showPicker?.() ?? fechaHidden.click());
  fechaHidden.addEventListener('change', () => {
    const val = fechaHidden.value; // "yyyy-mm-dd"
    if (!val) return;
    const [y, m, d] = val.split('-');
    const formatted = `${d}-${m}-${y}`;
    (document.getElementById('fecha') as HTMLInputElement).value = formatted;
    state.fecha = formatted;
    refresh();
  });
  bind('alcance', v => state.alcance = v);
  bind('costoTotal', v => state.costoTotal = Number(v) || 0);
  bindCheckbox('costoAuto', v => state.costoTotalAuto = v);
  bind('plantilla', v => {
    state.plantilla = v as TemplateId;
    // Reset overrides al cambiar plantilla
    state.coloresOverride = {};
    hydrateForm();
    refresh();
  });
  bind('tiempoEntrega', v => state.tiempoEntrega = v);
  bind('terminos', v => state.terminos = v.split('\n').map(s => s.trim()).filter(Boolean));

  bind('colorBg', v => state.coloresOverride.bg = v);
  bind('colorBg2', v => state.coloresOverride.bg2 = v);
  bind('colorAccent', v => state.coloresOverride.accent = v);
  bind('colorText', v => {
    // Afecta tanto el texto del encabezado como el de las tarjetas
    state.coloresOverride.text = v;
    state.coloresOverride.cardText = v;
  });

  bind('repNombre', v => state.branding.representante.nombre = v);
  bind('repCedula', v => state.branding.representante.cedula = v);
  bind('cWeb', v => state.branding.contacto.web = v);
  bind('cEmail', v => state.branding.contacto.email = v);
  bind('cCel', v => state.branding.contacto.cel = v);
  bind('cCiudad', v => state.branding.contacto.ciudad = v);
  bind('cPais', v => state.branding.contacto.pais = v);

  // Logo upload
  ($('logoFile') as HTMLInputElement).addEventListener('change', async (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    state.branding.logoDataUrl = await fileToDataUrl(f);
    updateLogoPreview();
    refresh();
  });
  $('logoClear').addEventListener('click', () => {
    state.branding.logoDataUrl = undefined;
    updateLogoPreview();
    refresh();
  });

  // Firma upload
  ($('firmaFile') as HTMLInputElement).addEventListener('change', async (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    state.branding.representante.firmaDataUrl = await fileToDataUrl(f);
    updateFirmaPreview();
    refresh();
  });
  $('firmaClear').addEventListener('click', () => {
    state.branding.representante.firmaDataUrl = undefined;
    updateFirmaPreview();
    refresh();
  });

  // Add item
  $('addItem').addEventListener('click', () => {
    state.items.push({ id: makeId(), iconKey: 'code', titulo: '', descripcion: '', valor: 0 });
    renderItems();
    refresh();
  });

  // Expandir / colapsar todos
  document.getElementById('toggleAllItems')?.addEventListener('click', () => {
    const allCollapsed = state.items.every(it => collapsedItems.has(it.id));
    if (allCollapsed) {
      state.items.forEach(it => collapsedItems.delete(it.id));
    } else {
      state.items.forEach(it => collapsedItems.add(it.id));
    }
    renderItems();
  });

  // Ordenar por precio / título / tipo (toggle asc/desc)
  document.getElementById('sort-precio')?.addEventListener('click', () => applySort('precio'));
  document.getElementById('sort-titulo')?.addEventListener('click', () => applySort('titulo'));
  document.getElementById('sort-tipo')?.addEventListener('click', () => applySort('tipo'));

  // Save / new / pdf / png
  $('saveBtn').addEventListener('click', () => {
    persistSaved(state);
    renderSavedList();
    toast(`Cotización ${state.numero} guardada`);
  });
  $('newBtn').addEventListener('click', () => {
    if (!confirm('¿Crear una cotización nueva? El borrador actual se reemplazará.')) return;
    state = nuevaCotizacion(nextNumero());
    state.branding = loadBranding() ?? state.branding;
    hydrateForm();
    refresh();
  });
  $('pdfBtn').addEventListener('click', async () => {
    try { await exportPdf(state); toast('PDF exportado'); }
    catch (e) { console.error(e); toast('Error exportando PDF', 'err'); }
  });
  $('pngBtn').addEventListener('click', async () => {
    try { await exportPng(state); toast('PNG exportado'); }
    catch (e) { console.error(e); toast('Error exportando PNG', 'err'); }
  });

  // Export JSON
  $('exportJsonBtn').addEventListener('click', () => {
    try {
      exportJson(state);
      toast(`JSON exportado — COTIZACION_${state.numero}.json`);
    } catch (e) {
      console.error(e);
      toast('Error exportando JSON', 'err');
    }
  });

  // Export Markdown
  $('exportMdBtn').addEventListener('click', () => {
    try {
      exportMarkdown(state);
      toast(`Markdown exportado — COTIZACION_${state.numero}.md`);
    } catch (e) {
      console.error(e);
      toast('Error exportando Markdown', 'err');
    }
  });

  // Import JSON — dispara el input file oculto
  $('importJsonBtn').addEventListener('click', () => {
    ($('importJsonFile') as HTMLInputElement).value = '';
    $('importJsonFile').click();
  });

  ($('importJsonFile') as HTMLInputElement).addEventListener('change', async (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const imported = await importJsonFromFile(file);
      state = imported;
      hydrateForm();
      refresh();
      toast(`Cotización ${imported.numero} importada`);
    } catch (e: any) {
      console.error(e);
      toast(e?.message ?? 'Error al importar JSON', 'err');
    }
  });

  // Cierra icon-pickers al hacer clic fuera
  document.addEventListener('click', () => {
    document.querySelectorAll('.icon-picker-panel:not(.hidden)').forEach(p => p.classList.add('hidden'));
  });

  // Section collapse
  document.querySelectorAll('.section > header').forEach(h => {
    h.addEventListener('click', () => h.parentElement?.classList.toggle('collapsed'));
  });

  refresh();
}

function bind(id: string, setter: (v: string) => void) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  if (!el) return;
  el.addEventListener('input', () => { setter(el.value); refresh(); });
  el.addEventListener('change', () => { setter(el.value); refresh(); });
}

function bindCheckbox(id: string, setter: (v: boolean) => void) {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  el.addEventListener('change', () => { setter(el.checked); refresh(); });
}
