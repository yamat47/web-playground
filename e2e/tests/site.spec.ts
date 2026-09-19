import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

type Entry = { name: string; title: string; deploy: boolean; path?: string }

// Written by tools/assemble.ts; one entry per experiment, deployable or not.
const experiments: Entry[] = JSON.parse(
  readFileSync(new URL('../../dist/experiments.json', import.meta.url), 'utf8'),
)

test('the index lists every experiment', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('web-playground')
  for (const experiment of experiments) {
    await expect(page.getByRole('heading', { name: experiment.title })).toBeVisible()
  }
})

test('a missing path shows the 404 page', async ({ page }) => {
  const response = await page.goto('/no-such-experiment/')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Not found' })).toBeVisible()
})

for (const experiment of experiments.filter((e) => e.deploy)) {
  test.describe(experiment.name, () => {
    test('opens without console errors', async ({ page }) => {
      const errors: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', (error) => errors.push(error.message))

      const response = await page.goto(experiment.path!)
      expect(response?.status()).toBe(200)
      await expect(page).not.toHaveTitle('')
      expect(errors).toEqual([])
    })

    test('a deep link falls back to the experiment page', async ({ request }) => {
      const response = await request.get(`${experiment.path}some/deep/route`)
      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toContain('text/html')
    })

    test('the path without a trailing slash redirects to it', async ({ request }) => {
      const response = await request.get(`/${experiment.name}`, { maxRedirects: 0 })
      expect(response.status()).toBe(301)
      expect(response.headers()['location']).toBe(`/${experiment.name}/`)
    })
  })
}
