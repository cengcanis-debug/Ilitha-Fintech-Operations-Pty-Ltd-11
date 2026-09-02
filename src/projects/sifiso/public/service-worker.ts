// File: src/projects/sifiso/public/service-worker.ts

const CACHE_NAME = 'sifiso-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/logo192.png',
  '/logo512.png',
  '/static/js/main.js',
  '/static/css/main.css'
];

// 1. Install Event: Cache all core UI assets
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 [SIFISO SERVICE WORKER]: Pre-caching core educational assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  (self as any).skipWaiting();
});

// 2. Activate Event: Clean up legacy caches
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ [SIFISO SERVICE WORKER]: Clearing outdated asset cache...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  (self as any).clients.claim();
});

// 3. Fetch Event: Serve assets offline-first, falling back to network if available
self.addEventListener('fetch', (event: any) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Return cached asset instantly (no data costs)
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache newly fetched educational content dynamically
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback: If offline and resource is missing, return simple offline template
        return caches.match('/index.html') as Promise<Response>;
      });
    })
  );
});
