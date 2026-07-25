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
 * Scénario B — PDF hors ligne.
 * Attendu : OFFLINE_PDF_OK (téléchargement autorisé, entrée IndexedDB, blob/MIME
 * correct, lisible sans réseau).
 */
test.describe('B — PDF hors ligne', () => {
  test('télécharge, stocke, et reste lisible sans réseau', async ({ page, context }) => {
    await installOfflineApiMocks(context)
    await page.goto(HARNESS_PATH)
    await waitForServiceWorkerActive(page)

    // 1) Téléchargement via le vrai bouton de production.
    await seedDownloadViaUi(page, PDF_FIXTURE.contentId)

    // 2) Entrée IndexedDB + métadonnées.
    const { items, fileKeys } = await readOfflineDb(page)
    const item = items.find((i) => i.contentId === PDF_FIXTURE.contentId)
    expect(item, 'item PDF présent en IndexedDB').toBeTruthy()
    expect(item.type).toBe('pdf')
    expect(item.downloadStatus).toBe('completed')
    expect(item.mimeType).toBe('application/pdf')
    expect(item.sizeBytes).toBe(PDF_FIXTURE.sizeBytes)
    expect(item.userId).toBe('offline-e2e-user')
    expect(fileKeys.map(String)).toContain(String(item.id)) // blob réellement stocké

    // 3) Le blob stocké est lisible OFFLINE (lecture directe IndexedDB, zéro réseau).
    const blobInfo = await page.evaluate(
      (blobKey) =>
        new Promise<{ size: number; head: string }>((resolve, reject) => {
          const req = indexedDB.open('citadelle-offline', 1)
          req.onsuccess = () => {
            const tx = req.result.transaction('offline_files', 'readonly')
            const get = tx.objectStore('offline_files').get(blobKey)
            get.onsuccess = async () => {
              const rec = get.result
              if (!rec?.blob) return reject(new Error('blob absent'))
              const buf = new Uint8Array(await rec.blob.arrayBuffer())
              const head = Array.from(buf.slice(0, 5))
                .map((c) => String.fromCharCode(c))
                .join('')
              resolve({ size: buf.byteLength, head })
            }
            get.onerror = () => reject(get.error)
          }
          req.onerror = () => reject(req.error)
        }),
      String(item.id),
    )
    expect(blobInfo.size).toBe(PDF_FIXTURE.sizeBytes)
    expect(blobInfo.head).toBe('%PDF-') // en-tête PDF intact

    // 4) Repeuple la bibliothèque (rechargement EN LIGNE), puis passe hors ligne.
    await page.reload()
    await waitForServiceWorkerActive(page)
    await context.setOffline(true)

    // 5) Ouvre le PDF depuis la bibliothèque réelle — aucune requête réseau attendue.
    const blobRequests: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/member/offline/download')) blobRequests.push(r.url())
    })
    const lib = page.getByTestId('offline-e2e-library')
    await lib.getByRole('button', { name: /^Ouvrir$/ }).first().click()
    const iframe = page.locator(`iframe[title="${PDF_FIXTURE.title}"]`)
    await expect(iframe).toBeVisible({ timeout: 10_000 })
    const src = await iframe.getAttribute('src')
    expect(src, 'le PDF est servi depuis un Blob local (blob:)').toMatch(/^blob:/)
    expect(blobRequests, 'aucune requête réseau pour ouvrir le PDF hors ligne').toEqual([])
  })
})
