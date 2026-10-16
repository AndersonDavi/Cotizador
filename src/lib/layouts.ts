// Plantillas de cotización en HTML/CSS (todas menos la clásica, que vive en doc.ts).
// Cada una se pinta con el tema que sale de dos colores (primario y secundario),
// así cualquier marca se ve bien en cualquier diseño.

import { buildIconSvg } from './icons';
import { formatCOP, totalReal, type Cotizacion } from './state';
import { buildTheme, coloresDe, disenoDe, isDark, themeVars, type DisenoId, type Theme } from './theme';
import { escapeHtml as e, normalizeWebUrl } from './esc';

const ICON = {
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  web: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};

function ico(name: keyof typeof ICON): string {
  return `<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg></span>`;
}

// ── Datos ya escapados, comunes a todas las plantillas ───────────────────────

type Data = {
  t: Theme;
  titulo: string;
  numero: string;
  fecha: string;
  alcance: string;
  cliente: { nombre: string; nit: string } | null;
  total: string;
  items: { n: string; titulo: string; desc: string; valor: string; iconKey: string }[];
  tiempo: string;
  terminos: string[];
  banco: string;
  empresa: string;
  rep: { nombre: string; cedula: string };
  firmaUrl: string;
  logoUrl: string;
  k: { web: string; webUrl: string; email: string; cel: string; ciudad: string; pais: string };
};

function data(c: Cotizacion): Data {
  const b = c.branding;
  const k = b.contacto;
  const cliente = c.cliente?.nombre?.trim() ? { nombre: e(c.cliente.nombre), nit: e(c.cliente.nit ?? '') } : null;
  return {
    t: buildTheme(coloresDe(c)),
    titulo: e(c.titulo?.trim() || 'Propuesta económica'),
    numero: e(c.numero),
    fecha: e(c.fecha),
    alcance: e(c.alcance || ''),
    cliente,
    total: formatCOP(totalReal(c)),
    items: c.items.map((it, i) => ({
      n: String(i + 1).padStart(2, '0'),
      titulo: e(it.titulo || '—'),
      desc: e((it.descripcion ?? '').split('\n').filter((l) => l.trim()).join('\n')),
      valor: formatCOP(it.valor),
      iconKey: it.iconKey,
    })),
    tiempo: e(c.tiempoEntrega || ''),
    terminos: c.terminos.filter((x) => x.trim()).map(e),
    banco: e(b.banco || ''),
    empresa: e(b.empresa?.trim() || b.representante.nombre || ''),
    rep: { nombre: e(b.representante.nombre), cedula: e(b.representante.cedula) },
    firmaUrl: b.representante.firmaDataUrl ? e(b.representante.firmaDataUrl) : '',
    logoUrl: b.logoDataUrl ? e(b.logoDataUrl) : '',
    k: {
      web: e((k.web || '').trim()), webUrl: e(normalizeWebUrl(k.web || '')),
      email: e(k.email || ''), cel: e(k.cel || ''), ciudad: e(k.ciudad || ''), pais: e(k.pais || ''),
    },
  };
}

const logo = (d: Data, cls = 'logo') => (d.logoUrl ? `<img class="${cls}" src="${d.logoUrl}" alt="">` : '');

/** Firma recortada; sobre fondo oscuro se invierte para que el trazo quede claro. */
const firma = (d: Data, bg = '#FFFFFF') =>
  d.firmaUrl ? `<img class="firma" data-trim src="${d.firmaUrl}" alt=""${isDark(bg) ? ' style="filter:invert(1) hue-rotate(180deg)"' : ''}>` : '';

const webA = (d: Data) => (d.k.webUrl ? `<a href="${d.k.webUrl}">${d.k.web}</a>` : d.k.web);
const mailA = (d: Data) => (d.k.email ? `<a href="mailto:${d.k.email}">${d.k.email}</a>` : '');
const lugar = (d: Data) => [d.k.ciudad, d.k.pais].filter(Boolean).join(', ');

function contactList(d: Data): string {
  const rows: string[] = [];
  if (d.k.cel) rows.push(`<li>${ico('phone')}<span>${d.k.cel}</span></li>`);
  if (d.k.email) rows.push(`<li>${ico('mail')}<span>${mailA(d)}</span></li>`);
  if (d.k.web) rows.push(`<li>${ico('web')}<span>${webA(d)}</span></li>`);
  if (lugar(d)) rows.push(`<li>${ico('pin')}<span>${lugar(d)}</span></li>`);
  return `<ul class="contact-list">${rows.join('')}</ul>`;
}

const BASE_CSS = `
.doc{width:1080px;position:relative;overflow:hidden;color:var(--ink);background:var(--paper);font-family:Poppins,Roboto,Arial,sans-serif;font-size:16px;line-height:1.45}
.pre{white-space:pre-line}
[data-fit]{white-space:nowrap;overflow:hidden}
img.firma{display:block;max-width:240px;max-height:72px;object-fit:contain}
.ic{display:inline-flex;width:18px;height:18px;flex:none}
.ic svg{width:100%;height:100%}
table{border-collapse:collapse;width:100%}
.contact-list{list-style:none;display:flex;flex-direction:column;gap:10px}
.contact-list li{display:flex;align-items:center;gap:12px}
.muted{color:var(--muted)}
`;

