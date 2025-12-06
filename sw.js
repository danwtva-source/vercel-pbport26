// sw.js
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Basic pass-through (no offline capability yet, but satisfies PWA reqs)
  e.respondWith(fetch(e.request));
});
