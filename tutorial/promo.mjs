// Video promocional (redes / LinkedIn): 24 s, 1080×1350 (4:5), 120 BPM.
//
//   npm run dev                      (en otra terminal, para la captura del celular)
//   node tutorial/promo.mjs [url]    → tutorial/out/promo-4x5.mp4
//
// Las escenas se animan con Web Animations y se capturan cuadro a cuadro en
// tiempos exactos, así cada corte cae en el beat de la música (tutorial/music.mjs).

import { register } from 'tsx/esm/api';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { renderMusic } from './music.mjs';
import { DEMO } from './demo.mjs';

register();
const doc = await import('../src/lib/doc.ts');
const { DISENOS, PALETAS } = await import('../src/lib/theme.ts');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = process.argv[2] ?? 'http://localhost:4321';
const OUT = join(ROOT, 'tutorial', 'out');
const WORK = join(tmpdir(), 'cotizador-promo');
const FRAMES = join(WORK, 'frames');
const W = 1080, H = 1350, FPS = 30, SECONDS = 24;

rmSync(WORK, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
mkdirSync(OUT, { recursive: true });

const fonts = {};
for (const f of doc.FONT_SPECS) {
  const p = join(ROOT, 'node_modules', '@fontsource', f.pkg, 'files', f.file);
  if (existsSync(p)) fonts[doc.fontKey(f)] = `data:font/woff2;base64,${readFileSync(p).toString('base64')}`;
}

const browser = await chromium.launch({ channel: 'msedge' });

// ── 1. Recursos: plantillas, colores, cuenta de cobro y captura del celular ──
console.log('Renderizando plantillas…');
const shot = async (html, file, width = 1080) => {
  const page = await browser.newPage({ viewport: { width, height: 1400 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => window.__docReady);
  await page.locator('.doc').screenshot({ path: join(WORK, file) });
  await page.close();
};
for (const d of DISENOS) {
  await shot(doc.renderCotizacionHtml({ ...DEMO, diseno: d.id, colores: d.colores }, fonts), `t-${d.id}.png`);
}
const pal = PALETAS.filter((p) => !['Grafito'].includes(p.nombre)).slice(0, 8);
for (const [i, p] of pal.entries()) {
  await shot(doc.renderCotizacionHtml({ ...DEMO, diseno: 'bloque', colores: { primary: p.primary, secondary: p.secondary } }, fonts), `c-${i}.png`);
}
await shot(doc.renderCuentaCobroHtml(doc.cuentaDesdeCotizacion(DEMO, '16-11-2026'), fonts), 'cuenta.png', 816);

console.log('Capturando la app en celular…');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.evaluate((d) => {
    localStorage.clear();
    localStorage.setItem('cotizador:welcomed', 'true');
    localStorage.setItem('cotizador:tab', 'items');
    localStorage.setItem('cotizador:draft', JSON.stringify(d));
    localStorage.setItem('cotizador:branding', JSON.stringify(d.branding));
  }, DEMO);
  await page.reload();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(WORK, 'mobile-items.png') });
  await page.locator('.mobile-switch [data-view="preview"]').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(WORK, 'mobile-preview.png') });
  await ctx.close();
}

// ── 2. Música ────────────────────────────────────────────────────────────────
console.log('Sintetizando música…');
writeFileSync(join(WORK, 'music.wav'), renderMusic(SECONDS));

// ── 3. Escenario animado ─────────────────────────────────────────────────────
const fontUrl = (pkg, file) => pathToFileURL(join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file)).href;
const logo = readFileSync(join(ROOT, 'public', 'logo.svg'), 'utf8');
const NAMES = Object.fromEntries(DISENOS.map((d) => [d.id, d.nombre]));

const STAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:P;font-weight:400;src:url('${fontUrl('poppins', 'poppins-latin-400-normal.woff2')}')}
@font-face{font-family:P;font-weight:600;src:url('${fontUrl('poppins', 'poppins-latin-600-normal.woff2')}')}
@font-face{font-family:P;font-weight:800;src:url('${fontUrl('poppins', 'poppins-latin-800-normal.woff2')}')}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:#0b0d11;font-family:P,sans-serif;color:#fff}
.bg{position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,#1d2230,#0b0d11 70%)}
.blob{position:absolute;border-radius:50%;filter:blur(90px);opacity:.55}
.b1{width:620px;height:620px;background:#F2D22B;left:-220px;top:-160px;opacity:.22}
.b2{width:560px;height:560px;background:#E8623A;right:-220px;bottom:-140px;opacity:.2}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:54px 54px;mask-image:radial-gradient(circle at 50% 40%,#000,transparent 75%)}
.scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center}
.brand{position:absolute;left:56px;top:52px;display:flex;align-items:center;gap:14px;font-weight:800;font-size:30px}
.brand img{width:52px;height:52px}
.title{margin-top:150px;font-weight:800;font-size:84px;line-height:1;letter-spacing:-2px;text-align:center}
.title em{font-style:normal;color:#F2D22B}
.sub{margin-top:18px;font-size:32px;color:#c7cbd3;text-align:center}
.card{position:relative;margin-top:48px;width:660px;height:760px;border-radius:26px;overflow:hidden;background:#fff;box-shadow:0 40px 90px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.08)}
.card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top}
.pill{margin-top:34px;padding:12px 26px;border-radius:999px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.18);font-weight:600;font-size:28px;position:relative;height:66px;min-width:300px;text-align:center}
.pill span{position:absolute;left:0;right:0;top:12px}
.pill b{color:#F2D22B}
/* S1 */
.s1{justify-content:center;gap:6px}
.big{font-weight:800;font-size:150px;line-height:1.02;letter-spacing:-4px}
.big.y{color:#F2D22B;position:relative}
.strike{position:absolute;left:-10px;right:-10px;top:52%;height:16px;background:#E8623A;border-radius:8px;transform-origin:left center}
.mins{font-weight:800;font-size:96px;color:#fff;margin-top:20px}
.mins em{font-style:normal;color:#F2D22B}
/* S2 */
.s2{justify-content:center;gap:10px}
.s2 img{width:240px;height:240px}
.s2 h1{font-weight:800;font-size:120px;letter-spacing:-3px;margin-top:20px}
.s2 p{font-size:36px;color:#c7cbd3}
.flash{position:absolute;inset:0;background:#fff}
/* S4 swatches */
.sw{display:flex;gap:18px;margin-top:34px}
.sw i{width:58px;height:58px;border-radius:50%;overflow:hidden;display:flex;transform:rotate(-45deg);border:3px solid transparent;position:relative}
.sw i b{flex:1}
.ring{position:absolute;width:70px;height:70px;border-radius:50%;border:4px solid #fff;top:-6px;left:-6px}
.swwrap{position:relative}
/* S5 */
.doccard{margin-top:56px;width:860px;background:#fff;color:#1c1d21;border-radius:24px;padding:46px 50px;box-shadow:0 40px 90px rgba(0,0,0,.6)}
.doccard .row{padding:22px 0;border-bottom:2px solid #eceef2}
.doccard h3{font-weight:600;font-size:34px}
.doccard p{font-size:24px;color:#62666e;margin-top:6px;line-height:1.4}
.sel{background:linear-gradient(rgba(56,132,255,.35),rgba(56,132,255,.35)) no-repeat 0 0/0% 100%}
.cursor{position:absolute;width:6px;height:52px;background:#1c1d21;border-radius:3px}
.copied{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);background:#4ec47e;color:#08240f;font-weight:800;font-size:32px;padding:16px 30px;border-radius:999px}
.badges{display:flex;gap:16px;margin-top:40px}
.badges span{padding:12px 22px;border-radius:999px;border:2px solid rgba(255,255,255,.2);font-size:26px;font-weight:600}
/* S6 */
.cuenta{position:absolute;left:60px;top:400px;width:470px;border-radius:18px;box-shadow:0 40px 90px rgba(0,0,0,.6)}
.chips{position:absolute;right:70px;top:520px;display:flex;flex-direction:column;gap:22px;align-items:flex-end}
.chip{display:flex;align-items:center;gap:14px;padding:16px 28px;border-radius:999px;font-weight:800;font-size:34px;background:#1c2028;border:2px solid var(--c);color:#fff}
.chip::before{content:'';width:18px;height:18px;border-radius:50%;background:var(--c)}
.money{position:absolute;right:60px;top:960px;font-weight:800;font-size:64px;color:#F2D22B;text-align:right}
.money small{display:block;font-size:22px;max-width:440px;margin-left:auto;color:#c7cbd3;font-weight:600}
/* S7 */
.phone{position:absolute;left:325px;top:350px;width:430px;height:900px;border-radius:56px;background:#000;padding:16px;box-shadow:0 40px 90px rgba(0,0,0,.7),0 0 0 3px #2a2f3a}
.phone .scr{position:relative;width:100%;height:100%;border-radius:42px;overflow:hidden}
.phone img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top}
.fchip{position:absolute;padding:14px 24px;border-radius:999px;background:#F2D22B;color:#1a1a10;font-weight:800;font-size:30px;box-shadow:0 16px 40px rgba(0,0,0,.4)}
/* S8 */
.s8{justify-content:center;gap:14px}
.s8 img{width:200px;height:200px}
.s8 h1{font-weight:800;font-size:112px;letter-spacing:-3px}
.url{font-size:40px;font-weight:600;padding:16px 34px;border-radius:999px;border:2px solid rgba(255,255,255,.22)}
.cta{margin-top:26px;background:#F2D22B;color:#1a1a10;font-weight:800;font-size:46px;padding:26px 58px;border-radius:999px}
.tags{display:flex;gap:16px;margin-top:22px;color:#c7cbd3;font-size:26px}
.fade{position:absolute;inset:0;background:#000}
</style></head><body>
<div class="bg"></div><div class="grid"></div><div class="blob b1"></div><div class="blob b2"></div>

<section class="scene s1">
  <div class="big w1">¿Cotizar</div>
  <div class="big w2">te quita</div>
  <div class="big y w3">horas?<i class="strike"></i></div>
  <div class="mins">Hazlo en <em>minutos.</em></div>
</section>

<section class="scene s2"><div class="flash"></div>
  <img src="data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}"><h1>Cotizador</h1>
  <p>Propuestas económicas con tu marca</p>
</section>

<div class="brand"><img src="data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}">Cotizador</div>

<section class="scene s3">
  <div class="title"><em>8</em> plantillas</div><div class="sub">Cambia de diseño sin perder tus datos</div>
  <div class="card">${DISENOS.map((d, i) => `<img class="t${i}" src="t-${d.id}.png">`).join('')}</div>
  <div class="pill">${DISENOS.map((d, i) => `<span class="n${i}">${i + 1}/8 · <b>${NAMES[d.id]}</b></span>`).join('')}</div>
</section>

<section class="scene s4">
  <div class="title">Tus <em>colores</em></div><div class="sub">Todo el diseño sale de solo dos</div>
  <div class="card">${pal.map((_, i) => `<img class="c${i}" src="c-${i}.png">`).join('')}</div>
  <div class="swwrap"><div class="sw">${pal.map((p) => `<i><b style="background:${p.primary}"></b><b style="background:${p.secondary}"></b></i>`).join('')}</div><div class="ring"></div></div>
</section>

<section class="scene s5">
  <div class="title">PDF con <em>texto real</em></div><div class="sub">Se selecciona, se copia y se busca</div>
  <div class="doccard">
    <div class="row"><h3><span class="sel l1">Identidad visual</span></h3><p><span class="sel l2">Ajuste del logo, paleta de colores y tipografías.</span></p></div>
    <div class="row"><h3><span class="sel l3">Tienda en línea</span></h3><p>Catálogo, carrito y pagos con PSE y tarjeta.</p></div>
    <div class="row" style="border:0"><h3>Kit para redes sociales</h3><p>12 plantillas editables para publicaciones.</p></div>
  </div>
  <div class="badges"><span>1 sola página</span><span>Enlaces activos</span><span>Liviano</span></div>
  <div class="copied">✓ Texto copiado</div>
</section>

<section class="scene s6">
  <div class="title">Cuenta de <em>cobro</em></div><div class="sub">Con el mismo total, en un clic</div>
  <img class="cuenta" src="cuenta.png">
  <div class="chips"><div class="chip k1" style="--c:#5aa9ff">Enviada</div><div class="chip k2" style="--c:#4ec47e">Aprobada</div><div class="chip k3" style="--c:#f2a93b">Cobrada</div></div>
  <div class="money">$5.500.000<small>Cinco millones quinientos mil pesos</small></div>
</section>

<section class="scene s7">
  <div class="title">Desde tu <em>celular</em></div>
  <div class="phone"><div class="scr"><img class="m1" src="mobile-items.png"><img class="m2" src="mobile-preview.png"></div></div>
  <div class="fchip f1" style="left:80px;top:520px">Gratis</div>
  <div class="fchip f2" style="right:70px;top:640px">Sin registro</div>
  <div class="fchip f3" style="left:60px;top:880px">Tus datos en tu navegador</div>
  <div class="fchip f4" style="right:80px;top:1080px">PDF · PNG · JSON</div>
</section>

<section class="scene s8">
  <img src="data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}"><h1>Cotizador</h1>
  <div class="url">cotizador.andersonrueda.com</div>
  <div class="cta">Pruébalo gratis</div>
  <div class="tags"><span>8 plantillas</span>·<span>Cuenta de cobro</span>·<span>Sin registro</span></div>
</section>
<div class="fade"></div>

<script>
const EASE = 'cubic-bezier(.2,.8,.2,1)', POP = 'cubic-bezier(.34,1.56,.64,1)';
const T = (sel, frames, start, dur, o = {}) => document.querySelectorAll(sel).forEach((el) => el.animate(frames, { delay: start * 1000, duration: dur * 1000, fill: o.fill ?? 'both', easing: o.ease ?? EASE, iterations: o.it ?? 1 }).pause());
const show = (sel, a, b, f = 0.12) => { T(sel, [{ opacity: 0 }, { opacity: 1 }], a, f); T(sel, [{ opacity: 1 }, { opacity: 0 }], b - f, f, { fill: 'forwards' }); };
const pop = (sel, t, from = 0.6) => T(sel, [{ opacity: 0, transform: 'scale(' + from + ') translateY(30px)' }, { opacity: 1, transform: 'none' }], t, 0.42, { ease: POP });
const B = 0.5;

// Fondo vivo: manchas que respiran con el beat
T('.b1', [{ transform: 'translate(0,0)' }, { transform: 'translate(260px,420px)' }], 0, 24, { ease: 'ease-in-out' });
T('.b2', [{ transform: 'translate(0,0)' }, { transform: 'translate(-300px,-500px)' }], 0, 24, { ease: 'ease-in-out' });
for (let t = 2; t < 22; t += B) T('.grid', [{ opacity: 1 }, { opacity: .55 }, { opacity: 1 }], t, B, { fill: 'none', ease: 'ease-out' });

// S1 — gancho
show('.s1', 0, 2.0, 0.01);
pop('.w1', 0.02); pop('.w2', 0.5); pop('.w3', 1.0);
T('.strike', [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 1.45, 0.25);
pop('.mins', 1.5, 0.8);
T('.s1', [{ transform: 'scale(1)' }, { transform: 'scale(1.15)', filter: 'blur(6px)' }], 1.85, 0.15, { fill: 'forwards' });

// S2 — marca (drop)
show('.s2', 2.0, 4.0, 0.01);
T('.flash', [{ opacity: 0.9 }, { opacity: 0 }], 2.0, 0.35);
T('.s2 img', [{ opacity: 0, transform: 'scale(.3) rotate(-25deg)' }, { opacity: 1, transform: 'none' }], 2.0, 0.6, { ease: POP });
pop('.s2 h1', 2.25); pop('.s2 p', 2.55, 0.9);
T('.s2', [{ transform: 'none' }, { transform: 'translateY(-60px)' }], 3.8, 0.2, { fill: 'forwards' });
show('.brand', 4.0, 21.0, 0.2);

// S3 — 8 plantillas, una por beat
show('.s3', 4.0, 8.0);
T('.s3 .title', [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], 4.0, 0.4);
T('.s3 .sub', [{ opacity: 0 }, { opacity: 1 }], 4.2, 0.4);
T('.s3 .card', [{ transform: 'translateY(80px) rotateX(18deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], 4.0, 0.5);
for (let i = 0; i < 8; i++) {
  const t = 4 + i * B;
  show('.s3 .t' + i, t, i === 7 ? 8 : t + B, 0.001);
  show('.s3 .n' + i, t, i === 7 ? 8 : t + B, 0.001);
  T('.s3 .card', [{ transform: 'scale(1.04)' }, { transform: 'scale(1)' }], t, 0.3, { fill: 'none', ease: 'ease-out' });
}

// S4 — colores, uno por beat
show('.s4', 8.0, 12.0);
T('.s4 .title', [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], 8.0, 0.4);
T('.s4 .sub', [{ opacity: 0 }, { opacity: 1 }], 8.2, 0.4);
const NP = ${pal.length};
for (let i = 0; i < 8; i++) {
  const t = 8 + i * B, k = i % NP;
  show('.s4 .c' + k, t, i === 7 ? 12 : t + B, 0.001);
  T('.s4 .ring', [{ transform: 'translateX(' + (k * 76) + 'px) scale(1.25)' }, { transform: 'translateX(' + (k * 76) + 'px) scale(1)' }], t, 0.3, { fill: i === 0 ? 'both' : 'forwards', ease: POP });
}

// S5 — texto seleccionable
show('.s5', 12.0, 15.0);
T('.s5 .title', [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], 12.0, 0.4);
T('.s5 .sub', [{ opacity: 0 }, { opacity: 1 }], 12.2, 0.4);
T('.doccard', [{ opacity: 0, transform: 'translateY(60px)' }, { opacity: 1, transform: 'none' }], 12.1, 0.45);
T('.l1', [{ backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%' }], 12.5, 0.35);
T('.l2', [{ backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%' }], 12.85, 0.45);
T('.l3', [{ backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%' }], 13.3, 0.35);
pop('.s5 .badges span:nth-child(1)', 13.5); pop('.s5 .badges span:nth-child(2)', 13.75); pop('.s5 .badges span:nth-child(3)', 14.0);
T('.copied', [{ opacity: 0, transform: 'translate(-50%,40px) scale(.8)' }, { opacity: 1, transform: 'translate(-50%,0)' }], 14.0, 0.4, { ease: POP });

// S6 — cuenta de cobro y estados
show('.s6', 15.0, 18.0);
T('.s6 .title', [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], 15.0, 0.4);
T('.s6 .sub', [{ opacity: 0 }, { opacity: 1 }], 15.2, 0.4);
T('.cuenta', [{ opacity: 0, transform: 'translateX(-300px) rotate(-12deg)' }, { opacity: 1, transform: 'rotate(-4deg)' }], 15.05, 0.55, { ease: POP });
pop('.k1', 15.5); pop('.k2', 16.0); pop('.k3', 16.5);
T('.k3', [{ boxShadow: '0 0 0 0 rgba(242,169,59,.7)' }, { boxShadow: '0 0 0 22px rgba(242,169,59,0)' }], 16.6, 0.6, { fill: 'none' });
pop('.money', 17.0, 0.7);

// S7 — celular
show('.s7', 18.0, 21.0);
T('.s7 .title', [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'none' }], 18.0, 0.4);
T('.phone', [{ transform: 'translateY(700px) rotate(6deg)' }, { transform: 'none' }], 18.0, 0.6, { ease: POP });
show('.m2', 19.5, 21.0, 0.2);
pop('.f1', 18.5); pop('.f2', 19.0); pop('.f3', 19.5); pop('.f4', 20.0);

// S8 — cierre
show('.s8', 21.0, 24.0, 0.2);
T('.s8 img', [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'none' }], 21.0, 0.6, { ease: POP });
pop('.s8 h1', 21.25); pop('.url', 21.5, 0.8); pop('.cta', 22.0, 0.7); pop('.tags', 22.3, 0.9);
for (let t = 22.5; t < 23.5; t += B) T('.cta', [{ transform: 'scale(1.07)' }, { transform: 'scale(1)' }], t, 0.4, { fill: 'none', ease: 'ease-out' });
T('.fade', [{ opacity: 0 }, { opacity: 1 }], 23.55, 0.45);

window.seek = (ms) => document.getAnimations().forEach((a) => { a.currentTime = ms; });
window.ready = Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => {}))]);
</script></body></html>`;
writeFileSync(join(WORK, 'stage.html'), STAGE);

// ── 4. Cuadros ───────────────────────────────────────────────────────────────
console.log('Capturando cuadros…');
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(WORK, 'stage.html')).href);
await page.evaluate(() => window.ready);
const total = FPS * SECONDS;
for (let f = 0; f < total; f++) {
  await page.evaluate((ms) => window.seek(ms), (f * 1000) / FPS);
  await page.screenshot({ path: join(FRAMES, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  if (f % 90 === 0) console.log(`  ${Math.round((f / total) * 100)}%`);
}
await browser.close();

// ── 5. Video final ───────────────────────────────────────────────────────────
console.log('Codificando…');
const out = join(OUT, 'promo-4x5.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(FRAMES, 'f%05d.jpg'), '-i', join(WORK, 'music.wav'),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '21.9', '-i', out, '-frames:v', '1', join(OUT, 'promo-portada.jpg')]);
console.log(`Listo: ${out}`);