type Layout = { css: string; body: (d: Data) => string };

// ── Bloque ───────────────────────────────────────────────────────────────────
const bloque: Layout = {
  css: `
.doc{background:var(--pSofter)}
.top{display:flex;min-height:250px}
.top .l{flex:0 0 610px;background:var(--p);color:var(--onP);padding:52px 56px 40px}
.top h1{font-weight:800;font-size:60px;line-height:1.05;color:var(--sOnP);margin-bottom:22px}
.meta{display:grid;grid-template-columns:150px 1fr;row-gap:6px;font-size:16px}
.meta dt{font-weight:700;font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding-top:2px}
.top .r{flex:1;background:var(--s);color:var(--onS);display:flex;align-items:center;justify-content:center;gap:16px;padding:40px}
.top .r .logo{max-width:110px;max-height:90px;object-fit:contain}
.top .r .emp{font-weight:700;font-size:24px;line-height:1.15;max-width:220px}
.body{padding:52px 56px 48px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:56px}
h2{font-weight:700;font-size:30px;line-height:1.2;padding-bottom:10px;margin-bottom:18px;border-bottom:3px solid var(--p);display:inline-block;min-width:60%}
.kv{display:grid;grid-template-columns:120px 1fr;row-gap:6px;font-size:15px}
.kv dt{font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding-top:2px}
.sec{margin-top:44px}
table th{font-weight:600;font-size:15px;text-align:left;padding:12px 16px}
table th.s{background:var(--s);color:var(--onS)}
table th.p{background:var(--p);color:var(--onP);text-align:right}
table td{background:#fff;border:1px solid var(--line);padding:14px 16px;vertical-align:top}
td.n{width:64px;font-weight:700;color:var(--muted)}
td.v{width:200px;text-align:right;font-weight:700;white-space:nowrap}
td b{display:block;font-weight:600;font-size:16px}
td p{font-size:14px;color:var(--muted);margin-top:4px}
.totals{display:flex;justify-content:flex-end;margin-top:18px}
.totals div{display:flex;align-items:center;gap:40px;background:var(--s);color:var(--onS);padding:14px 20px;min-width:420px;justify-content:space-between}
.totals span{font-weight:700;font-size:16px;letter-spacing:.06em;text-transform:uppercase}
.totals strong{font-weight:800;font-size:28px}
.foot-cols{display:grid;grid-template-columns:1.3fr 1fr;gap:56px;margin-top:44px;padding-top:28px;border-top:2px solid var(--pSoft)}
h3{font-weight:700;font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
.foot-cols p,.foot-cols li{font-size:14px}
.foot-cols ol{padding-left:18px}
.sig{display:flex;flex-direction:column;align-items:flex-start}
.sig .line{width:260px;border-top:1.5px solid var(--ink);margin-top:6px;padding-top:6px;font-weight:600;font-size:15px}
.bar{background:var(--p);color:var(--onP);display:flex;justify-content:space-between;align-items:center;padding:22px 56px;font-size:14px}
.bar span{display:flex;align-items:center;gap:10px}
`,
  body: (d) => `
<div class="top">
  <div class="l">
    <h1 data-fit data-min="34">${d.titulo}</h1>
    <dl class="meta"><dt>N.º</dt><dd>${d.numero}</dd><dt>Fecha</dt><dd>${d.fecha}</dd></dl>
  </div>
  <div class="r">${logo(d)}<div class="emp">${d.empresa}</div></div>
</div>
<div class="body">
  <div class="cols">
    <div><h2>Para</h2><dl class="kv">
      ${d.cliente ? `<dt>Cliente</dt><dd>${d.cliente.nombre}</dd>${d.cliente.nit ? `<dt>NIT</dt><dd>${d.cliente.nit}</dd>` : ''}` : ''}
      <dt>Alcance</dt><dd class="pre">${d.alcance || '—'}</dd></dl></div>
    <div><h2>De</h2><dl class="kv">
      <dt>Nombre</dt><dd>${d.rep.nombre}</dd>
      ${d.rep.cedula ? `<dt>CC / NIT</dt><dd>${d.rep.cedula}</dd>` : ''}
      ${d.k.cel ? `<dt>Celular</dt><dd>${d.k.cel}</dd>` : ''}
      ${d.k.email ? `<dt>Email</dt><dd>${mailA(d)}</dd>` : ''}</dl></div>
  </div>
  <div class="sec">
    <h2>Detalle de la propuesta</h2>
    <table><thead><tr><th class="s">#</th><th class="s">Descripción</th><th class="p">Valor</th></tr></thead>
    <tbody>${d.items.map((it) => `<tr><td class="n">${it.n}</td><td><b>${it.titulo}</b>${it.desc ? `<p class="pre">${it.desc}</p>` : ''}</td><td class="v">${it.valor}</td></tr>`).join('')}</tbody></table>
    <div class="totals"><div><span>Total</span><strong>${d.total} COP</strong></div></div>
  </div>
  <div class="foot-cols">
    <div>
      ${d.tiempo ? `<h3>Tiempo de entrega</h3><p class="pre">${d.tiempo}</p>` : ''}
      ${d.terminos.length ? `<h3 style="margin-top:18px">Términos y condiciones</h3><ol>${d.terminos.map((x) => `<li>${x}</li>`).join('')}</ol>` : ''}
      ${d.banco ? `<h3 style="margin-top:18px">Información de pago</h3><p>${d.banco}</p>` : ''}
    </div>
    <div class="sig">${firma(d)}<div class="line">${d.rep.nombre}${d.rep.cedula ? `<div class="muted" style="font-weight:400;font-size:13px">CC ${d.rep.cedula}</div>` : ''}</div></div>
  </div>
</div>
<div class="bar">
  ${d.k.cel ? `<span>${ico('phone')}${d.k.cel}</span>` : ''}
  ${d.k.email ? `<span>${ico('mail')}${mailA(d)}</span>` : ''}
  ${d.k.web ? `<span>${ico('web')}${webA(d)}</span>` : ''}
  ${lugar(d) ? `<span>${ico('pin')}${lugar(d)}</span>` : ''}
</div>`,
};

