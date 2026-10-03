// Plain ES module; no build step. The page side of the experiment: it
// registers the service worker, reports what this browser supports, and turns
// the form into a showNotification() call for the worker to make. What the
// worker does and hears (shows, clicks, closes) lives in sw.js and arrives
// here as messages for the Event log.
const $ = (id) => document.getElementById(id)
const form = $('options')

const serviceWorkerSupported = 'serviceWorker' in navigator
const notificationsSupported = 'Notification' in window
const badgingSupported = 'setAppBadge' in navigator

let registration = null
let workerVersion = null
let installPrompt = null
// Set by "Reload with the new version"; a worker that takes over for any other
// reason (the first visit's clients.claim(), another tab's update) does not reload.
let reloadOnTakeover = false

// --- Event log -------------------------------------------------------------

function log(source, message) {
  const item = document.createElement('li')
  const time = new Date().toLocaleTimeString()
  item.textContent = `${time} [${source}] ${message}`
  $('log-list').prepend(item)
}

$('clear-log').addEventListener('click', () => $('log-list').replaceChildren())

// --- Status ----------------------------------------------------------------

// Ordered so that the most specific matching mode wins.
const displayModeQueries = [
  'window-controls-overlay',
  'fullscreen',
  'standalone',
  'minimal-ui',
].map((mode) => [mode, matchMedia(`(display-mode: ${mode})`)])

function displayMode() {
  return displayModeQueries.find(([, query]) => query.matches)?.[0] ?? 'browser'
}

function updateWaiting() {
  return Boolean(registration?.active && registration.waiting)
}

function serviceWorkerStatus() {
  if (!serviceWorkerSupported) return 'unsupported'
  if (registration === null) return 'registering'
  const worker = registration.active ?? registration.waiting ?? registration.installing
  const state = worker?.state ?? 'none'
  const version = workerVersion === null ? '' : ` (${workerVersion})`
  return `${state}${version}${updateWaiting() ? ', an update is waiting' : ''}`
}

function renderStatus() {
  const permission = notificationsSupported ? Notification.permission : 'unsupported'
  $('status-display-mode').textContent = displayMode()
  $('status-service-worker').textContent = serviceWorkerStatus()
  $('status-permission').textContent = permission
  $('status-max-actions').textContent = notificationsSupported
    ? String(Notification.maxActions ?? 'undefined')
    : 'unsupported'
  $('status-badging').textContent = badgingSupported ? 'supported' : 'unsupported'
  $('status-install').textContent =
    installPrompt === null ? 'not offered (yet)' : 'beforeinstallprompt fired'

  $('install-button').disabled = installPrompt === null
  $('request-permission').disabled = permission !== 'default'
  $('permission-hint').textContent =
    {
      unsupported:
        'This context has no Notification API. On iOS and iPadOS, install the app and open it from the Home Screen.',
      denied:
        'Blocked. The page cannot ask again; reset the permission in the site settings of the browser.',
    }[permission] ?? ''
  $('apply-update').hidden = !updateWaiting()
}

for (const [, query] of displayModeQueries) query.addEventListener('change', renderStatus)
// Reflects a permission changed from the browser's own UI. Some browsers do
// not know the "notifications" permission name and reject.
navigator.permissions
  ?.query({ name: 'notifications' })
  .then((status) => status.addEventListener('change', renderStatus))
  .catch(() => {})

// --- Service worker --------------------------------------------------------

async function registerServiceWorker() {
  try {
    registration = await navigator.serviceWorker.register('sw.js')
  } catch (error) {
    log('page', `service worker registration failed: ${error.message}`)
    return
  }
  registration.addEventListener('updatefound', () => {
    log('page', 'a new service worker is installing')
    registration.installing?.addEventListener('statechange', renderStatus)
  })
  renderStatus()
  // ready never settles when the install fails; nothing else waits on it.
  const ready = await navigator.serviceWorker.ready
  ready.active.postMessage({ type: 'version' })
  await refreshActive()
}

if (serviceWorkerSupported) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'log') {
      log('sw', event.data.message)
      void refreshActive()
    }
    if (event.data.type === 'version') {
      workerVersion = event.data.version
      renderStatus()
    }
  })
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadOnTakeover) return location.reload()
    navigator.serviceWorker.controller?.postMessage({ type: 'version' })
    renderStatus()
  })
  // Not awaited: the rest of the page comes up while the worker installs.
  void registerServiceWorker()
}

$('check-update').addEventListener('click', async () => {
  if (registration === null) return
  try {
    await registration.update()
    log('page', registration.installing || registration.waiting ? 'update found' : 'no update')
  } catch (error) {
    log('page', `update check failed: ${error.message}`)
  }
  renderStatus()
})

// The waiting worker takes over only when told to; controllerchange then
// reloads the page that asked.
$('apply-update').addEventListener('click', () => {
  reloadOnTakeover = true
  registration?.waiting?.postMessage({ type: 'skip-waiting' })
})

// --- Install ---------------------------------------------------------------

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  installPrompt = event
  renderStatus()
})

$('install-button').addEventListener('click', async () => {
  const { outcome } = await installPrompt.prompt()
  log('page', `install prompt: ${outcome}`)
  // A prompt can be shown once; the browser fires the event again if it may be re-offered.
  installPrompt = null
  renderStatus()
})

window.addEventListener('appinstalled', () => log('page', 'appinstalled'))

// --- Permission ------------------------------------------------------------

$('request-permission').addEventListener('click', async () => {
  const permission = await Notification.requestPermission()
  log('page', `requestPermission() resolved with "${permission}"`)
  renderStatus()
})

// --- Playground ------------------------------------------------------------

