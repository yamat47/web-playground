// Service worker for /pwa-notifications/. It keeps the page usable offline and
// owns the notifications: showing them when the page asks, and everything
// that happens once one is on screen (clicks, closes). Every event is reported
// back to the open pages so the Event log shows it.
//
// Bump VERSION to publish a new worker; the page then offers the update.
const VERSION = 'v1'
// Cache Storage is shared by every experiment on the origin, hence the prefix.
const CACHE_PREFIX = 'pwa-notifications-'
const CACHE = `${CACHE_PREFIX}${VERSION}`
const SHELL = [
  './',
  'style.css',
  'main.js',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/badge.png',
  'icons/notification-image.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE)
          .map((name) => caches.delete(name)),
      )
      // The first visit gets a controller without a reload.
      await self.clients.claim()
    })(),
  )
})

// Network first, so a deploy shows up on the next load; the cache answers
// only when the network does not.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          // The response goes back without waiting for the copy to be written.
          const copy = response.clone()
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)))
        }
        return response
      } catch (error) {
        const cached = await caches.match(request, { cacheName: CACHE })
        if (cached) return cached
        throw error
      }
    })(),
  )
})

self.addEventListener('message', (event) => {
  const { type } = event.data
  if (type === 'version') event.source.postMessage({ type: 'version', version: VERSION })
  if (type === 'skip-waiting') self.skipWaiting()
  if (type === 'show') event.waitUntil(show(event.data))
})

// The delay runs here instead of in the page because a backgrounded page's
// timers are throttled or frozen, and the point of the delay is to background it.
async function show({ title, options, delay }) {
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay * 1000))
  const call = `showNotification(${JSON.stringify(title)})`
  try {
    await self.registration.showNotification(title, options)
    await report(`${call} resolved`)
  } catch (error) {
    // Reported, not swallowed: which combinations throw is part of what the page shows.
    await report(`${call} threw ${error.name}: ${error.message}`)
  }
}

self.addEventListener('notificationclick', (event) => {
  const { notification, action } = event
  const data = notification.data ?? {}
  if (!data.keepOpen) notification.close()
  event.waitUntil(handleClick(notification, action, data))
})

async function handleClick(notification, action, data) {
  const message = `notificationclick: ${JSON.stringify(notification.title)}, action: ${action === '' ? '(body)' : JSON.stringify(action)}`
  const open = await windows()
  await report(message, open)
  if (data.url) return self.clients.openWindow(data.url)
  if (open.length > 0) return open[0].focus()
  // No page was left to hear the report, so the one opened for the click gets
  // it; the message waits in the client's queue until the page listens.
  const opened = await self.clients.openWindow('./')
  if (opened) await report(message, [opened])
}

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(report(`notificationclose: ${JSON.stringify(event.notification.title)}`))
})

// The origin is shared with the index page and the other experiments, so the
// pages of this one are picked out by scope.
async function windows() {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  return all.filter((client) => client.url.startsWith(self.registration.scope))
}

async function report(message, clients) {
  for (const client of clients ?? (await windows())) client.postMessage({ type: 'log', message })
}
