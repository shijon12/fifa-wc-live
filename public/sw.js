self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'World Cup update', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(self.registration.showNotification(data.title || 'World Cup update', {
    body: data.body || 'A match you follow has an update.',
    icon: '/icon.svg',
    badge: '/badge.svg',
    tag: data.tag || 'world-cup-update',
    renotify: true,
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => client.url === destination);
      if (existing) return existing.focus();
      return clients.openWindow(destination);
    }),
  );
});
