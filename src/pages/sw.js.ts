// Service worker del modo sin conexión. Se genera en cada build con una versión distinta:
// así el navegador detecta que cambió, instala la versión nueva y la deja en espera hasta
// que la persona toca "Actualizar" (ver initActualizaciones en editor.ts).
import type { APIRoute } from 'astro';

const VERSION = __BUILD__.id;

const SW = `// Cotizador · versión ${VERSION}
const CACHE = 'cotizador-${VERSION}';
const SHELL = ['/', '/logo.svg', '/favicon.svg', '/manifest.json'];

self.addEventListener('install', (ev) => {
  // cache: 'reload' evita guardar una copia vieja que tenga el navegador
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
  // La primera vez se activa sola; las siguientes esperan el mensaje "activar"
});

self.addEventListener('message', (ev) => { if (ev.data === 'activar') self.skipWaiting(); });

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cotizador-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const guardar = (req, res) => {
  if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
};

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Páginas: primero la red (para ver cambios) y la caché si no hay conexión
  if (req.mode === 'navigate') {
    const key = url.pathname === '/' ? '/' : url.pathname;
    ev.respondWith(fetch(req)
      .then((res) => guardar(key, res))
      .catch(() => caches.match(key).then((hit) => hit || caches.match('/'))));
    return;
  }
  if (url.pathname.endsWith('.mp4')) return; // el video va directo a la red
  // Archivos con hash (/_astro/…): nunca cambian, caché primero
  if (url.pathname.startsWith('/_astro/')) {
    ev.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => guardar(req, res))));
    return;
  }
  // Lo demás (logo, íconos, manifest): la copia guardada al instante y se renueva por detrás
  ev.respondWith(caches.match(req).then((hit) => {
    const red = fetch(req).then((res) => guardar(req, res)).catch(() => hit);
    return hit || red;
  }));
});
`;

export const GET: APIRoute = () => new Response(SW, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
