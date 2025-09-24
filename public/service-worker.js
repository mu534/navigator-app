self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('nav-app-shell-v1').then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
      ])
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Cache-first for OSM tiles and app shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  const isTile = /tile\.openstreetmap\.org|tile\.openstreetmap\.fr/.test(url.host);
  const isShell = url.origin === self.location.origin;

  if (isTile || isShell) {
    event.respondWith(
      caches.open('nav-cache-v1').then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok && request.method === 'GET') {
            cache.put(request, response.clone());
          }
          return response;
        } catch (e) {
          return cached || Response.error();
        }
      })
    );
  }
});


