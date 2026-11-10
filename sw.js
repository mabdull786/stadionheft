// Service Worker: App offline verfügbar, Updates kommen sofort an
const CACHE = 'stadionheft-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const putInCache = (req, res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; };

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;
  // App-Seite und Spieldaten: zuerst Netz (immer aktuell), offline der letzte Stand
  if (e.request.mode === 'navigate' || url.hostname === 'api.openligadb.de' || (sameOrigin && /\.(html|js|webmanifest)$/.test(url.pathname))) {
    e.respondWith(fetch(e.request).then((res) => putInCache(e.request, res)).catch(() => caches.match(e.request)));
    return;
  }
  // Kartenkacheln nicht speichern (würde den Speicher füllen)
  if (url.hostname.endsWith('cartocdn.com')) return;
  // Logos, Icons, Bibliotheken: zuerst Cache
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => (res.ok || res.type === 'opaque') ? putInCache(e.request, res) : res)));
});
