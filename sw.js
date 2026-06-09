// Simple service worker for InkSpace (demo)
const CACHE_NAME = 'inkspace-v1';
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/app.js',
    '/styles.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Cache-first for same-origin requests, fallback to network
    const url = new URL(event.request.url);
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
                // Optionally cache new requests
                return resp;
            })).catch(() => caches.match('/index.html'))
        );
    } else {
        // For cross-origin, just try network
        event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503, statusText: 'Service Unavailable' })));
    }
});

