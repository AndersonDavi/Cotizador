// Graba el video tutorial de public/tutorial/ usando la app real.
//
//   npm run dev                        (en otra terminal)
//   node tutorial/record.mjs [url]     (por defecto http://localhost:4321)
//
// Usa Edge/Chrome instalado (playwright-core) y ffmpeg en el PATH.
// Los gráficos (intro, títulos, cursor, foco) se inyectan en la página y la
// grabación se hace cuadro a cuadro con el screencast de DevTools.

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.argv[2] ?? 'http://localhost:4321';
const OUT = join(ROOT, 'public', 'tutorial');
const FRAMES = join(tmpdir(), 'cotizador-tutorial-frames');
const W = 1280, H = 720, SCALE = 1.5;

// ── Datos ficticios ──────────────────────────────────────────────────────────
const svg64 = (s) => Buffer.from(s);
const LOGO = svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#E8623A"/><path d="M18 40c6-14 22-14 28 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="24" r="6" fill="#fff"/></svg>`);
const FIRMA = svg64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100"><rect width="300" height="100" fill="#fff"/><path d="M20 70c20-40 30-50 40-20s10 30 25-5 20-30 30 0 15 20 30-10 25-20 35 10 20 15 40-15 30-5 45 10" fill="none" stroke="#1a1a2e" stroke-width="3.5" stroke-linecap="round"/></svg>`);
const DRAFT = {
  numero: '00024', fecha: '15-10-2026', alcance: '', costoTotal: 0, costoTotalAuto: true,
  items: [
    { id: 'a1', iconKey: 'palette', titulo: 'Identidad visual', descripcion: 'Ajuste del logo, paleta de colores y tipografías para web y redes.', valor: 850000 },
    { id: 'a2', iconKey: 'layout', titulo: 'Sitio web de 5 secciones', descripcion: 'Inicio, nosotros, productos, pedidos y contacto. Adaptable a celulares.', valor: 1800000 },
  ],
  tiempoEntrega: '20 días hábiles a partir de la aprobación.', terminos: ['50% para iniciar y 50% contra entrega.', 'Oferta válida por 15 días calendario.'],
  plantilla: 'oscura', coloresOverride: {}, diseno: 'clasica', colores: { primary: '#6B6300', secondary: '#F2DA23' }, titulo: 'Propuesta económica',
  estado: 'borrador', cliente: { nombre: '', nit: '' }, cobro: {},
  branding: {
    representante: { nombre: 'LAURA MÉNDEZ', cedula: '1.020.304.050' }, banco: 'Cuenta de Ahorros BANCO DEMO No. 000-000000-00',
    nombreLegal: 'LAURA MÉNDEZ GÓMEZ', direccion: 'Carrera 10 #20-30',
    contacto: { web: 'www.estudioambar.co', email: 'hola@estudioambar.co', cel: '+57 300 000 0000', ciudad: 'Medellín', pais: 'Colombia' },
  },
};

