import { test, expect } from '@playwright/test'
import { HARNESS_PATH, SHELL_CACHE, waitForServiceWorkerActive, collectConsoleErrors } from './_helpers'

/**
 * Scénario A — Installation du service worker.
 * Attendu : SERVICE_WORKER_ACTIVE.
 */
test.describe('A — Service worker', () => {
  test('s’enregistre, s’active, contrôle la page, sans erreur console', async ({ page }) => {
    const errors = collectConsoleErrors(page)

    // /sw.js doit être servi sans erreur.
    const swRes = await page.request.get('/sw.js')
    expect(swRes.status(), '/sw.js doit répondre 200').toBe(200)
    expect(swRes.headers()['content-type'] || '').toMatch(/javascript/i)

    await page.goto(HARNESS_PATH)
    await waitForServiceWorkerActive(page)

    const info = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      return {
        hasActive: !!reg.active,
        scope: reg.scope,
        state: reg.active?.state,
        scriptURL: reg.active?.scriptURL,
      }
    })
    expect(info.hasActive).toBe(true)
    expect(info.state).toBe('activated')
    expect(info.scope).toMatch(/\/$/)
    expect(info.scriptURL).toMatch(/\/sw\.js$/)

    // Après un rechargement, le SW doit CONTRÔLER la page.
    await page.reload()
    await waitForServiceWorkerActive(page)
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller)
    expect(controlled, 'la page doit être contrôlée par le SW après reload').toBe(true)

    // Le cache shell attendu existe.
    const names = await page.evaluate(() => caches.keys())
    expect(names).toContain(SHELL_CACHE)

    expect(errors, `erreurs console: ${errors.join(' | ')}`).toEqual([])
  })
})
