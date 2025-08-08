const CACHE_NAME = "ridefactor-cache";
const ASSETS_TO_CACHE = [
    "index.html",
    "styles/index.css",
    "scripts/arc.js",
    "scripts/index.js",
    "scripts/scoring.js",
    "scripts/weather.js",
    "favicon.ico",
    "assets/icon-192x192.png",
    "assets/icon-512x512.png",
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
