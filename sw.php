<?php
// Service worker for the whole site (scope BASE_URL/).
//
// Served from the site root so its default scope covers every page. It is the
// only service worker of the site: plugins must not register their own (see
// plugins/README.html → "Service worker").
//
// Caching rules (see the fetch handler below):
//   • HTML navigations  → network only; offline fallback page when the network fails.
//                         Pages are never cached: they carry the session and CSRF token.
//   • /auth, /admin, /api, /papi, non-GET → not handled at all (browser default).
//   • Same-origin static assets (/css, /js, /assets, /themes, /design-system, /plugins/{id}/…):
//       – versioned (?v=…) or images/fonts → stale-while-revalidate
//       – unversioned .js/.css            → network first, cache as fallback
//         (avoids running stale plugin JS against freshly rendered HTML)
//   • Pinned-version CDN files (jsDelivr npm/gh @x.y.z, cdnjs /x.y.z/) → cache first.
//
// CACHE_VERSION is a hash of the files the precache depends on, so a deploy that
// changes them installs a new worker and drops the old caches.
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/design-system/php/ui.php';
require_once __DIR__ . '/includes/offline-assets.php';

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Content-Type-Options: nosniff');

$_swVersionFiles = array_merge([
    __FILE__,
    __DIR__ . '/offline.php',
    __DIR__ . '/assets/favicon/web-app-manifest-192x192.png',
], array_map(function ($f) { return dsDir() . '/' . $f; }, offlineStylesheets()));
$_swHash = '';
foreach ($_swVersionFiles as $_swFile) {
    $_swHash .= is_file($_swFile) ? md5_file($_swFile) : '-';
}
$_swVersion = substr(md5($_swHash), 0, 12);

$_swConfig = [
    'version'  => $_swVersion,
    'base'     => BASE_URL,
    'offline'  => BASE_URL . '/offline',
    'precache' => array_merge([
        BASE_URL . '/offline',
        BASE_URL . '/assets/favicon/web-app-manifest-192x192.png',
    ], array_map('dsUrl', offlineStylesheets())),
];
?>
'use strict';

const CONFIG = <?= json_encode($_swConfig, JSON_UNESCAPED_SLASHES) ?>;

const PRECACHE = 'ac-precache-' + CONFIG.version;
const RUNTIME  = 'ac-runtime-' + CONFIG.version;
const CDN      = 'ac-cdn-v1'; // pinned-version URLs never change content: kept across deploys
const KEEP     = [PRECACHE, RUNTIME, CDN];
const RUNTIME_MAX_ENTRIES = 200;
const CDN_MAX_ENTRIES     = 60;

// Paths below BASE_URL that the worker never touches.
const BYPASS_RE = /^\/(?:auth|admin|api|papi)(?:\/|$)/;
// Same-origin static asset locations and file types.
const STATIC_DIR_RE = /^\/(?:css|js|assets|themes|design-system|plugins\/[a-z0-9_-]+)\//;
const STATIC_EXT_RE = /\.(?:css|js|mjs|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf)$/i;
const CODE_EXT_RE   = /\.(?:css|js|mjs)$/i;
// CDN URLs with an exact x.y.z version in the path.
const CDN_PINNED_RE = new RegExp(
    '^https://cdn\\.jsdelivr\\.net/(?:npm/(?:@[^/]+/)?[^/@]+|gh/[^/]+/[^/@]+)@v?\\d+\\.\\d+\\.\\d+[^/]*/' +
    '|^https://cdnjs\\.cloudflare\\.com/ajax/libs/[^/]+/\\d+\\.\\d+\\.\\d+[^/]*/'
);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(PRECACHE)
            .then((cache) => cache.addAll(CONFIG.precache.map((url) => new Request(url, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key.indexOf('ac-') === 0 && KEEP.indexOf(key) === -1)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    if (url.origin !== self.location.origin) {
        if (CDN_PINNED_RE.test(req.url)) event.respondWith(cacheFirst(req));
        return;
    }

    if (url.pathname.indexOf(CONFIG.base + '/') !== 0) return;
    const path = url.pathname.slice(CONFIG.base.length);
    if (BYPASS_RE.test(path)) return;

    if (req.mode === 'navigate') {
        event.respondWith(networkOrOffline(req));
        return;
    }

    if (path === '/assets/favicon/manifest.php') {
        event.respondWith(networkFirst(req));
        return;
    }

    if (STATIC_DIR_RE.test(path) && STATIC_EXT_RE.test(path)) {
        const versioned = url.searchParams.has('v');
        if (!versioned && CODE_EXT_RE.test(path)) {
            event.respondWith(networkFirst(req));
        } else {
            event.respondWith(staleWhileRevalidate(event));
        }
    }
});

// Pages: always from the network; the precached offline page when that fails.
async function networkOrOffline(req) {
    try {
        return await fetch(req);
    } catch (err) {
        const cache = await caches.open(PRECACHE);
        const offline = await cache.match(CONFIG.offline);
        return offline || Response.error();
    }
}

async function networkFirst(req) {
    const cache = await caches.open(RUNTIME);
    try {
        const res = await fetch(req);
        if (res.status === 200 && res.type === 'basic') {
            await cache.put(req, res.clone());
            trimCache(RUNTIME, RUNTIME_MAX_ENTRIES);
        }
        return res;
    } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        throw err;
    }
}

async function staleWhileRevalidate(event) {
    const req = event.request;
    const cached = await caches.match(req);
    const update = fetch(req).then(async (res) => {
        if (res.status === 200 && res.type === 'basic') {
            const cache = await caches.open(RUNTIME);
            await cache.put(req, res.clone());
            trimCache(RUNTIME, RUNTIME_MAX_ENTRIES);
        }
        return res;
    });
    if (cached) {
        event.waitUntil(update.catch(() => {}));
        return cached;
    }
    return update;
}

// CDN files are refetched in CORS mode (jsDelivr and cdnjs allow it) so the
// status is readable and error responses are never cached.
async function cacheFirst(req) {
    const cache = await caches.open(CDN);
    const cached = await cache.match(req.url);
    if (cached) return cached;
    let res;
    try {
        res = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
    } catch (err) {
        return fetch(req);
    }
    if (res.status === 200) {
        await cache.put(req.url, res.clone());
        trimCache(CDN, CDN_MAX_ENTRIES);
    }
    return res;
}

// Drop the oldest entries (keys() is in insertion order) above the limit.
async function trimCache(name, max) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - max; i++) {
        await cache.delete(keys[i]);
    }
}
