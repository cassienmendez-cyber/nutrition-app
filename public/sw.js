// Minimal service worker so Bloom can render reminder notifications reliably
// (some platforms require notifications to come from a SW registration rather
// than the Notification constructor) and so the app is installable as a PWA.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Tapping a reminder focuses the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/')
    }),
  )
})
