// Offline support for the shopping page: always try the network first (so a
// new menu shows up), fall back to the last copy when there's no signal.
// A store often has one bar of signal, where a request can hang for a long
// time instead of failing, so after WAIT_MS the saved copy is used (the
// network keeps going in the background and refreshes it for next time).
const CACHE = 'shop-list-v1';
const WAIT_MS = 3000;
const FILES = ['./', 'index.html', 'menu.enc', 'manifest.json', 'icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const net = fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  });
  const saved = caches.match(e.request, { ignoreSearch: true });
  // Too slow: the saved copy if there is one, else keep waiting.
  const slow = new Promise(ok => setTimeout(ok, WAIT_MS)).then(() => saved).then(r => r || net);
  // No signal at all: the saved copy (or the network error if there isn't one).
  const failed = net.catch(err => saved.then(r => r || Promise.reject(err)));
  e.waitUntil(net.catch(() => {}));
  e.respondWith(Promise.race([failed, slow]));
});
