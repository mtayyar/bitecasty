// Service Worker for BiteCasty PWA

const CACHE_NAME = 'bitecasty-cache-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.svg',
  '/manifest.json',
  '/icons/icon-512x512.svg'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell and content...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients for version', CACHE_NAME);
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip Supabase API requests (don't cache them)
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  
  // Skip audio file requests to ensure they work in the background
  if (event.request.url.includes('.mp3') || 
      event.request.url.includes('.wav') || 
      event.request.url.includes('.ogg') ||
      event.request.url.includes('audio/')) {
    return;
  }
  
  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }
  
  // For all other requests, use a stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Use cached response if available
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Update the cache with the new response
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            // If the network is unavailable, we already returned the cached response
          });
        
        return cachedResponse || fetchPromise;
      })
  );
});

// Add a message event listener to keep the service worker alive
self.addEventListener('message', (event) => {
  if (event.data === 'keepalive') {
    console.log('[Service Worker] Received keepalive message');
  }
}); 