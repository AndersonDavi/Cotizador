// Ventanas y confirmaciones propias, con animación de entrada y salida.
// Reemplazan a confirm() del navegador, que no se puede estilizar ni animar.

import { escapeHtml } from './esc';

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Muestra una ventana (.modal-overlay); la entrada la anima el CSS. */
export function abrirModal(el: HTMLElement): void {
  el.classList.remove('closing');
  el.hidden = false;
}

/** Anima la salida y luego oculta. Seguro de llamar varias veces. */
export function cerrarModal(el: HTMLElement): Promise<void> {
  if (el.hidden) return Promise.resolve();
  if (sinMovimiento()) { el.hidden = true; return Promise.resolve(); }
  if (el.classList.contains('closing')) return new Promise((r) => setTimeout(r, 200));
  el.classList.add('closing');
  return new Promise((resolve) => {
    let hecho = false;
    const fin = () => {
      if (hecho) return;
      hecho = true;
      el.classList.remove('closing');
      el.hidden = true;
      resolve();
    };
    el.addEventListener('animationend', fin, { once: true });
    setTimeout(fin, 260); // por si el navegador no dispara animationend
  });
}

const ICONOS = {
  trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6M9 15h6"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="M12 12v6"/><path d="m9.5 15.5 2.5 2.5 2.5-2.5"/>',
  unplug: '<path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/>',
  restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
};

export type Confirmar = {
  titulo: string;
  mensaje?: string;
  aceptar?: string;
  cancelar?: string;
  /** Acción que borra o pierde algo: botón rojo y el foco empieza en Cancelar. */
  peligro?: boolean;
  icono?: keyof typeof ICONOS;
};

let abierto: Promise<boolean> | null = null;

/** Pregunta con una ventana propia. Devuelve true si la persona acepta. */
export function confirmar(o: Confirmar): Promise<boolean> {
  if (abierto) return abierto.then(() => confirmar(o)); // una a la vez
  let el = document.getElementById('confirmModal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'confirmModal';
    el.className = 'modal-overlay confirm-overlay';
    el.hidden = true;
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'confirmTitle');
    el.setAttribute('aria-describedby', 'confirmMsg');
    document.body.appendChild(el);
  }
  const icono = ICONOS[o.icono ?? (o.peligro ? 'trash' : 'doc')];
  el.innerHTML = `
    <div class="modal-box confirm-box${o.peligro ? ' danger' : ''}">
      <div class="confirm-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icono}</svg></div>
      <h2 id="confirmTitle">${escapeHtml(o.titulo)}</h2>
      ${o.mensaje ? `<p id="confirmMsg">${escapeHtml(o.mensaje)}</p>` : ''}
      <div class="confirm-actions">
        <button type="button" data-r="no">${escapeHtml(o.cancelar ?? 'Cancelar')}</button>
        <button type="button" data-r="si" class="${o.peligro ? 'danger-btn' : 'primary'}">${escapeHtml(o.aceptar ?? 'Aceptar')}</button>
      </div>
    </div>`;
  const overlay = el;
  const antes = document.activeElement as HTMLElement | null;
  abierto = new Promise<boolean>((resolve) => {
    const responder = (r: boolean) => {
      document.removeEventListener('keydown', onKey, true);
      overlay.removeEventListener('click', onClick);
      cerrarModal(overlay).then(() => { abierto = null; antes?.focus?.(); resolve(r); });
    };
    const onClick = (ev: MouseEvent) => {
      const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-r]');
      if (b) responder(b.dataset.r === 'si');
      else if (ev.target === overlay) responder(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); responder(false); }
      if (ev.key === 'Tab') { // el foco no sale de la ventana
        const bs = [...overlay.querySelectorAll<HTMLElement>('button')];
        const i = bs.indexOf(document.activeElement as HTMLElement);
        ev.preventDefault();
        bs[(i + (ev.shiftKey ? bs.length - 1 : 1)) % bs.length].focus();
      }
    };
    overlay.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey, true);
    abrirModal(overlay);
    overlay.querySelector<HTMLElement>(o.peligro ? '[data-r="no"]' : '[data-r="si"]')!.focus();
  });
  return abierto;
}

/** Anima la salida de un elemento (fila de una lista) antes de quitarlo. */
export function animarSalida(el: Element | null): Promise<void> {
  if (!el || sinMovimiento()) return Promise.resolve();
  const h = (el as HTMLElement).offsetHeight;
  return el.animate(
    [
      { opacity: 1, transform: 'none', height: `${h}px` },
      { opacity: 0, transform: 'translateX(24px)', height: `${h}px`, offset: 0.6 },
      { opacity: 0, transform: 'translateX(24px)', height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', borderWidth: '0px' },
    ],
    { duration: 320, easing: 'cubic-bezier(.4,0,.2,1)' },
  ).finished.then(() => undefined, () => undefined);
}
