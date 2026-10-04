/* Zapret Discord — service worker: офлайн-кэш.
   При обновлении сайта поднимите версию в имени кэша (tgws-v3, tgws-v4…). */

const CACHE = 'tgws-v5';
const ASSETS = [
  './',
  './index.html',
  './en/',
  './en/index.html',
  './styles.css',
  './app.js',
  './favicon.svg',
  './favicon-32.png',
  './apple-touch-icon.png',
  './og-image.png',
  './manifest.webmanifest',
  './support.html',
  './terms.html',
  './404.html',
  './blog/',
  './blog/index.html',
  './blog/ws-transport.html',
  './blog/ping-i-dzhitter.html',
  './blog/keep-alive.html',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => {
          if (e.request.mode === 'navigate') {
            return caches.match(new URL('404.html', self.registration.scope).href);
          }
        });
    })
  );
});
