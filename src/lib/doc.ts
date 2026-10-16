// Render del documento como HTML/CSS. Lo usan la web (iframe + print()) y el CLI
// (Playwright + Edge), así el PDF sale vectorial y con texto seleccionable.
// Este módulo no toca el DOM: solo arma strings, para que también corra en Node.

import { buildIconSvg } from './icons';
import { TEMPLATES, type Template } from './templates';
import { formatCOP, totalReal, totales, valorItem, validaHasta, qtyLabel, ivaTag, filasDesglose, logoClase, LOGO_CSS, type Cotizacion, type Totales } from './state';
import { disenoDe, onColor, readableOn, shade, logoTinteSvg } from './theme';
import { escapeHtml, normalizeWebUrl } from './esc';
import { renderLayout } from './layouts';

export { escapeHtml } from './esc';

export const DOC_W = 1080;

/** Fuentes que pueden usar las plantillas (archivos de @fontsource, subset latin). */
export type FontSpec = { family: string; weight: number; pkg: string; file: string };

export const FONT_SPECS: FontSpec[] = [
  ...[400, 500, 700, 800, 900].map((w) => ({ family: 'Roboto', weight: w, pkg: 'roboto', file: `roboto-latin-${w}-normal.woff2` })),
  ...[400, 500, 600, 700, 800].map((w) => ({ family: 'Poppins', weight: w, pkg: 'poppins', file: `poppins-latin-${w}-normal.woff2` })),
  ...[400, 700, 900].map((w) => ({ family: 'Playfair Display', weight: w, pkg: 'playfair-display', file: `playfair-display-latin-${w}-normal.woff2` })),
];

export const fontKey = (f: { family: string; weight: number }) => `${f.family}:${f.weight}`;

/** URL (o data URL) de cada fuente, por fontKey. */
export type FontUrls = Record<string, string>;

export function effectiveTemplate(c: Cotizacion): Template {
  const base = TEMPLATES[c.plantilla] ?? TEMPLATES.oscura;
  const o = c.coloresOverride ?? {};
  if (c.colores?.primary && c.colores?.secondary) {
    // Primario = fondo del encabezado (degradado hacia un tono oscuro), secundario = acento
    const p = c.colores.primary;
    return {
      ...base,
      headerBg: p,
      headerBg2: o.bg2 ?? shade(p, 0.78),
      accent: readableOn(c.colores.secondary, p, 3), // si no se lee sobre el principal, se ajusta el tono
      text: o.text ?? onColor(p),
      cardBg: o.cardBg ?? base.cardBg,
      cardText: o.cardText ?? base.cardText,
    };
  }
  return {
    ...base,
    headerBg: o.bg ?? base.headerBg,
    headerBg2: o.bg2 ?? base.headerBg2,
    accent: o.accent ?? base.accent,
    text: o.text ?? base.text,
    cardBg: o.cardBg ?? base.cardBg,
    cardText: o.cardText ?? base.cardText,
  };
}

function fontFaces(fonts: FontUrls): string {
  return FONT_SPECS
    .filter((f) => fonts[fontKey(f)])
    .map((f) => `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:block;src:url('${fonts[fontKey(f)]}') format('woff2');}`)
    .join('\n');
}