// ── Capa de gráficos (se inyecta en la página) ───────────────────────────────
const OVERLAY = (logoSvg) => `
(() => {
  const css = document.createElement('style');
  css.textContent = \`
  #mg{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:Roboto,system-ui,sans-serif}
  #mg-cur{position:absolute;left:0;top:0;width:26px;height:26px;transition:transform .7s cubic-bezier(.65,0,.35,1);filter:drop-shadow(0 3px 6px rgba(0,0,0,.45))}
  #mg-cur svg{width:100%;height:100%}
  .mg-ripple{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #F2D22B;animation:rip .55s ease-out forwards}
  @keyframes rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
  #mg-spot{position:absolute;border-radius:14px;box-shadow:0 0 0 3px #F2D22B,0 0 0 9999px rgba(5,6,9,.5);opacity:0;transition:all .55s cubic-bezier(.65,0,.35,1)}
  #mg-cap{position:absolute;left:50%;bottom:34px;transform:translate(-50%,30px);opacity:0;transition:all .45s cubic-bezier(.2,.8,.2,1);display:flex;align-items:center;gap:14px;background:rgba(14,16,21,.92);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:12px 20px 12px 12px;box-shadow:0 18px 40px rgba(0,0,0,.45);max-width:860px}
  #mg-cap.on{transform:translate(-50%,0);opacity:1}
  #mg-cap .n{flex:none;width:38px;height:38px;border-radius:10px;background:#F2D22B;color:#1a1a10;font-weight:900;font-size:20px;display:flex;align-items:center;justify-content:center}
  #mg-cap .t{display:flex;flex-direction:column;gap:2px}
  #mg-cap b{color:#fff;font-size:19px;font-weight:700}
  #mg-cap span{color:#c7cbd3;font-size:15px}
  #mg-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:radial-gradient(circle at 50% 35%,#252a35,#0b0d11 70%);opacity:0;transition:opacity .6s ease}
  #mg-card.on{opacity:1}
  #mg-card img{width:120px;height:120px;transform:scale(.4) rotate(-12deg);opacity:0;transition:all .8s cubic-bezier(.34,1.56,.64,1)}
  #mg-card.on img{transform:none;opacity:1}
  #mg-card h1{margin:0;color:#fff;font-size:64px;font-weight:900;letter-spacing:-1px;transform:translateY(24px);opacity:0;transition:all .7s .25s cubic-bezier(.2,.8,.2,1)}
  #mg-card p{margin:0;color:#c7cbd3;font-size:24px;transform:translateY(18px);opacity:0;transition:all .7s .45s cubic-bezier(.2,.8,.2,1)}
  #mg-card .chips{display:flex;gap:10px;opacity:0;transform:translateY(14px);transition:all .7s .65s cubic-bezier(.2,.8,.2,1)}
  #mg-card .chips i{font-style:normal;color:#e8eaee;border:1.5px solid #3a4250;border-radius:999px;padding:8px 16px;font-size:16px}
  #mg-card.on h1,#mg-card.on p,#mg-card.on .chips{transform:none;opacity:1}
  #mg-card .bar{position:absolute;left:0;bottom:0;height:5px;background:#F2D22B;width:0;transition:width 3.2s linear}
  #mg-card.on .bar{width:100%}
  #mg-toast{position:absolute;right:40px;top:90px;width:330px;background:#fff;border-radius:16px;padding:18px;box-shadow:0 30px 70px rgba(0,0,0,.55);transform:translateX(420px);transition:transform .6s cubic-bezier(.2,.8,.2,1);font-size:15px;color:#1c1d21}
  #mg-toast.on{transform:none}
  #mg-toast h4{margin:0 0 8px;font-size:18px}
  #mg-toast li{margin:6px 0;list-style:none;display:flex;gap:8px;align-items:center}
  #mg-toast li::before{content:'✓';color:#fff;background:#4ec47e;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex:none}
  \`;
  document.head.appendChild(css);
  const mg = document.createElement('div');
  mg.id = 'mg';
  mg.innerHTML = \`
    <div id="mg-spot"></div>
    <div id="mg-cap"><div class="n"></div><div class="t"><b></b><span></span></div></div>
    <div id="mg-toast"></div>
    <div id="mg-card"><img src="data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}"><h1></h1><p></p><div class="chips"></div><div class="bar"></div></div>
    <div id="mg-cur"><svg viewBox="0 0 24 24"><path d="M4 2l16 9.5-7 1.6-3.2 6.9z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg></div>\`;
  document.body.appendChild(mg);
  const $ = (s) => mg.querySelector(s);
  window.__mg = {
    move(x, y) { $('#mg-cur').style.transform = \`translate(\${x - 4}px,\${y - 2}px)\`; },
    ripple(x, y) { const r = document.createElement('i'); r.className = 'mg-ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; mg.appendChild(r); setTimeout(() => r.remove(), 700); },
    spot(sel, pad = 8) {
      const s = $('#mg-spot');
      if (!sel) { s.style.opacity = 0; return; }
      const r = document.querySelector(sel).getBoundingClientRect();
      Object.assign(s.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px', opacity: 1 });
    },
    cap(n, title, text) {
      const c = $('#mg-cap');
      if (!title) { c.classList.remove('on'); return; }
      c.classList.remove('on');
      setTimeout(() => { $('#mg-cap .n').textContent = n; $('#mg-cap b').textContent = title; $('#mg-cap span').textContent = text; c.classList.add('on'); }, n === c.dataset.n ? 0 : 250);
      c.dataset.n = n;
    },
    card(title, text, chips) {
      const c = $('#mg-card');
      $('#mg-cur').style.opacity = title ? 0 : 1;
      if (!title) { c.classList.remove('on'); return; }
      $('#mg-card h1').textContent = title; $('#mg-card p').textContent = text;
      $('#mg-card .chips').innerHTML = (chips || []).map((x) => '<i>' + x + '</i>').join('');
      c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    },
    toast(html) { const t = $('#mg-toast'); if (!html) { t.classList.remove('on'); return; } t.innerHTML = html; t.classList.add('on'); },
  };
})();`;

