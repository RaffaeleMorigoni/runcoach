// Service Worker — RunCoach AI
// Bump CACHE quando cambi la logica del SW o degli asset precachati
const CACHE = 'runcoach-v1777216974013-20260423';
const ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Strategia:
// - HTML/JSX/JS: network-first (così il codice si aggiorna subito, fallback su cache se offline)
// - altri asset (immagini, manifest, font): cache-first
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isCode = /\.(html|jsx|js|mjs)$/i.test(url.pathname) || url.pathname.endsWith('/');

  if (isCode) {
    e.respondWith(
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return resp;
        })
      )
    );
  }
});
