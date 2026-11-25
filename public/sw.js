const scope = new URL(self.registration.scope);
const cachePrefix = 'harueum-shell:' + scope.pathname + ':';
const cacheName = cachePrefix + version;
const root = new URL('./', scope);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([root, ...shell.map(asset => new URL(asset, scope))])));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(cachePrefix) && name !== cacheName).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const relative = url.pathname.slice(scope.pathname.length);
  if (relative.startsWith('dev/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async response => {
      if (response.ok && url.pathname === root.pathname) {
        const cache = await caches.open(cacheName);
        await cache.put(root, response.clone()).catch(() => {});
      }
      return response;
    }).catch(async () => (await caches.match(root, { cacheName })) || Response.error()));
  } else if (relative.startsWith('assets/')) {
    event.respondWith(caches.match(request, { cacheName }).then(cached => cached || fetch(request).then(async response => {
      if (response.ok) {
        const cache = await caches.open(cacheName);
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })));
  }
});