// ── Grabación ────────────────────────────────────────────────────────────────
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, locale: 'es-CO' });
const page = await ctx.newPage();

await page.goto(URL);
await page.evaluate((d) => {
  localStorage.clear();
  localStorage.setItem('cotizador:welcomed', 'true');
  localStorage.setItem('cotizador:tab', 'marca');
  localStorage.setItem('cotizador:draft', JSON.stringify(d));
  localStorage.setItem('cotizador:branding', JSON.stringify(d.branding));
}, DRAFT);
await page.reload();
await page.waitForTimeout(1500);
await page.evaluate(OVERLAY(readFileSync(join(ROOT, 'public', 'logo.svg'), 'utf8')));
// El PDF real abre el diálogo de impresión; en el video se muestra una tarjeta
await page.evaluate(() => {
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
    if (n.tagName === 'IFRAME' && !n.classList.contains('pv-frame')) n.addEventListener('load', () => { n.contentWindow.print = () => {}; });
  }))).observe(document.body, { childList: true });
});

const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const file = join(FRAMES, `f${String(frames.length).padStart(5, '0')}.jpg`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  frames.push({ file, t: metadata.timestamp });
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: W * SCALE, maxHeight: H * SCALE, everyNthFrame: 1 });

const wait = (ms) => page.waitForTimeout(ms);
const mg = (fn, ...args) => page.evaluate(([fn, args]) => window.__mg[fn](...args), [fn, args]);
const center = async (sel) => {
  const box = await page.locator(sel).first().boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};
const point = async (sel) => { const c = await center(sel); await mg('move', c.x, c.y); await wait(750); return c; };
const click = async (sel) => { const c = await point(sel); await mg('ripple', c.x, c.y); await page.locator(sel).first().click(); await wait(400); };
const type = async (sel, text, delay = 55) => { await click(sel); await page.locator(sel).first().fill(''); await page.keyboard.type(text, { delay }); await wait(300); };
const upload = async (sel, input, name, buf) => { const c = await point(sel); await mg('ripple', c.x, c.y); await page.setInputFiles(input, { name, mimeType: 'image/svg+xml', buffer: buf }); await wait(900); };

await mg('move', W / 2, H / 2);
// Intro
await mg('card', 'Cotizador', 'Propuestas económicas con tu marca, en minutos.', ['8 plantillas', 'PDF con texto', 'Cuenta de cobro', 'Gratis']);
await wait(3800);
await mg('card');
await wait(700);

// 1. Tu marca
await mg('cap', '1', 'Tu marca', 'Logo, firma y contacto una sola vez: se usan en todas tus cotizaciones.');
await mg('spot', '.editor');
await wait(1600);
await mg('spot');
await upload('#logoArea', '#logoFile', 'logo.svg', LOGO);
await type('#empresa', 'Estudio Ámbar');
await page.locator('#firmaArea').scrollIntoViewIfNeeded();
await upload('#firmaArea', '#firmaFile', 'firma.svg', FIRMA);
await mg('cap', '1', 'Tu marca', 'La firma pierde el fondo blanco sola. Mira el pie del documento.');
await mg('spot', '.preview');
await wait(2200);
await mg('spot');

// 2. Diseño
await mg('cap', '2', 'Diseño y colores', 'Elige entre 8 plantillas. Todo se pinta con dos colores.');
await click('#tab-diseno');
for (const d of ['bloque', 'noche', 'lateral', 'redonda']) {
  await click(`[data-diseno="${d}"]`);
  await wait(900);
}
await page.locator('#paletteRow').scrollIntoViewIfNeeded();
await mg('cap', '2', 'Diseño y colores', 'Paletas rápidas, o los colores exactos de tu marca.');
await click('[data-paleta="3"]');
await wait(700);
await click('[data-paleta="5"]');
await wait(700);
await click('#colorPrimaryBtn');
const hue = await page.locator('.cp-hue').boundingBox();
await mg('move', hue.x + 10, hue.y + 7);
await wait(700);
await page.mouse.move(hue.x + 10, hue.y + 7);
await page.mouse.down();
for (let i = 1; i <= 20; i++) {
  const x = hue.x + 10 + (hue.width * 0.62 - 10) * (i / 20);
  await page.mouse.move(x, hue.y + 7);
  await mg('move', x, hue.y + 7);
  await wait(45);
}
await page.mouse.up();
await wait(900);
await page.keyboard.press('Escape');
await wait(400);
await click('[data-paleta="5"]');
await wait(500);

