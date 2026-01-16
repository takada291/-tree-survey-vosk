const CACHE_NAME = 'tree-survey-v3.0.0';
const urlsToCache = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.9/dist/vosk.js',
  'model/model.tar.gz' // ← これが最も重要
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
