import { test, expect } from '@playwright/test'
import {
  HARNESS_PATH,
  PDF_FIXTURE,
  AUDIO_FIXTURE,
  installOfflineApiMocks,
  waitForServiceWorkerActive,
  readOfflineDb,
  seedDownloadViaUi,
} from './_helpers'

/**
 * Scénario F — IndexedDB.
 * Attendu : INDEXEDDB_OK (PDF + audio présents et cohérents ; suppression d'une
 * ressource via l'UI réellement répercutée ; l'autre reste intacte).
 */
test.describe('F — IndexedDB', () => {
  test('stocke deux ressources, en supprime une via l’UI, préserve l’autre', async ({ page, context }) => {
    await installOfflineApiMocks(context)
    await page.goto(HARNESS_PATH)
    await waitForServiceWorkerActive(page)

    await seedDownloadViaUi(page, PDF_FIXTURE.contentId)
    await seedDownloadViaUi(page, AUDIO_FIXTURE.contentId)

    // Les deux sont présents et cohérents (item + blob).
    let db = await readOfflineDb(page)
    expect(db.items.map((i) => i.contentId).sort()).toEqual(
      [PDF_FIXTURE.contentId, AUDIO_FIXTURE.contentId].sort(),
    )
    expect(db.fileKeys.length).toBe(2)

    // Repeuple la bibliothèque puis supprime le PDF via le bouton « Supprimer ».
    await page.reload()
    await waitForServiceWorkerActive(page)
    const lib = page.getByTestId('offline-e2e-library')
    await lib
      .getByRole('button', { name: new RegExp(`Supprimer ${PDF_FIXTURE.title}`) })
      .click()

    // Suppression réelle en IndexedDB, l'audio reste intact.
    await expect
      .poll(async () => (await readOfflineDb(page)).items.map((i) => i.contentId), { timeout: 10_000 })
      .toEqual([AUDIO_FIXTURE.contentId])

    db = await readOfflineDb(page)
    expect(db.fileKeys.length, 'le blob du PDF doit aussi être supprimé').toBe(1)
    const remaining = db.items[0]
    expect(remaining.contentId).toBe(AUDIO_FIXTURE.contentId)
    expect(remaining.downloadStatus).toBe('completed')
  })
})
