// sw.js — Digital Solution Service Worker for Web Push (Safari PWA & Desktop Web)
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for existing clients
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications from server
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Digital Solution';
  const options = {
    body: data.body || 'You have a new update in Digital Solution.',
    icon: data.icon || '/assets/icon.png',
    badge: '/assets/icon.png',
    tag: data.tag || `ds-push-${Date.now()}`,
    data: data.data || {},
    renotify: true,
    requireInteraction: false,
    vibrate: [100, 50, 100],
  };

  // Safari on iOS requires showNotification to be called inside event.waitUntil
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle user clicking on a push notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.postMessage({ type: 'NOTIFICATION_CLICKED', data });
            return client.focus();
          }
        }
      }
      // Otherwise open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle automatic subscription change (e.g. browser refreshed push keys)
self.addEventListener('pushsubscriptionchange', (event) => {
  // Inform active clients to re-sync push token to Supabase
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      });
    })
  );
});