// ── Script que corre dentro del documento ────────────────────────────────────
// Replica el layout del render en canvas que se usaba antes: mismos tamaños,
// mismo ajuste de fuente (fitFontSize), mismo recorte de firma y misma posición
// vertical del texto (el canvas usaba textBaseline 'top', CSS centra el texto en
// la línea; cvShift corrige esa diferencia midiendo la fuente real).
// Expone window.__docReady (Promise<{width, height}>) para web y CLI.
const ENHANCE_JS = `
(function () {
  var W = ${DOC_W}, PX = 56;
  function px(n) { return n + 'px'; }
  function wOf(el) { return el.getBoundingClientRect().width; }
  function q(sel) { return document.querySelector(sel); }
  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function place(el, left, top) { if (!el) return; el.style.left = px(left); el.style.top = px(top); }
  function fitSize(el, max, min, maxW) {
    for (var s = max; s >= min; s -= 2) { el.style.fontSize = px(s); if (wOf(el) <= maxW) return s; }
    el.style.fontSize = px(min); return min;
  }
  var mctx = document.createElement('canvas').getContext('2d');
  function cvShift(el) {
    var cs = getComputedStyle(el), size = parseFloat(cs.fontSize);
    var lh = parseFloat(cs.lineHeight); if (!isFinite(lh)) lh = size;
    mctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + size + 'px ' + cs.fontFamily;
    mctx.textBaseline = 'alphabetic';
    var a = mctx.measureText('Hg');
    mctx.textBaseline = 'top';
    var t = mctx.measureText('Hg');
    var topToBaseline = a.actualBoundingBoxAscent - t.actualBoundingBoxAscent;
    var cssBaseline = (lh - (a.fontBoundingBoxAscent + a.fontBoundingBoxDescent)) / 2 + a.fontBoundingBoxAscent;
    el.style.transform = 'translateY(' + px(topToBaseline - cssBaseline) + ')';
  }
  // Achica la fuente hasta que el texto quepa en su caja (white-space:nowrap)
  function fitBlock(el) {
    var max = parseFloat(el.dataset.max || getComputedStyle(el).fontSize), min = parseFloat(el.dataset.min || '12');
    for (var s = max; s >= min; s -= 1) { el.style.fontSize = px(s); if (el.scrollWidth <= el.clientWidth + 0.5) return; }
  }
  function loadImg(img) {
    return new Promise(function (resolve) {
      if (img.complete && img.naturalWidth) return resolve();
      img.onload = function () { resolve(); }; img.onerror = function () { resolve(); };
    });
  }
  function trim(img) {
    return loadImg(img).then(function () {
      return new Promise(function (resolve) {
        try {
          var c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          if (!c.width || !c.height) return resolve();
          var x = c.getContext('2d'); x.drawImage(img, 0, 0);
          var d = x.getImageData(0, 0, c.width, c.height).data;
          var minX = c.width, minY = c.height, maxX = 0, maxY = 0;
          for (var y = 0; y < c.height; y++) for (var i = 0; i < c.width; i++) {
            var k = (y * c.width + i) * 4;
            var white = d[k] > 244 && d[k + 1] > 244 && d[k + 2] > 244;
            if (d[k + 3] > 16 && !white) {
              if (i < minX) minX = i; if (y < minY) minY = y;
              if (i > maxX) maxX = i; if (y > maxY) maxY = y;
            }
          }
          if (minX > maxX) return resolve();
          var p = 8;
          minX = Math.max(0, minX - p); minY = Math.max(0, minY - p);
          maxX = Math.min(c.width - 1, maxX + p); maxY = Math.min(c.height - 1, maxY + p);
          var o = document.createElement('canvas');
          o.width = maxX - minX + 1; o.height = maxY - minY + 1;
          var ox = o.getContext('2d');
          ox.drawImage(c, minX, minY, o.width, o.height, 0, 0, o.width, o.height);
          // El papel blanco se vuelve transparente (bordes suaves) para fondos de color
          var od = ox.getImageData(0, 0, o.width, o.height), px8 = od.data;
          for (var j = 0; j < px8.length; j += 4) {
            var lum = (px8[j] + px8[j + 1] + px8[j + 2]) / 3;
            if (lum > 245) px8[j + 3] = 0;
            else if (lum > 200) px8[j + 3] = Math.round(px8[j + 3] * (245 - lum) / 45);
          }
          ox.putImageData(od, 0, 0);
          img.onload = function () { resolve(); };
          img.src = o.toDataURL('image/png');
        } catch (e) { resolve(); }
      });
    });
  }
  // Escala a una caja como drawImage: llena el ancho y limita por alto
  function boxFit(img, maxW, maxH) {
    var r = img.naturalWidth / img.naturalHeight; if (!isFinite(r) || !r) return;
    var w = maxW, h = maxW / r;
    if (h > maxH) { h = maxH; w = maxH * r; }
    img.style.width = px(w); img.style.height = px(h);
    return w;
  }

  function layoutCotizacion() {
    // Encabezado
    var reserve = 0, logo = q('.hdr .logo');
    if (logo && logo.naturalWidth) {
      var r = logo.naturalWidth / logo.naturalHeight, lw = 72, lh = 72 / r;
      if (lh > 72) { lh = 72; lw = 72 * r; }
      logo.style.width = px(lw); logo.style.height = px(lh);
      var pad = parseFloat(getComputedStyle(logo).paddingLeft) || 0; // logo con fondo
      place(logo, W - PX - lw - pad * 2, 38 - pad);
      reserve = lw + pad * 2 + 20;
    }
    var right = W - PX - reserve;
    var title = q('.hdr .title'), num = q('.hdr .num'), sep = q('.hdr .tsep');
    var T = fitSize(title, 50, 28, right - PX - 160);
    place(title, PX, 44);
    var sepX = PX + wOf(title) + 28;
    place(sep, sepX - 1.5, 44); sep.style.height = px(T);
    fitSize(num, T, 24, right - sepX - 30);
    place(num, sepX + 22, 44);
    place(q('.hdr .fecha'), PX, 44 + T + 14);
    var divY = 44 + T + 14 + 28 + 14;
    place(q('.hdr .hr'), PX, divY - 0.5);
    var bY = divY + 24;
    place(q('.hdr .alc-h'), PX, bY);
    place(q('.hdr .alc-p'), PX, bY + 52);
    place(q('.hdr .msep'), W / 2 + 10 - 1.5, bY);
    var rx = W / 2 + 10 + 30, rw = W - PX - rx;
    var lbl = q('.hdr .lbl'); fitSize(lbl, 16, 10, rw); place(lbl, rx, bY + 8);
    var money = q('.hdr .money'), cop = q('.hdr .cop');
    var copW = wOf(cop) + 16;
    var ms = fitSize(money, 58, 28, rw - copW - 8);
    place(money, rx, bY + 38);
    place(cop, rx + wOf(money) + 14, bY + 50 - Math.max(0, 58 - ms) * 0.3);

    // Ítems: bloque "Total" centrado verticalmente (textBaseline 'middle')
    all('.card').forEach(function (card) {
      var h = card.offsetHeight, cx = card.offsetWidth - 186 / 2;
      var tl = card.querySelector('.tl'), tv = card.querySelector('.tv');
      var vs = fitSize(tv, 30, 18, 186 - 26);
      fitSize(tl, 18, 12, 186 - 16);
      place(tl, cx - wOf(tl) / 2, h / 2 - 24 - 9);
      place(tv, cx - wOf(tv) / 2, h / 2 + 14 - vs / 2);
    });

    // Firma y nombre
    var firma = q('.foot .firma-img');
    if (firma) boxFit(firma, 240, 58);
    var nom = q('.foot .nom');
    fitSize(nom, 16, 10, (W - PX * 2) * 0.3 - 24);

    // Contacto: web centrada, ciudad/país alineados a la derecha
    all('.contact .ctr').forEach(function (el) { el.style.left = px(W / 2 - wOf(el) / 2); });
    all('.contact .rgt').forEach(function (el) { el.style.left = px(W - PX - wOf(el)); });
  }

  window.__docReady = (async function () {
    if (document.fonts) {
      await Promise.all(Array.from(document.fonts).map(function (f) { return f.load().catch(function () {}); }));
      await document.fonts.ready;
    }
    await Promise.all(all('img').map(loadImg));
    await Promise.all(all('img[data-trim]').map(trim));
    var doc = q('.doc');
    if (doc.classList.contains('cot')) layoutCotizacion();
    all('[data-fit]').forEach(fitBlock);
    all('[data-cv]').forEach(cvShift);
    var rect = doc.getBoundingClientRect();
    var w = Math.ceil(rect.width), h = Math.ceil(rect.height);
    if (!doc.dataset.fixedPage) {
      var st = document.createElement('style');
      st.textContent = '@page{size:' + w + 'px ' + h + 'px;margin:0}';
      document.head.appendChild(st);
    }
    return { width: w, height: h };
  })();
})();
`;

