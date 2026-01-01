const CACHE_NAME = 'aim-schedule-v4.9';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './icon.svg'
];

self.addEventListener('install', (e) => {
    self.skipWaiting(); // Force activation
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim(); // Take control immediately
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
