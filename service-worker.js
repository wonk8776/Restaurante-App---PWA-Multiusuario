const CACHE_NAME = 'luxe-dining-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/mesero.html',
  '/auth.js',
  '/firebase-config.js',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

const FIREBASE_ORIGINS = [
  'https://www.gstatic.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://firebaseapp.com',
  'https://*.firebaseapp.com',
  'https://*.googleapis.com'
];

function isFirebaseRequest(url) {
  try {
    const u = new URL(url);
    return u.origin.includes('gstatic.com') ||
           u.origin.includes('googleapis.com') ||
           u.origin.includes('gstatic.com') ||
           u.hostname.endsWith('firebaseapp.com') ||
           u.hostname.endsWith('firebaseio.com');
  } catch (_) {
    return false;
  }
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS.map(function (u) {
        return new Request(u, { cache: 'reload' });
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

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  if (isFirebaseRequest(event.request.url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        const url = new URL(event.request.url);
        if (url.origin !== self.location.origin) return res;
        const isStatic = /\.(html|js|json|css|png|svg|ico|woff2?)$/i.test(url.pathname) ||
          url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/login.html' || url.pathname === '/mesero.html';
        if (!isStatic || !res.ok) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone);
        });
        return res;
      });
    })
  );
});
