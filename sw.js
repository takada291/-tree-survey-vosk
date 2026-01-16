// キャッシュ名を変更して、強制的に更新させます
const CACHE_NAME = 'tree-survey-v3.1-local'; 

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './vosk.js',    // ← これを追加
  './vosk.wasm',  // ← これも追加
  './model/model.tar.gz'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('すべてのファイルをキャッシュ中...');
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
