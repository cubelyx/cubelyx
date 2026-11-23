// Cubelyx Service Worker - PWA Network-First (Mise à jour immédiate)
const CACHE_NAME = "cubelyx-v2.4";
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
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
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
  // Les requêtes /api/* sont interceptées par api-shim.js
  if (event.request.url.includes("/api/")) return;

  // Stratégie Network-First : charge toujours la version la plus récente du fichier
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
