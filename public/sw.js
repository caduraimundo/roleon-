const CACHE_NAME = 'roleon-v1'
const PRECACHE_URLS = ['/', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== location.origin) return
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return res
      })
      .catch(() => caches.match(event.request))
  )
})

self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'Roleon';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
