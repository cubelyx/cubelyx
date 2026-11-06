// Cubelyx Service Worker - Mise en cache PWA
const CACHE_NAME = "cubelyx-v2.0";
const ASSETS = [
  "./",
  "index.html",
  "login.html",
  "login.js",
  "app.html",
  "app.js",
  "admin.html",
  "admin.js",
  "api-shim.js",
  "manifest.webmanifest",
  "icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  // Les requêtes /api/* sont gérées par api-shim.js
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
