import { test, expect } from '@playwright/test'
import { HARNESS_PATH, waitForServiceWorkerActive } from './_helpers'

/**
 * Scénario D — Rechargement à froid hors ligne.
 * Attendu : OFFLINE_COLD_RELOAD_OK (route non mise en cache → fallback /offline,
 * jamais une page d'erreur Chromium ni un écran blanc).
 */
test.describe('D — Rechargement à froid hors ligne', () => {
  test('une route membre non cachée sert le fallback /offline', async ({ page, context }) => {
    // 1) Visite en ligne pour installer + activer le SW (précache /offline).
    await page.goto(HARNESS_PATH)
    await waitForServiceWorkerActive(page)
    await page.reload() // garantit un SW contrôleur
    await waitForServiceWorkerActive(page)
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    await page.waitForTimeout(1500) // laisse le précache d'install se terminer

    // 2) Hors ligne.
    await context.setOffline(true)

    // 3) Navigation vers une route membre JAMAIS mise en cache.
    const res = await page.goto('/member/dashboard/route-inexistante-e2e', { waitUntil: 'domcontentloaded' })

    // 4) Fallback /offline servi par le SW (contenu générique attendu).
    await expect(page.getByText(/Tu es hors connexion/i)).toBeVisible({ timeout: 10_000 })

    // 5) Ni erreur Chromium, ni écran blanc.
    const bodyText = (await page.locator('body').innerText()).trim()
    expect(bodyText.length, 'la page ne doit pas être blanche').toBeGreaterThan(0)
    expect(bodyText).not.toMatch(/ERR_INTERNET_DISCONNECTED|No internet|Cette page ne fonctionne pas/i)
    // Le statut, s'il existe, provient du SW (200) et non d'une erreur réseau.
    if (res) expect(res.status()).toBeLessThan(400)
  })
})
