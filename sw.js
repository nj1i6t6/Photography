// sw.js
const CACHE_NAME = 'ai-image-translator-cache-v2'; // Cache version updated to trigger update
const urlsToCache = [
  './', // Caches the root HTML file (index.html)
  './index.html', // Explicitly cache index.html
  './manifest.json', // Cache the manifest file
  './112992.jpg', // Cache the app icon
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js', // Cache external library
  // Add any other CSS or JS files if they are external or important for offline functionality
  // e.g., './style.css', './main.js' if you had them
];

self.addEventListener('install', event => {
  console.log('Service Worker: Installing and caching assets...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Force the new service worker to activate immediately
      .catch(error => {
        console.error('Service Worker: Failed to cache during install:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activating and cleaning old caches...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of clients immediately
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests for caching
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Cache hit - return response
          if (response) {
            return response;
          }
          // Not in cache - fetch from network
          return fetch(event.request).then(
            networkResponse => {
              // Check if we received a valid response
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                return networkResponse;
              }

              // IMPORTANT: Clone the response. A response is a stream
              // and can only be consumed once. We must clone it so that
              // we can serve it to the browser and put a copy in the cache.
              const responseToCache = networkResponse.clone();

              // Dynamically cache new requests if needed, but only for assets that are safe to cache.
              // For a simple PWA, caching during install is often sufficient for core assets.
              // If you want to cache images/dynamic content on first fetch:
              /*
              if (event.request.url.startsWith(self.location.origin) && event.request.destination === 'image') {
                  caches.open(CACHE_NAME).then(cache => {
                      cache.put(event.request, responseToCache);
                  });
              }
              */
              return networkResponse;
            }
          ).catch(error => {
            console.error('Service Worker: Fetch failed:', event.request.url, error);
            // You can return a fallback response here for offline situations
            // For example, if it's an image request, return a placeholder image.
            // if (event.request.destination === 'image') {
            //   return caches.match('./placeholder-image.png');
            // }
            // return new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
            throw error; // Rethrow to let browser handle network error if no fallback
          });
        })
    );
  } else {
    // For non-GET requests (e.g., POST to API), always go to network
    return fetch(event.request);
  }
});
