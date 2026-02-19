/**
 * Service Worker - PWA Sistema Restaurante
 * Estrategia: Network First (red primero, caché como respaldo)
 * No se cachean peticiones a Firestore/Firebase.
 */

const CACHE_NAME = 'restaurante-pwa-v1';

const STATIC_ASSETS = [
  './index.html',
  './mesero.html',
  './login.html',
  './app.js',
  './auth.js',
  './firebase-config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

function isFirestoreOrFirebase(url) {
  try {
    const u = new URL(url);
    return u.hostname.includes('firestore.googleapis.com') ||
           u.hostname.includes('firebaseio.com') ||
           u.hostname.includes('identitytoolkit.googleapis.com') ||
           u.hostname.includes('securetoken.googleapis.com');
  } catch (_) {
    return false;
  }
}

function isStaticAsset(url) {
  try {
    const u = new URL(url);
    if (u.origin !== self.location.origin) return false;
    const path = u.pathname.toLowerCase();
    return /\.(html|js|json|css|png|svg|ico|woff2?)$/i.test(path) ||
           path === '/' || path.endsWith('/') ||
           path.endsWith('index.html') || path === '/index.html' ||
           path.includes('mesero.html') || path.includes('login.html') ||
           path.includes('manifest.json') ||
           path.includes('icons/');
  } catch (_) {
    return false;
  }
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS.map(function (path) {
        return new Request(path, { cache: 'reload' });
      })).catch(function () {});
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Network First: intentar red, si falla usar caché. No cachear Firestore.
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  if (isFirestoreOrFirebase(event.request.url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        if (!response.ok) return response;
        if (isStaticAsset(event.request.url)) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || fetch(event.request);
        });
      })
  );
});
