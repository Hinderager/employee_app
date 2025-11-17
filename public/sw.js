// Service Worker - Network-first strategy for fresh content
const CACHE_NAME = 'top-shelf-v1';

// Install event - activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting(); // Force immediate activation
});

// Activate event - take control immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    clients.claim() // Take control of all pages immediately
  );
});

// Fetch event - Network-first for all requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always try network first for same-origin requests
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request).then((cachedResponse) => {
            // If cache also fails, return a proper error Response
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return a valid error Response instead of undefined
            return new Response('Network error and no cache available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
  }
});