// ── Noche ────────────────────────────────────────────────────────────────────
const noche: Layout = {
  css: `
.doc{background:var(--p);color:var(--onP);padding:130px 100px 120px}
.swoosh{position:absolute;width:560px;height:560px;pointer-events:none}
.swoosh.tl{left:-250px;top:-300px}
.swoosh.br{right:-260px;bottom:-300px;transform:rotate(180deg)}
.hd{display:flex;justify-content:space-between;gap:40px;position:relative}
.lbl{font-weight:700;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--sOnP)}
.to{max-width:440px;margin-top:70px}
.to .name{font-weight:700;font-size:22px;margin-top:6px}
.to p{font-size:15px;opacity:.85}
.brand{text-align:right;display:flex;flex-direction:column;align-items:flex-end}
.brand .logo{max-width:150px;max-height:80px;object-fit:contain;margin-bottom:10px}
.brand .emp{font-weight:800;font-size:24px;line-height:1.1;text-transform:uppercase;color:var(--sOnP);max-width:420px}
.brand h1{font-weight:800;font-size:34px;line-height:1.1;text-transform:uppercase;margin-top:26px;max-width:460px}
.brand .meta{font-size:15px;margin-top:6px;opacity:.9}
.rows{margin-top:56px;display:flex;flex-direction:column;gap:12px}
.row{display:grid;grid-template-columns:70px 1fr 210px;gap:12px}
.row>div{border:1.5px solid currentColor;padding:14px 18px}
.row.h>div{font-weight:700;font-size:16px;text-transform:uppercase;text-align:center;letter-spacing:.04em}
.row .n{text-align:center;font-weight:700}
.row .v{text-align:right;font-weight:700;white-space:nowrap}
.row b{display:block;font-weight:600;font-size:16px}
.row p{font-size:14px;opacity:.78;margin-top:4px}
.tot{display:flex;justify-content:flex-end;gap:12px;margin-top:22px}
.tot div{background:#fff;color:#16171A;padding:14px 22px;font-weight:800;font-size:20px;text-transform:uppercase}
.tot div.v{min-width:210px;text-align:right;font-size:22px}
.bt{display:grid;grid-template-columns:1fr 300px;gap:60px;margin-top:70px;position:relative}
.bt h3{font-weight:700;font-size:17px;text-transform:uppercase;letter-spacing:.06em;margin:22px 0 8px}
.bt h3:first-child{margin-top:0}
.bt p,.bt li{font-size:14px;opacity:.85}
.bt ul{padding-left:18px}
.sig{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
.sig .nm{border-top:2px solid currentColor;margin-top:8px;padding-top:8px;width:100%;font-weight:700;font-size:16px;text-transform:uppercase}
.contact{display:flex;gap:34px;flex-wrap:wrap;margin-top:56px;font-size:14px;opacity:.9;position:relative}
.contact span{display:flex;gap:10px;align-items:center}
`,
  body: (d) => {
    const sw = (cls: string) => `<svg class="swoosh ${cls}" viewBox="0 0 560 560"><defs><linearGradient id="g${cls}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${d.t.s}"/><stop offset="1" stop-color="${d.t.s}" stop-opacity="0"/></linearGradient></defs><circle cx="280" cy="280" r="250" fill="none" stroke="url(#g${cls})" stroke-width="44"/><circle cx="280" cy="280" r="190" fill="none" stroke="url(#g${cls})" stroke-width="16" opacity=".55"/></svg>`;
    return `
${sw('tl')}${sw('br')}
<div class="hd">
  <div class="to">
    <div class="lbl">Para</div>
    ${d.cliente ? `<div class="name">${d.cliente.nombre}</div>${d.cliente.nit ? `<p>NIT ${d.cliente.nit}</p>` : ''}` : ''}
    <p class="pre" style="margin-top:6px">${d.alcance}</p>
  </div>
  <div class="brand">
    ${logo(d)}<div class="emp">${d.empresa}</div>
    <h1>${d.titulo}</h1>
    <div class="meta">N.º ${d.numero}</div>
    <div class="meta">Fecha: ${d.fecha}</div>
  </div>
</div>
<div class="rows">
  <div class="row h"><div>#</div><div>Descripción</div><div>Valor</div></div>
  ${d.items.map((it) => `<div class="row"><div class="n">${it.n}</div><div><b>${it.titulo}</b>${it.desc ? `<p class="pre">${it.desc}</p>` : ''}</div><div class="v">${it.valor}</div></div>`).join('')}
</div>
<div class="tot"><div>Total</div><div class="v">${d.total}</div></div>
<div class="bt">
  <div>
    ${d.banco ? `<h3 style="color:var(--sOnP)">Información de pago</h3><p>${d.banco}</p>` : ''}
    ${d.tiempo ? `<h3 style="color:var(--sOnP)">Tiempo de entrega</h3><p class="pre">${d.tiempo}</p>` : ''}
    ${d.terminos.length ? `<h3 style="color:var(--sOnP)">Términos y condiciones</h3><ul>${d.terminos.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
  </div>
  <div class="sig">${firma(d, d.t.p)}<div class="nm">${d.rep.nombre}</div>${d.rep.cedula ? `<div style="font-size:13px;opacity:.8">CC ${d.rep.cedula}</div>` : ''}</div>
</div>
<div class="contact">
  ${d.k.cel ? `<span>${ico('phone')}${d.k.cel}</span>` : ''}
  ${d.k.email ? `<span>${ico('mail')}${mailA(d)}</span>` : ''}
  ${d.k.web ? `<span>${ico('web')}${webA(d)}</span>` : ''}
  ${lugar(d) ? `<span>${ico('pin')}${lugar(d)}</span>` : ''}
</div>`;
  },
};

// ── Diagonal ─────────────────────────────────────────────────────────────────
const diagonal: Layout = {
  css: `
.hd{display:flex;justify-content:space-between;align-items:flex-start;gap:40px;padding:64px 64px 0}
.hd h1{font-weight:700;font-size:52px;line-height:1.1;color:var(--pDeep);max-width:600px}
.brand{display:flex;align-items:center;gap:14px;max-width:340px}
.brand .logo{max-width:90px;max-height:80px;object-fit:contain}
.brand .emp{font-weight:700;font-size:26px;line-height:1.1;color:var(--pDeep)}
.band{display:flex;height:50px;margin-top:40px}
.band .a{flex:0 0 46%;background:var(--p);color:var(--onP);clip-path:polygon(0 0,100% 0,calc(100% - 36px) 100%,0 100%);display:flex;align-items:center;padding-left:64px;font-weight:700;font-size:21px}
.band .b{flex:1;margin-left:-14px;background:var(--s);color:var(--onS);clip-path:polygon(36px 0,100% 0,100% 100%,0 100%);display:flex;align-items:center;padding-left:84px;font-size:20px}
.band .b b{font-weight:700;margin-right:8px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:16px 40px;padding:26px 64px 8px;font-size:17px}
.info b{font-weight:700}
.tbl{padding:22px 64px 0}
table{border:1.5px solid var(--ink)}
th{background:var(--pDeep);color:#fff;font-weight:600;font-size:17px;padding:14px;border:1px solid var(--ink)}
td{border:1px solid var(--ink);padding:14px;vertical-align:middle;font-size:16px}
td.n{width:70px;background:var(--p);color:var(--onP);text-align:center;font-weight:700}
td.v{width:200px;text-align:center;font-weight:600;white-space:nowrap}
td b{display:block;font-weight:600}
td p{font-size:14px;color:var(--muted);margin-top:4px}
tr.t td{font-weight:700;font-size:18px}
tr.t td.v{background:var(--s);color:var(--onS);font-weight:800;font-size:20px}
.terms{padding:40px 64px 50px}
.terms h3{font-weight:700;font-size:22px;margin:0 0 10px}
.terms ul{padding-left:22px;font-size:16px}
.terms p{font-size:16px;margin-bottom:22px}
.ft{display:grid;grid-template-columns:41% 1fr}
.ft .a{background:var(--p);color:var(--onP);padding:44px 40px 44px 64px}
.ft .a .emp{font-weight:700;font-size:19px;margin-bottom:18px}
.ft .b{background:var(--s);color:var(--onS);padding:44px 56px;display:grid;grid-template-columns:1fr 1fr;gap:34px;text-align:center}
.ft .b h4{font-weight:700;font-size:18px;margin-bottom:8px}
.ft .b .slot{height:74px;display:flex;align-items:flex-end;justify-content:center}
.ft .b .ln{border-top:1.5px solid currentColor;padding-top:8px;font-size:16px}
`,
  body: (d) => `
<div class="hd"><h1 data-fit data-min="30">${d.titulo}</h1><div class="brand">${logo(d)}<div class="emp">${d.empresa}</div></div></div>
<div class="band"><div class="a">Información del cliente</div><div class="b"><b>Fecha:</b> ${d.fecha}</div></div>
<div class="info">
  <div><b>Cliente:</b> ${d.cliente?.nombre ?? '—'}</div>
  <div><b>Cotización N.º:</b> ${d.numero}</div>
  ${d.cliente?.nit ? `<div><b>NIT:</b> ${d.cliente.nit}</div>` : '<div></div>'}
  <div class="pre"><b>Alcance:</b> ${d.alcance}</div>
</div>
<div class="band"><div class="a">Servicios</div><div class="b"></div></div>
<div class="tbl"><table>
  <thead><tr><th>N.º</th><th style="text-align:left">Servicio</th><th>Valor</th></tr></thead>
  <tbody>
    ${d.items.map((it, i) => `<tr><td class="n">${i + 1}</td><td><b>${it.titulo}</b>${it.desc ? `<p class="pre">${it.desc}</p>` : ''}</td><td class="v">${it.valor}</td></tr>`).join('')}
    <tr class="t"><td></td><td>Total</td><td class="v">${d.total}</td></tr>
  </tbody>
</table></div>
<div class="terms">
  ${d.tiempo ? `<h3>Tiempo de entrega</h3><p class="pre">${d.tiempo}</p>` : ''}
  ${d.terminos.length || d.banco ? `<h3>Términos y condiciones</h3><ul>${d.terminos.map((x) => `<li>${x}</li>`).join('')}${d.banco ? `<li>Pago: ${d.banco}</li>` : ''}</ul>` : ''}
</div>
<div class="ft">
  <div class="a"><div class="emp">${d.empresa}</div>${contactList(d)}</div>
  <div class="b">
    <div><h4>Aceptación del cliente</h4><div class="slot"></div><div class="ln">${d.cliente?.nombre ?? 'Nombre y fecha'}</div></div>
    <div><h4>Firma</h4><div class="slot">${firma(d, d.t.s)}</div><div class="ln">${d.rep.nombre}</div></div>
  </div>
</div>`,
};

// ── Estudio ──────────────────────────────────────────────────────────────────
const estudio: Layout = {
  css: `
.doc{padding:0}
.bar{height:34px;background:var(--p);position:relative}
.tri{position:absolute;width:96px;height:96px;background:var(--s)}
.tri.tl{left:0;top:0;clip-path:polygon(0 0,100% 0,0 100%)}
.tri.br{right:0;bottom:0;clip-path:polygon(100% 0,100% 100%,0 100%)}
.in{padding:52px 72px 0}
.hd{display:flex;justify-content:space-between;align-items:center;gap:40px}
.hd h1{font-weight:800;font-size:76px;line-height:1;text-transform:uppercase;max-width:600px}
.brand{display:flex;align-items:center;gap:14px;max-width:340px}
.brand .logo{max-width:96px;max-height:96px;object-fit:contain;border-radius:18px}
.brand .emp{font-weight:600;font-size:28px;line-height:1.1;color:var(--pOnW)}
.to{display:grid;grid-template-columns:1fr 330px;gap:40px;margin-top:40px;align-items:end}
h2{font-weight:600;font-size:28px;margin-bottom:12px}
.kv{font-size:16px;line-height:1.6}
.kv b{font-weight:600}
.meta{display:grid;grid-template-columns:150px 1fr;font-size:16px;line-height:1.7}
.meta b{font-weight:600}
.sec{margin-top:46px}
th{background:var(--s);color:var(--onS);font-weight:600;font-size:16px;text-align:left;padding:12px 18px}
th.v,td.v{text-align:right}
td{padding:14px 18px;font-size:16px;vertical-align:top}
tbody tr:nth-child(odd) td{background:#EEF0F3}
td.n{width:60px;font-weight:600;text-align:center}
td.v{width:200px;white-space:nowrap;font-weight:600}
td b{font-weight:600;display:block}
td p{font-size:14px;color:var(--muted);margin-top:4px}
.mid{display:grid;grid-template-columns:1fr 360px;gap:50px;margin-top:40px}
.mid h2{font-size:26px}
.mid ul{padding-left:22px;font-size:15px;line-height:1.7}
.sum{border-top:1.5px solid #9AA0A8;border-bottom:1.5px solid #9AA0A8;display:flex;justify-content:space-between;align-items:center;padding:18px 0;margin-top:10px}
.sum span{font-weight:600;font-size:17px}
.sum strong{font-weight:800;font-size:26px}
.pay{background:var(--p);color:var(--onP);padding:18px 72px;margin-top:56px;font-weight:600;font-size:26px}
.bt{display:grid;grid-template-columns:1fr 330px;gap:40px;padding:30px 72px 60px}
.bt p{font-size:16px;line-height:1.7}
.bt b{font-weight:600}
.bt h2{margin-top:26px}
.sig{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center}
.sig .ln{border-top:1.5px solid #9AA0A8;width:100%;padding-top:8px;margin-top:6px;font-size:16px}
.foot{height:34px;background:var(--p);position:relative}
`,
  body: (d) => `
<div class="bar"><div class="tri tl"></div></div>
<div class="in">
  <div class="hd"><h1 data-fit data-min="36">${d.titulo}</h1><div class="brand">${logo(d)}<div class="emp">${d.empresa}</div></div></div>
  <div class="to">
    <div><h2>Para:</h2><div class="kv">
      ${d.cliente ? `<div><b>Cliente:</b> ${d.cliente.nombre}</div>${d.cliente.nit ? `<div><b>NIT:</b> ${d.cliente.nit}</div>` : ''}` : ''}
      <div class="pre"><b>Alcance:</b> ${d.alcance}</div></div></div>
    <div class="meta"><b>Cotización N.º:</b><span>${d.numero}</span><b>Fecha:</b><span>${d.fecha}</span></div>
  </div>
  <div class="sec"><h2>Detalle del servicio:</h2>
    <table><thead><tr><th style="text-align:center">N.º</th><th>Descripción</th><th class="v">Valor</th></tr></thead>
    <tbody>${d.items.map((it, i) => `<tr><td class="n">${i + 1}</td><td><b>${it.titulo}</b>${it.desc ? `<p class="pre">${it.desc}</p>` : ''}</td><td class="v">${it.valor}</td></tr>`).join('')}</tbody></table>
  </div>
  <div class="mid">
    <div>${d.terminos.length ? `<h2>Términos y condiciones:</h2><ul>${d.terminos.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}</div>
    <div><div class="sum"><span>Total</span><strong>${d.total}</strong></div></div>
  </div>
</div>
<div class="pay">Información de pago:</div>
<div class="bt">
  <div>
    ${d.banco ? `<p><b>Pago:</b> ${d.banco}</p>` : ''}
    ${d.tiempo ? `<p class="pre"><b>Tiempo de entrega:</b> ${d.tiempo}</p>` : ''}
    <h2>¿Preguntas?</h2>
    ${d.k.email ? `<p><b>Email:</b> ${mailA(d)}</p>` : ''}
    ${d.k.cel ? `<p><b>Celular:</b> ${d.k.cel}</p>` : ''}
    ${d.k.web ? `<p><b>Web:</b> ${webA(d)}</p>` : ''}
  </div>
  <div class="sig"><p style="margin-bottom:14px">Fecha: ${d.fecha}</p>${firma(d)}<div class="ln">${d.rep.nombre}</div></div>
</div>
<div class="foot"><div class="tri br"></div></div>`,
};

// ── Editorial ────────────────────────────────────────────────────────────────
const editorial: Layout = {
  css: `
.doc{padding:100px 112px 96px;font-family:Roboto,Arial,sans-serif;color:var(--pOnW)}
.hd{display:flex;justify-content:space-between;align-items:flex-start;gap:40px}
.brand .logo{max-width:160px;max-height:90px;object-fit:contain;margin-bottom:12px;display:block}
.brand .emp{font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:46px;line-height:.98;text-transform:uppercase;max-width:420px}
.hd h1{font-weight:400;font-size:38px;letter-spacing:.04em;text-transform:uppercase;text-align:right;max-width:420px;line-height:1.1}
.info{display:flex;justify-content:space-between;margin-top:64px;font-size:19px;letter-spacing:.03em;line-height:1.7}
.info .r{text-align:right}
.client{margin-top:34px;font-size:19px;letter-spacing:.03em;line-height:1.65}
.client b{font-weight:700}
.thick{height:22px;background:var(--p);margin-top:60px}
.scope{display:grid;grid-template-columns:260px 1fr;gap:30px;margin-top:40px;font-size:19px;letter-spacing:.03em;line-height:1.6}
.scope b{font-weight:700}
table{margin-top:70px}
th{font-weight:700;font-size:18px;text-align:left;padding:0 18px 18px;border-bottom:1.5px solid var(--p)}
th.v,td.v{text-align:right}
td{padding:26px 18px;font-size:18px;vertical-align:top}
td p{font-size:15px;color:var(--sOnW);margin-top:6px;line-height:1.5}
td.v{width:220px;white-space:nowrap}
tbody tr:last-child td{border-bottom:1.5px solid var(--p)}
.tot{display:flex;justify-content:flex-end;margin-top:22px}
.tot div{display:grid;grid-template-columns:auto 230px;align-items:center;gap:30px;font-size:19px}
.tot b{font-weight:700;color:var(--sOnW)}
.tot strong{background:var(--p);color:var(--onP);font-weight:700;text-align:center;padding:6px 10px}
.thin{height:6px;background:var(--p);margin-top:60px}
.ft{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px;font-size:18px;letter-spacing:.03em;line-height:1.6}
.ft i{font-style:italic}
.ft .r{text-align:center;display:flex;flex-direction:column;align-items:center}
.ft .slot{height:90px}
.ft .ln{border-top:1.5px solid var(--p);width:100%;padding-top:6px;font-style:italic}
.ft .firm{margin-top:26px}
.ft .firm .firma{margin-bottom:4px}
`,
  body: (d) => `
<div class="hd"><div class="brand">${logo(d)}<div class="emp">${d.empresa}</div></div><h1>${d.titulo}</h1></div>
<div class="info"><div>Cotización N.º: #${d.numero}</div><div class="r">Fecha: ${d.fecha}</div></div>
${d.cliente ? `<div class="client"><b>${d.cliente.nombre}</b>${d.cliente.nit ? `<br>NIT ${d.cliente.nit}` : ''}</div>` : ''}
<div class="thick"></div>
<div class="scope"><b>Alcance del proyecto</b><div class="pre">${d.alcance || '—'}</div></div>
${d.tiempo ? `<div class="scope" style="margin-top:20px"><b>Tiempo de entrega</b><div class="pre">${d.tiempo}</div></div>` : ''}
<table><thead><tr><th>Descripción</th><th class="v">Valor</th></tr></thead>
<tbody>${d.items.map((it) => `<tr><td>${it.titulo}${it.desc ? `<p class="pre">${it.desc}</p>` : ''}</td><td class="v">${it.valor}</td></tr>`).join('')}</tbody></table>
<div class="tot"><div><b>Total</b><strong>${d.total}</strong></div></div>
${d.terminos.length || d.banco ? `<div class="scope" style="margin-top:50px"><b>Términos</b><div>${d.terminos.map((x) => `<div>${x}</div>`).join('')}${d.banco ? `<div>${d.banco}</div>` : ''}</div></div>` : ''}
<div class="thin"></div>
<div class="ft">
  <div>
    <i>Si tienes preguntas sobre esta cotización, contacta a <b>${d.rep.nombre}</b>${d.k.email ? ` en ${mailA(d)}` : ''}${d.k.cel ? ` o al ${d.k.cel}` : ''}.</i>
    <div class="firm">${firma(d)}<b>¡Gracias por tu confianza!</b></div>
  </div>
  <div class="r"><div>Por favor confirma tu aceptación de esta cotización:</div><div class="slot"></div><div class="ln">Firma, nombre y fecha</div></div>
</div>`,
};

// ── Redonda ──────────────────────────────────────────────────────────────────
const redonda: Layout = {
  css: `
.doc{padding-bottom:0}
.hd{display:flex;align-items:center;gap:16px;padding:70px 90px 0;height:190px}
.hd .logo{max-width:110px;max-height:80px;object-fit:contain}
.hd .emp{font-weight:700;font-size:30px;color:var(--pOnW);line-height:1.1;max-width:420px}
.band{background:var(--p);color:var(--onP);height:240px;position:relative;padding:34px 90px 0}
.band p{font-size:19px;line-height:1.75}
.band b{font-weight:700}
.tab{position:absolute;right:60px;top:-100px;width:470px;height:190px;background:#fff;border-radius:0 0 46px 46px;display:flex;align-items:flex-end;justify-content:flex-end;padding:0 44px 28px 130px}
.tab h1{font-weight:800;font-size:44px;color:var(--sOnW);line-height:1.02;text-transform:uppercase;text-align:right;overflow-wrap:anywhere}
.dot{position:absolute;border-radius:50%}
.dot.a{left:42px;top:52px;width:42px;height:42px;border:7px solid var(--s)}
.dot.b{left:96px;top:22px;width:24px;height:24px;background:var(--p)}
.card{background:#fff;border-radius:46px 46px 0 0;margin:-70px 60px 0;padding:34px 30px 0;position:relative}
th{font-weight:600;font-size:19px;text-align:left;padding:4px 12px 20px;border-bottom:2px solid var(--p)}
th.v,td.v{text-align:right}
td{padding:22px 12px;border-bottom:1.5px solid #B9BCC2;font-size:17px;vertical-align:top}
td.v{width:200px;white-space:nowrap;font-weight:500}
td p{font-size:14px;color:var(--muted);margin-top:4px}
.mid{display:grid;grid-template-columns:1fr 380px;gap:40px;padding:26px 90px 0}
.mid h3{font-weight:600;font-size:18px;margin-bottom:8px}
.mid p,.mid li{font-size:15px}
.mid ul{padding-left:20px}
.sum{display:flex;justify-content:space-between;padding:18px 12px;border-top:1.5px solid #B9BCC2;border-bottom:1.5px solid #B9BCC2;font-size:18px}
.sum b{font-weight:700}
.sum strong{font-weight:800;font-size:24px}
.bt{display:grid;grid-template-columns:520px 1fr;gap:40px;margin-top:46px;align-items:center}
.contact{background:var(--p);color:var(--onP);padding:40px 40px 40px 90px}
.contact .contact-list{border-left:2px solid currentColor;padding-left:28px;gap:16px;font-size:17px}
.sig{display:flex;flex-direction:column;align-items:center;text-align:center;padding-right:90px}
.sig .ln{border-top:2px solid #9AA0A8;width:280px;padding-top:10px;margin-top:6px;font-size:18px}
.end{height:56px;background:var(--s);margin-top:56px}
`,
  body: (d) => `
<div class="hd">${logo(d)}<div class="emp">${d.empresa}</div></div>
<div class="band">
  <div class="tab"><span class="dot a"></span><span class="dot b"></span><h1>${d.titulo}</h1></div>
  <p><b>Cotización N.º:</b> ${d.numero}</p>
  <p><b>Fecha:</b> ${d.fecha}</p>
  ${d.cliente ? `<p><b>Para: ${d.cliente.nombre}</b>${d.cliente.nit ? ` · NIT ${d.cliente.nit}` : ''}</p>` : ''}
  <p class="pre" style="max-width:560px;line-height:1.4">${d.alcance}</p>
</div>
<div class="card"><table><thead><tr><th>Descripción</th><th class="v">Valor</th></tr></thead>
<tbody>${d.items.map((it) => `<tr><td>${it.titulo}${it.desc ? `<p class="pre">${it.desc}</p>` : ''}</td><td class="v">${it.valor}</td></tr>`).join('')}</tbody></table></div>
<div class="mid">
  <div>
    ${d.tiempo ? `<h3>Tiempo de entrega</h3><p class="pre">${d.tiempo}</p>` : ''}
    ${d.terminos.length ? `<h3 style="margin-top:16px">Términos y condiciones</h3><ul>${d.terminos.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}
    ${d.banco ? `<h3 style="margin-top:16px">Método de pago</h3><p>${d.banco}</p>` : ''}
  </div>
  <div><div class="sum"><b>Total</b><strong>${d.total}</strong></div></div>
</div>
<div class="bt">
  <div class="contact">${contactList(d)}</div>
  <div class="sig"><p style="margin-bottom:12px">Fecha: ${d.fecha}</p>${firma(d)}<div class="ln">${d.rep.nombre}</div></div>
</div>
<div class="end"></div>`,
};

// ── Lateral ──────────────────────────────────────────────────────────────────
const lateral: Layout = {
  css: `
.doc{display:grid;grid-template-columns:340px 1fr;min-height:1400px}
.side{background:var(--p);color:var(--onP);padding:56px 30px;display:flex;flex-direction:column;gap:30px}
.side .logo{max-width:170px;max-height:110px;object-fit:contain;align-self:flex-start}
.side .emp{font-weight:700;font-size:24px;line-height:1.15}
.lbl{font-weight:600;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--sOnP);margin-bottom:4px}
.side .num{font-weight:800;font-size:40px;line-height:1}
.side .sm{font-size:15px;opacity:.9}
.side hr{border:0;border-top:1px solid currentColor;opacity:.25}
.side .tot{font-weight:800;font-size:36px;line-height:1.1;color:var(--sOnP)}
.side .contact-list{margin-top:auto;font-size:13px;gap:12px;overflow-wrap:anywhere}
.main{padding:64px 56px 56px}
.main h1{font-weight:800;font-size:46px;line-height:1.1;color:var(--pDeep)}
.main .alc{font-size:17px;color:var(--muted);margin-top:12px}
.items{margin-top:40px;display:flex;flex-direction:column;gap:16px}
.it{display:grid;grid-template-columns:56px 1fr auto;gap:20px;align-items:start;padding:20px 22px;border:1px solid var(--line);border-radius:16px;border-left:5px solid var(--s)}
.it .bd{width:56px;height:56px;border-radius:14px;background:var(--pSofter);display:flex;align-items:center;justify-content:center}
.it .bd svg{width:30px;height:30px}
.it b{display:block;font-weight:600;font-size:17px;line-height:1.3}
.it p{font-size:14px;color:var(--muted);margin-top:6px}
.it .v{font-weight:700;font-size:19px;white-space:nowrap;color:var(--pDeep)}
.blocks{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:40px}
.blocks h3{font-weight:700;font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:var(--pDeep);margin-bottom:8px}
.blocks p,.blocks li{font-size:14px}
.blocks ul{padding-left:18px}
.sig{margin-top:50px;display:flex;flex-direction:column;align-items:flex-end;text-align:right}
.sig .ln{border-top:1.5px solid var(--ink);width:280px;padding-top:8px;margin-top:6px;font-weight:600}
`,
  body: (d) => `
<aside class="side">
  ${logo(d)}
  <div class="emp">${d.empresa}</div>
  <div><div class="lbl">Cotización</div><div class="num">${d.numero}</div><div class="sm">${d.fecha}</div></div>
  <hr>
  ${d.cliente ? `<div><div class="lbl">Para</div><div style="font-weight:600;font-size:17px">${d.cliente.nombre}</div>${d.cliente.nit ? `<div class="sm">NIT ${d.cliente.nit}</div>` : ''}</div><hr>` : ''}
  <div><div class="lbl">Total</div><div class="tot" data-fit data-min="20">${d.total}</div><div class="sm">COP</div></div>
  ${contactList(d)}
</aside>
<main class="main">
  <h1>${d.titulo}</h1>
  ${d.alcance ? `<p class="alc pre">${d.alcance}</p>` : ''}
  <div class="items">${d.items.map((it) => `<div class="it"><div class="bd">${buildIconSvg(it.iconKey, d.t.pDeep, 2)}</div><div><b>${it.titulo}</b>${it.desc ? `<p class="pre">${it.desc}</p>` : ''}</div><div class="v">${it.valor}</div></div>`).join('')}</div>
  <div class="blocks">
    <div>${d.tiempo ? `<h3>Tiempo de entrega</h3><p class="pre">${d.tiempo}</p>` : ''}${d.banco ? `<h3 style="margin-top:18px">Pago</h3><p>${d.banco}</p>` : ''}</div>
    <div>${d.terminos.length ? `<h3>Términos y condiciones</h3><ul>${d.terminos.map((x) => `<li>${x}</li>`).join('')}</ul>` : ''}</div>
  </div>
  <div class="sig">${firma(d)}<div class="ln">${d.rep.nombre}${d.rep.cedula ? `<div class="muted" style="font-weight:400;font-size:13px">CC ${d.rep.cedula}</div>` : ''}</div></div>
</main>`,
};

const LAYOUTS: Record<Exclude<DisenoId, 'clasica'>, Layout> = { bloque, noche, diagonal, estudio, editorial, redonda, lateral };

/** CSS y body del documento para los diseños nuevos (la clásica la arma doc.ts). */
export function renderLayout(c: Cotizacion): { css: string; body: string } {
  const id = disenoDe(c);
  const L = LAYOUTS[id as Exclude<DisenoId, 'clasica'>] ?? LAYOUTS.bloque;
  const d = data(c);
  const scope = (css: string) => css.replace(/(^|\})\s*([^{}@]+)\{/g, (_m, br, sel) =>
    `${br}\n${sel.split(',').map((s: string) => `.L-${id} ${s.trim().replace(/^\.doc\b/, '')}`.replace(/ $/, '')).join(',')}{`);
  return {
    css: BASE_CSS + scope(L.css),
    body: `<div class="doc L-${id}" style="${themeVars(d.t)}">${L.body(d)}</div>`,
  };
}
