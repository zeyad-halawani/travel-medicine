const CACHE = "travel-consult-v2";
const FILES = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/clinical.js",
  "./js/i18n.js",
  "./js/reference.js",
  "./data/destinations.json",
  "./data/world.json",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./fonts/inter-400.woff2",
  "./fonts/inter-600.woff2",
  "./fonts/plex-400.woff2",
  "./fonts/plex-600.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
