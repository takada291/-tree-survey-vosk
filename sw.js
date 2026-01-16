const CACHE_NAME = 'offline-survey-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.9/dist/vosk.js',
    './model/model.tar.gz'  // これが超重要です！
];

// インストール時にファイルを保存
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('ファイルをキャッシュしています...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// リクエストがあったら保存したファイルを返す
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});