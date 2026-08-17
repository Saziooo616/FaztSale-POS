// Minimal offline cache — caches the app shell itself so it can still
// open (not stock data, which lives in IndexedDB regardless) even with
// no signal at the counter. Bump CACHE_NAME when you deploy a real
// update so old devices pick up the new file instead of a stale cache.
const CACHE_NAME = 'faztsale-shell-v2';
const SHELL_FILES = ['./index.html', './manifest.json', './favicon.png', './icon-192.png', './icon-512.png', './logo-splash.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first: always try to get the freshest file when online, so a
  // deployed bugfix is picked up immediately rather than stuck behind a
  // cached copy. Only fall back to cache when actually offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
