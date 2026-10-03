# pwa-notifications

An installable page (manifest + service worker) with a form that builds
`ServiceWorkerRegistration.showNotification()` calls, to see how each browser and OS renders the
options of the [Notifications API](https://notifications.spec.whatwg.org/).

Nothing is pushed from a server. A `push` handler ends in the same `showNotification()` call, so the
notification looks the same; what this page cannot show is delivery while the app is closed.

## Files

| File            | Role                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `index.html`    | status, install, the option form, active notifications, app badge, event log                                               |
| `main.js`       | registers the worker, reads the form and asks the worker to show it, `getNotifications()`, `setAppBadge()`                 |
| `sw.js`         | offline cache (network first), `showNotification()`, `notificationclick` / `notificationclose`, reports events to the page |
| `manifest.json` | name, scope, icons, one shortcut. `.json` rather than `.webmanifest` so that S3 serves it with a known content type        |
| `icons/`        | app icons (`any` and `maskable`), the Apple touch icon, the notification badge, a sample `image`                           |

## Trying it

`make dev NAME=pwa-notifications`, then http://localhost:5173/pwa-notifications/. `localhost` is a
secure context, so the service worker and notifications work there. A phone needs the deployed page
(HTTPS).

1. **Install.** Chromium: the Install button. iOS and iPadOS: Share → Add to Home Screen, then
   continue in the installed app, because only it gets the Notification API. Safari on macOS: File →
   Add to Dock.
2. **Request permission**, then send a preset or fill in the form. The generated call is shown
   under the form.
3. Set a **delay** and switch away to see the notification arrive in the background.
4. Click the notification, its action buttons, or dismiss it, and read the **Event log**.

## Releasing a change

The service worker is network first, so an edited page shows up on the next online load without
touching the worker. To exercise the update flow (Check for an update → Reload with the new
version), bump `VERSION` in `sw.js`.

## Not here

- Web Push itself (`pushManager.subscribe()`, VAPID, a sender). The site publishes static files
  only; a sender would be a local-only experiment.
- `screenshots` in the manifest (the richer install dialog on Android).

## Observations

To be filled in from real devices: which options each platform honors.

| Option               | Chrome (desktop) | Chrome (Android) | Safari (macOS) | Safari (iOS, installed) | Firefox |
| -------------------- | ---------------- | ---------------- | -------------- | ----------------------- | ------- |
| `icon`               |                  |                  |                |                         |         |
| `badge`              |                  |                  |                |                         |         |
| `image`              |                  |                  |                |                         |         |
| `actions`            |                  |                  |                |                         |         |
| `tag` / `renotify`   |                  |                  |                |                         |         |
| `requireInteraction` |                  |                  |                |                         |         |
| `silent` / `vibrate` |                  |                  |                |                         |         |
| `timestamp`          |                  |                  |                |                         |         |
| `navigate`           |                  |                  |                |                         |         |
| `setAppBadge()`      |                  |                  |                |                         |         |