const PRESETS = {
  Minimal: { title: 'Minimal' },
  Rich: {
    title: 'Rich',
    body: 'A body, an icon, a badge and an image.',
    icon: true,
    badge: true,
    image: true,
  },
  Actions: {
    title: 'Pick one',
    body: 'The log shows which button was pressed.',
    icon: true,
    action1: 'yes',
    action1Title: 'Yes',
    action2: 'no',
    action2Title: 'No',
  },
  'Replace (send twice)': {
    title: 'Replaces the previous one',
    body: 'Same tag, so only one stays; renotify alerts again.',
    tag: 'demo',
    renotify: true,
  },
  Sticky: { title: 'Stays until dismissed', requireInteraction: true },
  Silent: { title: 'No sound, no vibration', silent: 'true' },
  'Invalid: silent + vibrate': { title: 'Never shown', silent: 'true', vibrate: '200,100,200' },
  'Invalid: renotify without tag': { title: 'Never shown', renotify: true },
}

for (const [name, values] of Object.entries(PRESETS)) {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = name
  button.addEventListener('click', () => {
    // The reset listener below re-renders the code once these values are in.
    form.reset()
    for (const [field, value] of Object.entries(values)) {
      const control = form.elements[field]
      if (control.type === 'checkbox') control.checked = value
      else control.value = value
    }
  })
  $('presets').append(' ', button)
}

// Only what the form sets goes into the options, so the generated call shows
// exactly what is being tried and everything else keeps the browser default.
function readForm() {
  const data = new FormData(form)
  const text = (name) => String(data.get(name)).trim()
  const options = {}

  if (text('body')) options.body = text('body')
  if (text('dir') !== 'auto') options.dir = text('dir')
  if (text('lang')) options.lang = text('lang')
  if (data.has('icon')) options.icon = 'icons/icon-192.png'
  if (data.has('badge')) options.badge = 'icons/badge.png'
  if (data.has('image')) options.image = 'icons/notification-image.png'
  if (text('tag')) options.tag = text('tag')
  if (data.has('renotify')) options.renotify = true
  if (data.has('requireInteraction')) options.requireInteraction = true
  if (text('silent')) options.silent = text('silent') === 'true'
  if (text('vibrate'))
    options.vibrate = text('vibrate').split(',').map(Number).filter(Number.isFinite)
  if (text('timestamp')) options.timestamp = Date.now() + Number(text('timestamp')) * 60_000

  const actions = [1, 2]
    .map((n) => ({ action: text(`action${n}`), title: text(`action${n}Title`) }))
    .filter(({ action, title }) => action !== '' || title !== '')
  if (actions.length > 0) options.actions = actions

  if (text('navigate')) options.navigate = text('navigate')
  // Read back by the notificationclick handler in sw.js.
  const clickData = {}
  if (text('url')) clickData.url = text('url')
  if (data.has('keepOpen')) clickData.keepOpen = true
  if (Object.keys(clickData).length > 0) options.data = clickData

  return { title: text('title'), options, delay: Number(text('delay')) || 0 }
}

function renderCode() {
  const { title, options } = readForm()
  const args = [JSON.stringify(title)]
  if (Object.keys(options).length > 0) args.push(JSON.stringify(options, null, 2))
  $('code').textContent = `await registration.showNotification(${args.join(', ')})`
}

form.addEventListener('input', renderCode)
// The reset event fires before the controls go back to their defaults.
form.addEventListener('reset', () => setTimeout(renderCode))

// The worker makes the call and reports how it went, with or without a delay.
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  if (registration === null) return log('page', 'no service worker registration to send through')
  const { title, options, delay } = readForm()
  const { active } = await navigator.serviceWorker.ready
  active.postMessage({ type: 'show', title, options, delay })
  if (delay > 0) log('page', `showing ${JSON.stringify(title)} in ${delay}s`)
})

// --- Active notifications --------------------------------------------------

async function refreshActive() {
  if (registration === null) return
  const notifications = await registration.getNotifications()
  const items = notifications.map((notification) => {
    const item = document.createElement('li')
    const close = document.createElement('button')
    close.type = 'button'
    close.textContent = 'Close'
    close.addEventListener('click', () => {
      notification.close()
      void refreshActive()
    })
    const tag = notification.tag === '' ? '' : ` (tag: ${notification.tag})`
    item.append(`${notification.title}${tag} `, close)
    return item
  })
  if (items.length === 0) {
    const empty = document.createElement('li')
    empty.textContent = 'None.'
    items.push(empty)
  }
  $('active-list').replaceChildren(...items)
}

$('refresh-active').addEventListener('click', refreshActive)
$('close-all').addEventListener('click', async () => {
  if (registration === null) return
  for (const notification of await registration.getNotifications()) notification.close()
  await refreshActive()
})

// --- App badge -------------------------------------------------------------

async function badge(description, call) {
  try {
    await call()
    log('page', `${description} resolved`)
  } catch (error) {
    log('page', `${description} threw ${error.name}: ${error.message}`)
  }
}

for (const id of ['badge-count', 'badge-set', 'badge-flag', 'badge-clear']) {
  $(id).disabled = !badgingSupported
}
$('badge-set').addEventListener('click', () => {
  const count = Number($('badge-count').value)
  void badge(`setAppBadge(${count})`, () => navigator.setAppBadge(count))
})
$('badge-flag').addEventListener('click', () => {
  void badge('setAppBadge()', () => navigator.setAppBadge())
})
$('badge-clear').addEventListener('click', () => {
  void badge('clearAppBadge()', () => navigator.clearAppBadge())
})

// --- Start -----------------------------------------------------------------

renderStatus()
renderCode()
