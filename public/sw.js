const CACHE_NAME = 'epistle-pwa-v1';

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients so the service worker controls all open pages immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A minimal fetch listener is required by Chrome to trigger the PWA install prompt.
  // For now, we just pass the requests through to the network without caching.
  // We only handle GET requests to avoid issues with POST/mutations.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => {
      // If network fails, we could return a custom offline page here in the future
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});
