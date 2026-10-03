import { expect, test } from '@playwright/test'

const path = '/pwa-notifications/'

test.describe('pwa-notifications', () => {
  // Chromium refuses to install an app whose manifest names a file that is not there.
  test('every icon the manifest names is served', async ({ request }) => {
    const manifestUrl = `${path}manifest.json`
    const manifest = (await (await request.get(manifestUrl)).json()) as {
      icons: { src: string }[]
    }

    expect(manifest.icons.length).toBeGreaterThan(0)
    for (const icon of manifest.icons) {
      const response = await request.get(path + icon.src)
      expect(response.status(), icon.src).toBe(200)
    }
  })

  test('the page loads again offline', async ({ page, context }) => {
    await page.goto(path)
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => {}))

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'PWA notifications' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeVisible()
  })

  // Headless Chromium reports the notification permission as denied even after
  // context.grantPermissions(['notifications']), so the call itself cannot run
  // here; the generated code is what the form would pass to it.
  test('the generated call carries only the options the form sets', async ({ page }) => {
    await page.goto(path)

    await page.getByLabel('title', { exact: true }).fill('From the test')
    await page.getByLabel('tag', { exact: true }).fill('e2e')
    await page.getByLabel('renotify').check()

    await expect(page.locator('#code')).toHaveText(
      `await registration.showNotification("From the test", ${JSON.stringify({ tag: 'e2e', renotify: true }, null, 2)})`,
    )
  })
})
