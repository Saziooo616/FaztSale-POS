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
  const req = event.request;
  // Only ever cache this app's own GET requests (the shell files). Every
  // Firebase Auth token refresh and every Firestore sync call also fires
  // as a fetch event here — those are POST requests to a different
  // origin, each with a one-off URL that's never requested twice.
  // Without this guard, cache.put() throws on the POSTs (Cache only
  // accepts GET) and, for the ones that don't throw, this cache grows
  // forever with entries that can never be reused — a slow storage leak
  // that runs on every 20s sync cycle for as long as the app is open.
  // Let anything that isn't a same-origin GET pass straight through to
  // the network with no interception, exactly as if there were no
  // service worker at all.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Network-first: always try to get the freshest file when online, so a
  // deployed bugfix is picked up immediately rather than stuck behind a
  // cached copy. Only fall back to cache when actually offline.
  event.respondWith(
    fetch(req)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return response;
      })
      .catch(() => caches.match(req))
  );
});
