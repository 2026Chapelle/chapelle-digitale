import { test, expect } from '@playwright/test'
import {
  HARNESS_PATH,
  PDF_FIXTURE,
  installOfflineApiMocks,
  waitForServiceWorkerActive,
  readOfflineDb,
  seedDownloadViaUi,
} from './_helpers'

/**
 * Scénario G — Retour en ligne.
 * Attendu : ONLINE_RECOVERY_OK (reprise normale, pas de conflit cache/réseau,
 * ressources hors ligne préservées).
 */
test.describe('G — Retour en ligne', () => {
  test('après un cycle offline→online, l’app reprend et préserve les contenus', async ({ page, context }) => {
    await installOfflineApiMocks(context)
    await page.goto(HARNESS_PATH)
    await waitForServiceWorkerActive(page)
    await seedDownloadViaUi(page, PDF_FIXTURE.contentId)

    // Cycle réseau : hors ligne puis retour en ligne.
    await context.setOffline(true)
    await page.waitForTimeout(300)
    await context.setOffline(false)

    // Rechargement EN LIGNE : la page harnais (et non le fallback) doit revenir.
    const res = await page.reload()
    expect(res?.status(), 'reprise normale (200)').toBe(200)
    await expect(page.getByTestId('offline-e2e-title')).toBeVisible()
    await waitForServiceWorkerActive(page)

    // Les ressources hors ligne sont toujours là, intactes.
    const db = await readOfflineDb(page)
    const item = db.items.find((i) => i.contentId === PDF_FIXTURE.contentId)
    expect(item, 'le contenu hors ligne est préservé après retour en ligne').toBeTruthy()
    expect(item.downloadStatus).toBe('completed')
    expect(item.sizeBytes).toBe(PDF_FIXTURE.sizeBytes)
    expect(db.fileKeys.map(String)).toContain(String(item.id))

    // La bibliothèque réelle affiche l'item comme « Disponible hors ligne ».
    const lib = page.getByTestId('offline-e2e-library')
    await expect(lib.getByText(/Disponible hors ligne/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