export function page(title: string, css: string, body: string, fonts: FontUrls): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
${fontFaces(fonts)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
a{color:inherit;text-decoration:none}
${css}
</style></head>
<body>${body}<script>${ENHANCE_JS}</script></body></html>`;
}

// ── Cotización ───────────────────────────────────────────────────────────────
// Medidas en px sobre el ancho fijo de 1080, las mismas del canvas original.

const F = 'Roboto, Arial, sans-serif';

const COT_CSS = `
.doc{width:${DOC_W}px;font-family:${F};background:var(--page);position:relative;padding-bottom:24px}
.doc *{font-family:${F}}
.ab{position:absolute;white-space:nowrap;line-height:1}
.hdr{position:relative;height:420px;background:linear-gradient(111.25deg,var(--h1),var(--h2));color:var(--txt)}
.hdr .title,.hdr .num{font-weight:900;font-size:50px}
.hdr .num{color:var(--acc)}
.hdr .tsep{position:absolute;width:3px;background:var(--acc)}
.hdr .logo{position:absolute}
${LOGO_CSS}
.hdr .fecha{font-weight:700;font-size:20px}
.hdr .hr{position:absolute;width:${DOC_W - 112}px;height:1px;background:rgba(255,255,255,.15)}
.hdr .alc-h{font-weight:900;font-size:42px}
.hdr .alc-p{position:absolute;width:${DOC_W / 2 - 56 - 20}px;font-size:21px;line-height:24px;max-height:72px;overflow:hidden;white-space:pre-line}
.hdr .msep{position:absolute;width:3px;height:140px;background:rgba(255,255,255,.85)}
.hdr .lbl{font-weight:700;font-size:16px}
.hdr .money{font-weight:900;font-size:58px}
.hdr .cop{font-weight:900;font-size:38px;color:var(--acc)}
.items{position:relative;margin:-60px 56px 0}
.card,.tiempo{position:relative;background:var(--card);color:var(--ctxt)}
.card::before,.tiempo::before{content:'';position:absolute;inset:-0.5px;border:1px solid var(--bd);pointer-events:none}
.card{min-height:150px}
.vl{position:absolute;left:117.5px;width:1px;background:var(--bd)}
.card .vl{top:18px;bottom:18px}
.card .vl.r{left:${DOC_W - 112 - 186 - 0.5}px}
.card .ico{position:absolute;left:34px;top:50%;margin-top:-28px;width:56px;height:56px}
.ico svg{display:block;width:100%;height:100%}
.cnt{margin-left:142px;width:${DOC_W - 112 - 186 - 142 - 24}px;padding:24px 0}
.cnt h3{font-weight:700;font-size:24px;line-height:29px;white-space:pre-line}
.cnt p{font-size:17px;line-height:22px;color:var(--cmut);margin-top:4px;white-space:pre-line}
.tl{font-weight:500;font-size:18px;color:var(--cmut)}
.tv{font-weight:900;font-size:30px}
.tiempo{height:130px;margin:110px 56px 0}
.resumen{margin:50px 56px 0;display:flex;justify-content:flex-end}
.resumen dl{width:470px;background:var(--card);border:1px solid var(--bd);padding:18px 24px;display:grid;grid-template-columns:1fr auto;gap:8px 24px;color:var(--ctxt)}
.resumen dt{font-size:17px;color:var(--cmut)}
.resumen dd{font-size:17px;font-weight:700;text-align:right}
.resumen .tot{font-size:22px;font-weight:900;color:var(--ctxt);padding-top:8px;border-top:1px solid var(--bd)}
.resumen .nota{grid-column:1/-1;font-size:14px;color:var(--cmut)}
.tiempo .vl{top:20px;bottom:20px}
.tiempo .ico{position:absolute;left:42px;top:38px;width:54px;height:54px}
.tiempo h4{left:138px;top:28px;font-weight:700;font-size:18px}
.tiempo p{position:absolute;left:138px;top:62px;width:${DOC_W - 112 - 180}px;font-size:16px;line-height:22px;max-height:88px;overflow:hidden;color:var(--cmut);white-space:pre-line}
.foot{position:relative;height:150px;margin:0 56px;background:var(--fbg);color:var(--ftxt)}
.foot .firma-img{position:absolute;left:28px;top:16px}
.foot .line{position:absolute;left:8px;top:77.4px;width:${(DOC_W - 112) * 0.3 - 16}px;height:1.2px;background:#1A1A1A}
.foot .nom{left:12px;top:84px;font-weight:800;font-size:16px}
.foot .cc{left:12px;top:106px;font-weight:500;font-size:13px;color:#555}
.foot .dv{position:absolute;left:${(DOC_W - 112) * 0.3 - 0.5}px;top:0;width:1px;height:146px;background:var(--bd)}
.foot h4{left:${(DOC_W - 112) * 0.3 + 24}px;top:10px;font-weight:800;font-size:17px}
.foot .terms{position:absolute;left:${(DOC_W - 112) * 0.3 + 24}px;top:42px;width:${(DOC_W - 112) * 0.7 - 42}px}
.foot .terms p{font-size:15px;line-height:20px;max-height:60px;overflow:hidden;color:#555}
.acept{margin:0 56px;padding:64px 8px 16px;background:var(--fbg);color:var(--ftxt);border-top:1px solid var(--bd)}
.acept .ln{width:${(DOC_W - 112) * 0.3 - 16}px;border-top:1.2px solid #1A1A1A;padding-top:6px;font-weight:800;font-size:16px}
.acept small{display:block;font-weight:500;font-size:13px;color:#555}
.contact{position:relative;height:88px;font-size:14px}
.contact .ab{font-size:14px}
`;

/** Quita líneas vacías, como el wrapText del canvas (filter(Boolean)). */
function sinLineasVacias(s: string): string {
  return (s ?? '').split('\n').filter((l) => l.trim()).join('\n');
}

export function renderCotizacionHtml(c: Cotizacion, fonts: FontUrls = {}): string {
  if (disenoDe(c) !== 'clasica') {
    const { css, body } = renderLayout(c);
    return page(`COTIZACION_${c.numero}`, css, body, fonts);
  }
  const t = effectiveTemplate(c);
  const vars = `--page:${t.pageBg};--h1:${t.headerBg};--h2:${t.headerBg2};--acc:${t.accent};--txt:${t.text};--card:${t.cardBg};--ctxt:${t.cardText};--cmut:${t.cardMuted};--bd:${t.cardBorder};--fbg:${t.footerBg};--ftxt:${t.footerText}`;
  const b = c.branding;
  const k = b.contacto;
  const webUrl = normalizeWebUrl(k.web);
  const web = escapeHtml(k.web);
  const webLink = (txt: string) => (webUrl ? `<a href="${escapeHtml(webUrl)}">${txt}</a>` : txt);
  const muted = t.cardMuted || '#777';
  const strong = t.cardText || '#1A1A1A';

  const items = c.items.map((it) => {
    const desc = sinLineasVacias(it.descripcion);
    return `
  <div class="card">
    <div class="ico">${buildIconSvg(it.iconKey, t.iconColor, 2)}</div>
    <div class="vl"></div><div class="vl r"></div>
    <div class="cnt"><h3 data-cv>${escapeHtml(it.titulo || '—')}</h3>${desc ? `<p data-cv>${escapeHtml(desc)}</p>` : ''}</div>
    <span class="ab tl" data-cv>${escapeHtml([qtyLabel(it), ivaTag(c, it)].filter(Boolean).join(' · ') || 'Total')}</span>
    <b class="ab tv" data-cv>${formatCOP(valorItem(it))}</b>
  </div>`;
  }).join('');

  const body = `
<div class="doc cot" style="${vars}">${logoTinteSvg(c)}
  <header class="hdr">
    ${b.logoDataUrl ? `<img class="logo${logoClase(b)}" src="${escapeHtml(b.logoDataUrl)}" alt="">` : ''}
    <h1 class="ab title" data-cv>${escapeHtml((c.titulo || 'Propuesta económica').toUpperCase())}</h1>
    <div class="tsep"></div>
    <span class="ab num" data-cv>${escapeHtml(c.numero)}</span>
    <div class="ab fecha" data-cv>Fecha: ${escapeHtml(c.fecha)}${validaHasta(c) ? ` · Válida hasta: ${escapeHtml(validaHasta(c))}` : ''}</div>
    <div class="hr"></div>
    <h2 class="ab alc-h" data-cv>Alcance</h2>
    <p class="alc-p" data-cv>${escapeHtml(c.alcance || '—')}</p>
    <div class="msep"></div>
    <div class="ab lbl" data-cv>COSTO TOTAL DE REQUERIMIENTOS</div>
    <b class="ab money" data-cv>${formatCOP(totalReal(c))}</b>
    <span class="ab cop" data-cv>COP</span>
  </header>
  <section class="items">${items}</section>
  ${resumenClasica(totales(c))}
  <section class="tiempo"${totales(c).conDesglose ? ' style="margin-top:50px"' : ''}>
    <div class="ico">${buildIconSvg('clock', t.iconColor, 2)}</div>
    <div class="vl"></div>
    <h4 class="ab" data-cv>Tiempo de entrega</h4>
    <p data-cv>${escapeHtml(c.tiempoEntrega)}</p>
  </section>
  <section class="foot">
    ${b.representante.firmaDataUrl ? `<img class="firma-img" data-trim src="${escapeHtml(b.representante.firmaDataUrl)}" alt="">` : ''}
    <div class="line"></div>
    <div class="ab nom" data-cv>${escapeHtml(b.representante.nombre)}</div>
    <div class="ab cc" data-cv>CC: ${escapeHtml(b.representante.cedula)}</div>
    <div class="dv"></div>
    <h4 class="ab" data-cv>Términos y condiciones</h4>
    <div class="terms">${c.terminos.slice(0, 6).map((x) => `<p data-cv>${escapeHtml(x)}</p>`).join('')}</div>
  </section>
  ${c.aceptacionCliente ? `<section class="acept"><div class="ln">Aceptación del cliente<small>${escapeHtml(c.cliente?.nombre || 'Nombre, firma y fecha')}</small></div></section>` : ''}
  <footer class="contact">
    <span class="ab" data-cv style="left:56px;top:18px;font-weight:500;color:${muted}">CEL: ${escapeHtml(k.cel)}</span>
    <span class="ab" data-cv style="left:56px;top:42px;font-weight:800;color:${muted}">Email: ${k.email ? `<a href="mailto:${escapeHtml(k.email)}">${escapeHtml(k.email)}</a>` : ''}</span>
    <span class="ab ctr" data-cv style="white-space:pre;top:18px;font-weight:500;color:${strong}">${webLink(web)}</span>
    <span class="ab ctr" data-cv style="white-space:pre;top:42px;font-weight:800;color:${strong}">${webLink(web)}</span>
    <span class="ab rgt" data-cv style="top:18px;font-weight:700;color:${strong}">${escapeHtml(k.ciudad)}</span>
    <span class="ab rgt" data-cv style="top:42px;font-weight:800;color:${strong}">${escapeHtml(k.pais)}</span>
  </footer>
</div>`;

  return page(`COTIZACION_${c.numero}`, COT_CSS, body, fonts);
}

export function renderCotizacionMarkdown(c: Cotizacion): string {
  const lines: string[] = [];
  lines.push(`# Propuesta Económica — ${c.numero}`);
  lines.push(`**Fecha:** ${c.fecha}`);
  lines.push('');
  lines.push(`## Alcance`);
  lines.push(c.alcance || '_Sin especificar_');
  lines.push('');
  lines.push(`## Costo total de requerimientos`);
  lines.push(`### ${formatCOP(totalReal(c))} COP`);
  const t = totales(c);
  if (t.conDesglose) {
    lines.push('');
    for (const r of filasDesglose(t)) lines.push(r.tipo === 'nota' ? `_${r.label}_` : `- ${r.label}: ${r.value}`);
  }
  if (validaHasta(c)) lines.push('', `Oferta válida hasta: ${validaHasta(c)}`);
  lines.push('');
  lines.push(`## Ítems`);
  lines.push('');
  for (const it of c.items) {
    lines.push(`### ${it.titulo || '_(sin título)_'}`);
    if (it.descripcion) lines.push(it.descripcion);
    lines.push('');
    lines.push(`**Total: ${formatCOP(valorItem(it))}**${qtyLabel(it) ? ` (${qtyLabel(it)})` : ''}`);
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
  return lines.join('\n');
}

function resumenClasica(t: Totales): string {
  if (!t.conDesglose) return '';
  return `<section class="resumen"><dl>${filasDesglose(t).map((r) => r.tipo === 'nota'
    ? `<dd class="nota">${escapeHtml(r.label)}</dd>`
    : `<dt${r.tipo === 'total' ? ' class="tot"' : ''}>${escapeHtml(r.label)}</dt><dd${r.tipo === 'total' ? ' class="tot"' : ''}>${r.value}</dd>`).join('')}</dl></section>`;
}

// ── Cuenta de cobro ──────────────────────────────────────────────────────────

export type CuentaCobro = {
  numero?: string;          // cotización relacionada (solo para el nombre del archivo)
  ciudad: string;
  fecha: string;            // dd-mm-aaaa
  cliente: { nombre: string; nit: string };
  emisor: { nombre: string; cedula: string; direccion: string; telefono: string; firmaDataUrl?: string };
  valor: number;
  concepto: string;         // párrafo completo "Por actividades de ..."
  cuentaBancaria: string;   // "Cuenta de Ahorros BANCOLOMBIA No. ..."
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Acepta dd-mm-aaaa, dd/mm/aaaa o aaaa-mm-dd. */
export function parseFecha(s: string): { d: number; m: number; y: number } | null {
  const v = (s ?? '').trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return { d: +m[1], m: +m[2], y: +m[3] };
  return null;
}

/** "15 de octubre de 2026" (sin año si conAnio=false). */
export function fechaLarga(s: string, conAnio = true): string {
  const f = parseFecha(s);
  if (!f) return s;
  return `${f.d} de ${MESES[f.m - 1]}${conAnio ? ` de ${f.y}` : ''}`;
}

/** "entre el 7 de septiembre y el 15 de octubre de 2026" */
export function periodoTexto(desde: string, hasta: string): string {
  const a = parseFecha(desde), b = parseFecha(hasta);
  const mismoAnio = a && b && a.y === b.y;
  return `entre el ${fechaLarga(desde, !mismoAnio)} y el ${fechaLarga(hasta)}`;
}

const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function hasta999(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100), r = n % 100;
  let s = CENTENAS[c];
  if (r) {
    let t: string;
    if (r < 30) t = UNIDADES[r];
    else t = DECENAS[Math.floor(r / 10)] + (r % 10 ? ` y ${UNIDADES[r % 10]}` : '');
    s = s ? `${s} ${t}` : t;
  }
  return s;
}

/** 1160000 → "Un millón ciento sesenta mil pesos" */
export function numeroALetras(valor: number): string {
  let n = Math.floor(Math.abs(valor));
  if (n === 0) return 'Cero pesos';
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? 'un millón' : `${hasta999(millones)} millones`);
  if (miles) partes.push(miles === 1 ? 'mil' : `${hasta999(miles)} mil`);
  if (resto) partes.push(hasta999(resto));
  // "un millón de pesos" / "dos millones de pesos" cuando no hay miles ni unidades
  const de = millones && !miles && !resto ? ' de' : '';
  const s = `${partes.join(' ')}${de} pesos`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CUENTA_CSS = `
.doc{width:816px;height:1056px;padding:110px 113px 90px 113px;font-family:Arial,'Liberation Sans',Helvetica,sans-serif;font-size:11pt;line-height:1.2;color:#000;background:#fff}
.c{text-align:center}
.blk{margin-top:44px}
.just{text-align:justify;margin-top:22px;line-height:1.25}
.firma{height:64px;margin:26px 0 22px}
.firma img{max-height:64px;max-width:220px;object-fit:contain}
`;

export function renderCuentaCobroHtml(cc: CuentaCobro, fonts: FontUrls = {}): string {
  const e = cc.emisor;
  const body = `
<div class="doc" data-fixed-page="1">
  <p>${cc.ciudad ? `${escapeHtml(cc.ciudad)}, ` : ''}${escapeHtml(fechaLarga(cc.fecha))}</p>
  <div class="c blk"><p>${escapeHtml(cc.cliente.nombre)}</p><p>NIT ${escapeHtml(cc.cliente.nit)}</p></div>
  <div class="c blk"><p>DEBE A:</p><p>${escapeHtml(e.nombre)}</p><p>C.C. ${escapeHtml(e.cedula)}</p></div>
  <div class="c blk"><p>LA SUMA DE ${formatCOP(cc.valor)}</p><p>${escapeHtml(numeroALetras(cc.valor))}</p></div>
  <p class="c" style="margin-top:28px">Por concepto de:</p>
  <p class="just">${escapeHtml(cc.concepto)}</p>
  <p style="margin-top:14px">Por favor consignar en la ${escapeHtml(cc.cuentaBancaria)}</p>
  <p style="margin-top:96px">Atentamente,</p>
  <div class="firma">${e.firmaDataUrl ? `<img data-trim src="${escapeHtml(e.firmaDataUrl)}" alt="">` : ''}</div>
  <p>${escapeHtml(e.nombre)}</p>
  <p style="margin-top:22px">Dirección: ${escapeHtml(e.direccion)}</p>
  <p>Teléfono: ${escapeHtml(e.telefono)}</p>
  <p>Cedula de ciudadanía: ${escapeHtml(e.cedula)}</p>
</div>`;
  const css = CUENTA_CSS + '\n@page{size:letter;margin:0}';
  return page(`CUENTA-COBRO-COTIZACION-${cc.numero ?? ''}`.replace(/-$/, ''), css, body, fonts);
}

/** Arma la cuenta de cobro de una cotización con sus datos de cobro. */
export function cuentaDesdeCotizacion(c: Cotizacion, hoy: string): CuentaCobro {
  const b = c.branding;
  const cobro = c.cobro ?? {};
  const base = (cobro.concepto?.trim() || `Por actividades de desarrollo correspondientes a ${c.alcance.trim() || 'los requerimientos de la cotización ' + c.numero}`).replace(/[.,\s]+$/, '');
  const periodo = cobro.desde && cobro.hasta ? `, realizadas durante el período comprendido ${periodoTexto(cobro.desde, cobro.hasta)}` : '';
  const t = totales(c);
  const parte = t.anticipoPct > 0 ? cobro.parte ?? 'total' : 'total';
  const valor = parte === 'anticipo' ? t.anticipo : parte === 'saldo' ? t.saldo : t.total;
  const extra = parte === 'anticipo' ? ` (anticipo del ${t.anticipoPct}% de la cotización ${c.numero})` : parte === 'saldo' ? ` (saldo del ${100 - t.anticipoPct}% restante de la cotización ${c.numero})` : '';
  const tel = (b.contacto.cel || '').replace(/^\+57\s*/, '');
  return {
    numero: c.numero,
    ciudad: b.contacto.ciudad?.trim() || '',
    fecha: cobro.fecha || hoy,
    cliente: { nombre: c.cliente?.nombre ?? '', nit: c.cliente?.nit ?? '' },
    emisor: {
      nombre: b.nombreLegal?.trim() || b.representante.nombre,
      cedula: b.representante.cedula,
      direccion: b.direccion ?? '',
      telefono: tel,
      firmaDataUrl: b.representante.firmaDataUrl,
    },
    valor,
    concepto: `${base}${periodo}${extra}.`,
    cuentaBancaria: b.banco || '',
  };
}
