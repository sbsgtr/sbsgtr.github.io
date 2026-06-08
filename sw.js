/* ══════════════════════════════════════════════════
   NEXWAVE CORE — Service Worker v2.0
   ══════════════════════════════════════════════════
   Strategies:
     - Precache: CSS, JS, shared assets on install
     - Network-first: HTML pages (falls back to cache, then offline page)
     - Cache-first: Static assets (CSS, JS, images, fonts)
     - Network-only: API calls, Supabase requests
   ══════════════════════════════════════════════════ */

const CACHE_NAME = 'nexwave-core-v3';
const OFFLINE_PAGE = '/offline.html';

const PRECACHE_URLS = [
    '/shared/css/erp.css',
    '/shared/css/public.css',
    '/shared/js/erp.js',
    '/shared/js/public.js',
    '/manifest.json',
    '/offline.html',
    '/favicon.ico',
    '/favicon.png',
    '/logo.png',
    '/icons/icon-96.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-192-maskable.png',
    '/icons/icon-512-maskable.png'
];

/* ── Install: Precache static assets ── */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // Add all precache URLs, silently skipping ones that fail
                return Promise.allSettled(
                    PRECACHE_URLS.map((url) =>
                        cache.add(url).catch(() => {
                            console.warn('[SW] Failed to precache:', url);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

/* ── Activate: Clean old caches and take control ── */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(
                names
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            // Tell all clients to check for SW updates
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'SW_UPDATED', cache: CACHE_NAME });
                });
            });
        }).then(() => self.clients.claim())
    );
});

/* ── Helper: is this a navigation request for HTML? ── */
function isNavigateRequest(request) {
    return request.mode === 'navigate' ||
        (request.headers.get('accept') || '').includes('text/html');
}

/* ── Helper: is this a Supabase API call? ── */
function isApiRequest(url) {
    return url.hostname.includes('supabase.co') ||
        url.pathname.startsWith('/supabase/') ||
        url.pathname.startsWith('/functions/');
}

/* ── Helper: is this a static asset? ── */
function isStaticAsset(url) {
    const ext = url.pathname.split('.').pop().toLowerCase();
    return ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp',
            'woff', 'woff2', 'ttf', 'eot', 'json', 'pdf'].includes(ext) ||
        url.pathname.startsWith('/fontawesome-free-');
}

/* ── Fetch: intelligent caching strategy ── */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== self.location.origin) return;

    // 1. API calls — network only, no caching (fresh data always)
    if (isApiRequest(url)) return;

    // 2. HTML pages — network-first with offline fallback
    if (isNavigateRequest(request)) {
        event.respondWith(networkFirstWithOffline(request));
        return;
    }

    // 3. Static assets — cache-first with network update
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirstWithUpdate(request));
        return;
    }

    // 4. Everything else — network-first
    event.respondWith(networkFirst(request));
});

/* ── Network-first strategy (for HTML pages) ── */
async function networkFirstWithOffline(request) {
    try {
        const response = await fetch(request);
        // Cache the fresh HTML for offline use
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
    } catch (err) {
        // Offline — try cache, then offline fallback
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match(OFFLINE_PAGE);
    }
}

/* ── Cache-first strategy (for static assets) ── */
async function cacheFirstWithUpdate(request) {
    const cached = await caches.match(request);
    // Return cached immediately, then update in background
    const fetchPromise = fetch(request)
        .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
        })
        .catch(() => cached);
    return cached || fetchPromise;
}

/* ── Basic network-first (no offline fallback) ── */
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        return cached || new Response('', { status: 408 });
    }
}

/* ── Listen for messages from client pages ── */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            caches.open(CACHE_NAME);
            event.ports?.[0]?.postMessage({ type: 'CACHE_CLEARED' });
        });
    }
});
