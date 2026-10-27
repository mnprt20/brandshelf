// Hand-written Service Worker for MintShelf (NO Workbox)
const CACHE_NAME = 'mintshelf-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // NEVER cache non-GET requests (e.g. POST /api/orders, auth, AI)
  if (req.method !== 'GET') {
    return;
  }

  // NEVER cache API requests or order endpoints
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Cache-first for images (product photos, icons, assets)
  if (
    req.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)$/i) ||
    url.hostname.includes('firebasestorage')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        }).catch(() => {
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // Network-first navigation with cache fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Stale-while-revalidate for static assets (js, css, fonts)
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
