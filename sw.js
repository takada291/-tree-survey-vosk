const CACHE_NAME = 'tree-survey-v3.0.0-fix'; // バージョン名を変えてキャッシュを強制更新
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.9/dist/vosk.js',
  './model/model.tar.gz' 
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // すぐに新しい設定を適用
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
