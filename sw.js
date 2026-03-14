/* sw.js — ReKPiTu PWA offline
   - Precarga app shell + idiomas
   - Navegación offline con fallback a index.html
   - Caché stale-while-revalidate para recursos estáticos
   - Precarga y fija en caché el runtime remoto de Whisper/Transformers
   - Limpieza automática de versiones antiguas
*/

'use strict';

const SW_VERSION = '2026-03-14-v2.3';
const STATIC_CACHE = `rekpitu-static-${SW_VERSION}`;
const RUNTIME_CACHE = `rekpitu-runtime-${SW_VERSION}`;
const REMOTE_CACHE = `rekpitu-remote-${SW_VERSION}`;
const MODEL_CACHE = 'rekpitu-whisper-model-v1';
const WHISPER_RUNTIME_CACHE = 'rekpitu-whisper-runtime-v3';
const LEGACY_MODEL_CACHES = ['transformers-cache', 'transformers-cache-v1'];
const LEGACY_RUNTIME_CACHES = ['rekpitu-whisper-runtime-v1', 'rekpitu-whisper-runtime-v2'];

const TRANSFORMERS_VERSION = '3.8.1';
const TRANSFORMERS_DIST_URL = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${TRANSFORMERS_VERSION}/dist/`;
const WHISPER_RUNTIME_URLS = [
  TRANSFORMERS_DIST_URL + 'transformers.web.min.js',
  TRANSFORMERS_DIST_URL + 'ort-wasm-simd-threaded.jsep.mjs',
  TRANSFORMERS_DIST_URL + 'ort-wasm-simd-threaded.jsep.wasm'
];

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css',
  './i18n.js',
  './app.js',
  './export.js',
  './transcription.js',

  './assets/img/logo.png',
  './assets/img/recapitula180.png',
  './assets/img/recapitula192.png',
  './assets/img/recapitula512.png',

  './lang/es.json',
  './lang/pt-br.json',
  './lang/en.json',
  './lang/de.json',
  './lang/it.json',
  './lang/fr.json',
  './lang/ko.json',
  './lang/ja.json',
  './lang/zh.json',
  './lang/ru.json'
];

const OFFLINE_DOCUMENT_CANDIDATES = [
  './index.html',
  './'
];

const PRECACHE_PATHS = new Set(
  PRECACHE_URLS
    .map((url) => new URL(url, self.location.href))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.pathname)
);

function isHttpRequest(url) {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

function isPinnedWhisperRuntimeUrl(url) {
  const href = typeof url === 'string' ? url : url.href;
  return WHISPER_RUNTIME_URLS.includes(href);
}

function isStaticLikeRequest(request) {
  const url = new URL(request.url);

  if (request.method !== 'GET') return false;
  if (!isHttpRequest(url) || !isSameOrigin(url)) return false;
  if (isNavigationRequest(request)) return false;

  if (
    [
      'script',
      'style',
      'image',
      'font',
      'manifest',
      'worker',
      'audio',
      'video'
    ].includes(request.destination)
  ) {
    return true;
  }

  return /\.(?:json|js|css|png|jpe?g|svg|webp|gif|ico|woff2?|ttf|otf|webmanifest)$/i.test(url.pathname);
}

function isRemoteStaticRequest(request) {
  const url = new URL(request.url);

  if (request.method !== 'GET') return false;
  if (!isHttpRequest(url) || isSameOrigin(url)) return false;
  if (isNavigationRequest(request)) return false;

  return (
    url.origin === 'https://cdn.jsdelivr.net' &&
    url.pathname.startsWith('/npm/')
  );
}

function cacheBucketFor(requestUrl) {
  const url = new URL(requestUrl);
  if (!isSameOrigin(url)) {
    return isPinnedWhisperRuntimeUrl(url) ? WHISPER_RUNTIME_CACHE : REMOTE_CACHE;
  }
  return PRECACHE_PATHS.has(url.pathname) ? STATIC_CACHE : RUNTIME_CACHE;
}

async function safeCachePut(cacheName, requestOrUrl, response) {
  if (!response) return;
  if (!(response.ok || response.type === 'opaque')) return;
  const cache = await caches.open(cacheName);
  await cache.put(requestOrUrl, response.clone());
}

async function precacheAppShell() {
  const cache = await caches.open(STATIC_CACHE);

  await Promise.allSettled(
    PRECACHE_URLS.map(async (url) => {
      try {
        const request = new Request(url, { cache: 'reload' });
        const response = await fetch(request);

        if (!response || !response.ok) {
          throw new Error(`HTTP ${response ? response.status : 'NO_RESPONSE'}`);
        }

        await cache.put(url, response.clone());
      } catch (error) {
        console.warn('[SW] No se pudo precachear:', url, error);
      }
    })
  );
}

async function precacheWhisperRuntime() {
  const cache = await caches.open(WHISPER_RUNTIME_CACHE);

  await Promise.allSettled(
    WHISPER_RUNTIME_URLS.map(async (url) => {
      try {
        const request = new Request(url, { cache: 'reload', mode: 'cors' });
        const response = await fetch(request);

        if (!response || !(response.ok || response.type === 'opaque')) {
          throw new Error(`HTTP ${response ? response.status : 'NO_RESPONSE'}`);
        }

        await cache.put(url, response.clone());
      } catch (error) {
        console.warn('[SW] No se pudo fijar el runtime de Whisper:', url, error);
      }
    })
  );
}

async function cleanupOldCaches() {
  const valid = new Set([
    STATIC_CACHE,
    RUNTIME_CACHE,
    REMOTE_CACHE,
    MODEL_CACHE,
    WHISPER_RUNTIME_CACHE,
    ...LEGACY_MODEL_CACHES
  ]);
  const names = await caches.keys();

  await Promise.all(
    names.map(async (name) => {
      if (valid.has(name)) return;
      try {
        await caches.delete(name);
      } catch {
        /* ignore */
      }
    })
  );

  await Promise.all(
    LEGACY_RUNTIME_CACHES.map(async (name) => {
      try { await caches.delete(name); } catch { /* ignore */ }
    })
  );
}

async function matchOfflineDocument(request) {
  const direct = await caches.match(request, { ignoreSearch: true });
  if (direct) return direct;

  for (const candidate of OFFLINE_DOCUMENT_CANDIDATES) {
    const cached = await caches.match(candidate, { ignoreSearch: true });
    if (cached) return cached;
  }

  return new Response('Offline', {
    status: 503,
    statusText: 'Offline',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

async function handleNavigation(event) {
  try {
    if (self.registration.navigationPreload) {
      const preload = await event.preloadResponse;
      if (preload) {
        event.waitUntil(
          safeCachePut(RUNTIME_CACHE, event.request, preload.clone()).catch(() => {})
        );
        return preload;
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const networkResponse = await fetch(event.request);

    event.waitUntil(
      safeCachePut(RUNTIME_CACHE, event.request, networkResponse.clone()).catch(() => {})
    );

    return networkResponse;
  } catch {
    return matchOfflineDocument(event.request);
  }
}

async function handleStaticRequest(event) {
  const request = event.request;
  const cached = await caches.match(request, { ignoreSearch: true });

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        const cacheName = cacheBucketFor(request.url);
        await safeCachePut(cacheName, request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(networkPromise.catch(() => {}));
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  return Response.error();
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await Promise.all([
        precacheAppShell(),
        precacheWhisperRuntime()
      ]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await cleanupOldCaches();

      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          /* ignore */
        }
      }

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!isHttpRequest(url)) return;

  if (isSameOrigin(url) && isNavigationRequest(request)) {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (isSameOrigin(url) && isStaticLikeRequest(request)) {
    event.respondWith(handleStaticRequest(event));
    return;
  }

  if (isRemoteStaticRequest(request)) {
    event.respondWith(handleStaticRequest(event));
  }
});

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
