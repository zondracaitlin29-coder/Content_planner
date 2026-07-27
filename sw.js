const CACHE_NAME = 'contenthub-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install event - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Cache addAll error:', err);
          return Promise.resolve();
        });
      })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches (this is what forces old cached
// versions of the app to be discarded whenever CACHE_NAME changes above)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first for the HTML so you always get the latest
// version when online, falling back to cache only when offline.
self.addEventListener('fetch', event => {
  const isHTML = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Other assets: cache-first, fall back to network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        });
      })
      .catch(() => {
        return new Response('Offline - ContentHub data is stored locally', {
          status: 200,
          statusText: 'OK',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});
