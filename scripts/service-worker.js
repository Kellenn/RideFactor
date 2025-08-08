const CACHE_NAME = "ridefactor-cache";
const ASSETS_TO_CACHE = [
    "/RideFactor/index.html",
    "/RideFactor/styles/index.css",
    "/RideFactor/scripts/arc.js",
    "/RideFactor/scripts/index.js",
    "/RideFactor/scripts/scoring.js",
    "/RideFactor/scripts/weather.js",
    "/RideFactor/favicon.ico",
    "/RideFactor/assets/icon-192x192.png",
    "/RideFactor/assets/icon-512x512.png",
];

// Install: cache assets
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

// Activate: cleanup old caches
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
});

// Fetch: serve from cache, fallback to network
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});
