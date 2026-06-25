// Service worker: offline support (precache + runtime cache), Web Push, and
// notification handling so Bloom is installable and works without a connection.

const VERSION = 'bloom-v3'
// Relative to the SW's own scope, so this works at root or a project sub-path.
const CORE = ['./', './index.html', './manifest.json', './icon.svg']
const SHELL = new URL('./', self.registration.scope).pathname

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Caching strategy:
//  - never cache /api/ (coach, push) — always hit the network
//  - navigations: network-first, fall back to the cached app shell when offline
//  - same-origin GET assets: stale-while-revalidate (instant + self-updating)
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put(SHELL, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(SHELL) || caches.match('./'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(VERSION).then((c) => c.put(request, copy)).catch(() => {})
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})

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
