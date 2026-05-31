/* ══════════════════════════════════════════════════
   NEXWAVE CORE — Service Worker v1.0
   ══════════════════════════════════════════════════ */

const CACHE_NAME = 'nexwave-core-v1';

const PRECACHE_URLS = [
    '/shared/css/erp.css',
    '/shared/css/public.css',
    '/shared/js/erp.js',
    '/shared/js/public.js',
    '/manifest.json',
    '/favicon.ico',
    '/favicon.png',
    '/logo.png'
];

/* ── Install: Precache static assets ── */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        }).then(() => self.skipWaiting())
    );
});

/* ── Activate: Clean old caches ── */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(
                names.filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

/* ── Fetch: Network-first for HTML, cache-first for assets ── */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== self.location.origin) return;

    const isHtml = request.mode === 'navigate' ||
        (request.headers.get('accept') || '').includes('text/html');

    if (isHtml) {
        // Network-first for HTML pages
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match('/pages/index.html')))
        );
    } else {
        // Cache-first for static assets (CSS, JS, images, fonts)
        event.respondWith(
            caches.match(request).then((cached) => {
                const fetchPromise = fetch(request).then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        );
    }
});
