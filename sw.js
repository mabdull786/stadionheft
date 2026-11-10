// Service Worker: App offline verfügbar, Updates kommen sofort an.
// Konto-Daten (Supabase) werden bewusst NICHT zwischengespeichert.
const CACHE = 'stadionheft-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const STATIC_HOSTS = ['cdn.jsdelivr.net', 'upload.wikimedia.org', 'i.imgur.com', 'assets.dfb.de', 'fonts.googleapis.com', 'fonts.gstatic.com'];

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
  if (e.request.mode === 'navigate' || url.hostname === 'api.openligadb.de' || (sameOrigin && !url.pathname.includes('/icons/'))) {
    e.respondWith(fetch(e.request).then((res) => (res.ok ? putInCache(e.request, res) : res)).catch(() => caches.match(e.request)));
    return;
  }
  // Icons, Logos, Bibliotheken, Schriften: zuerst Cache
  if ((sameOrigin && url.pathname.includes('/icons/')) || STATIC_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => (res.ok || res.type === 'opaque') ? putInCache(e.request, res) : res)));
  }
  // Alles andere (Supabase, Kartenkacheln …) geht direkt ins Netz
});