// 3. Cotización
await mg('cap', '3', 'Datos de la cotización', 'Cliente, alcance y estado: borrador, enviada, aprobada, cobrada…');
await click('#tab-cotizacion');
await type('#clienteNombre', 'Panadería La Esquina S.A.S.', 40);
await type('#clienteNit', '901.234.567-8', 50);
await type('#alcance', 'Sitio web y tienda en línea para la panadería', 30);
await click('[data-estado="enviada"]');
await wait(600);

// 4. Ítems
await mg('cap', '4', 'Ítems', 'Cada servicio con ícono, descripción y valor. El total se suma solo.');
await click('#tab-items');
await click('#addItem');
await page.keyboard.type('Tienda en línea', { delay: 55 });
const desc = page.locator('#items .item-card').last().locator('textarea');
await point('#items .item-card:last-child textarea');
await desc.click();
await page.keyboard.type('Catálogo, carrito y pagos con PSE y tarjeta.', { delay: 30 });
const valor = page.locator('#items .item-card').last().locator('.money-input');
await point('#items .item-card:last-child .money-input');
await valor.click();
await page.keyboard.type('2400000', { delay: 90 });
await wait(500);
await mg('spot', '.preview-bar');
await wait(1600);
await mg('spot');

// 5. Descargar
await mg('cap', '5', 'Descarga el PDF', 'Una sola página, con texto seleccionable y enlaces que funcionan.');
await mg('spot', '.preview');
await wait(1500);
await mg('spot');
await click('#pdfBtn');
await mg('toast', '<h4>Guardar como PDF</h4><ul style="padding:0;margin:0"><li>Una sola página</li><li>Texto seleccionable</li><li>Email y web con enlace</li></ul>');
await wait(2600);
await mg('toast');

// 6. Cobro
await mg('cap', '6', 'Cuenta de cobro', 'Cuando te aprueban, genera la cuenta de cobro con el mismo total.');
await click('#tab-cobro');
await type('#cobroDesde', '01102026', 70);
await type('#cobroHasta', '15112026', 70);
await mg('spot', '#cobroResumen');
await wait(2200);
await mg('spot');
await click('#cuentaBtn');
await mg('toast', '<h4>Cuenta de cobro</h4><ul style="padding:0;margin:0"><li>Valor en letras</li><li>Tu firma y cuenta bancaria</li><li>Cotización marcada como cobrada</li></ul>');
await wait(2400);
await mg('toast');
await mg('cap');

// Cierre
await wait(300);
await mg('card', 'Cotizador', 'cotizador.andersonrueda.com', ['Sin registro', 'Tus datos quedan en tu navegador', 'Ayuda con guías paso a paso']);
await wait(4200);

await cdp.send('Page.stopScreencast');
await wait(300);
const poster = await page.screenshot({ type: 'jpeg', quality: 85 });
await browser.close();

// ── Video con ffmpeg (duración real de cada cuadro) ──────────────────────────
const list = frames.map((f, i) => {
  const next = frames[i + 1]?.t ?? f.t + 1 / 30;
  return `file '${f.file.replace(/\\/g, '/')}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}`;
}).join('\n') + `\nfile '${frames.at(-1).file.replace(/\\/g, '/')}'\n`;
const listFile = join(FRAMES, 'list.txt');
writeFileSync(listFile, list);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile,
  '-vf', `fps=30,scale=${W * SCALE}:${H * SCALE}:flags=lanczos,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-movflags', '+faststart', join(OUT, 'tutorial.mp4')]);
writeFileSync(join(OUT, 'poster.jpg'), poster);
const dur = frames.at(-1).t - frames[0].t;
console.log(`Listo: ${frames.length} cuadros, ${dur.toFixed(1)} s → public/tutorial/tutorial.mp4`);
rmSync(FRAMES, { recursive: true, force: true });
