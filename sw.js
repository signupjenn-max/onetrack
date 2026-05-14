// Onetrack Service Worker — offline cache
// Deploy alongside onetrack-dashboard.html on GitHub Pages

const CACHE_NAME = 'onetrack-v1';
const CACHED_URLS = [
  './',
  './onetrack-dashboard.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/zxing-js/0.20.0/umd/index.min.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache the app shell; network-only CDN assets are best-effort
      return cache.addAll(['./', './onetrack-dashboard.html']).then(function() {
        // Try to cache CDN assets — ignore failures
        return Promise.allSettled(
          CACHED_URLS.slice(2).map(function(url) { return cache.add(url); })
        );
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  // Navigation: serve the app shell, fall back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match('./onetrack-dashboard.html');
      })
    );
    return;
  }
  // Everything else: cache-first, then network
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        // Cache successful GET responses
        if (response && response.status === 200 && event.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      });
    })
  );
});
