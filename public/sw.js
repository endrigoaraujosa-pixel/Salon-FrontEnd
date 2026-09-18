// Intentionally network-only: no app shell, API data, photos or mutation queue.
const CACHE = 'salon-admin-offline-v1';
const PREFIX = 'salon-admin-offline-';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('/offline.html', { cache: 'reload' });
    if (!response.ok) throw new Error('Offline page unavailable');
    await (await caches.open(CACHE)).put('/offline.html', response);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin || /^\/api(?:\/|$)/.test(url.pathname)) return;
  event.respondWith((async () => {
    try { return await fetch(request, { cache: 'no-store' }); }
    catch {
      return await (await caches.open(CACHE)).match('/offline.html') || new Response('Sem conexão. Reconecte e tente novamente.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
