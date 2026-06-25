// Minimal service worker so Bloom can render reminder notifications reliably
// (some platforms require notifications to come from a SW registration rather
// than the Notification constructor), receive Web Push (reminders that fire
// even when the app is closed), and be installable as a PWA.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Web Push: a reminder sent from the server arrives here even if the app is
// closed. The payload is JSON: { title, body, tag, url }.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Bloom', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || '🌱 Bloom'
  const options = {
    body: data.body || '',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: data.tag || 'bloom',
    data: { url: data.url || '/' },
    vibrate: [80, 40, 80],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Tapping a reminder focuses the app (or opens it where the reminder points).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          if ('navigate' in c && target !== '/') c.navigate(target).catch(() => {})
          return c.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    }),
  )
})
