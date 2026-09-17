// V-VISA B2B Conservative Service Worker
// Strictly caches only static shell assets (images, icons, fonts, static JS/CSS).
// NEVER caches API requests, authenticated data, wallet, or application records.

const CACHE_NAME = 'vvisa-b2b-static-v1';
const STATIC_ASSETS = [
  '/icon.png',
  '/logo-vvisa-mark.png',
  '/logo-vvisa.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Non-fatal if some static assets are missing during build
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept or cache non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Never intercept or cache any API routes
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Never cache Next.js data or server action requests
  if (url.pathname.startsWith('/_next/data/') || request.headers.get('x-nextjs-data')) {
    return;
  }

  // 4. Cache-first ONLY for static immutable assets (_next/static, public icons)
  const isImmutableStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2');

  if (isImmutableStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // 5. For standard navigation/HTML requests: strictly Network-First
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});
