const CACHE_NAME = 'apartment-maintenance-v2';
const APP_SHELL = [
  './',
  './index.html',
  './new-apartment.html',
  './apartment-maintenance-report.html',
  './agreements.html',
  './assets.html',
  './bylaws.html',
  './contacts.html',
  './directory.html',
  './important-info.html',
  './pending-tasks.html',
  './presidents.html',
  './common.css',
  './common.js',
  './apt.js',
  './config.js',
  './manifest.webmanifest',
  './pwa.js',
  './icons/app-icon.svg',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(name => name.startsWith('apartment-maintenance-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            return caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy))
              .then(() => response);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          return cached || caches.match('./index.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          return caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy))
            .then(() => response);
        }
        return response;
      });
    })
  );
});
