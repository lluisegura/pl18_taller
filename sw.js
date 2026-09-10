self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'PLAÇA 18', {
    body: data.body || 'Hi ha una actualització al tauler.',
    icon: 'icon.svg', badge: 'icon.svg', data: { url: data.url || 'index.html' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
