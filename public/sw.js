// Modo sin conexión: la app y sus archivos quedan en caché después de la primera visita.
const CACHE = 'cotizador-v1';
const SHELL = ['/', '/logo.svg', '/favicon.svg', '/manifest.json'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Páginas: primero la red (para ver cambios), y la caché si no hay conexión
  if (req.mode === 'navigate') {
    ev.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); return res; }).catch(() => caches.match('/')));
    return;
  }
  // Archivos con hash (/_astro/…), fuentes, imágenes y video: caché primero
  ev.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && !url.pathname.endsWith('.mp4')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
