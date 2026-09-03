import { test, expect } from '@playwright/test'
import {
  HARNESS_PATH,
  SHELL_CACHE,
  PDF_FIXTURE,
  AUDIO_FIXTURE,
  installOfflineApiMocks,
  waitForServiceWorkerActive,
  readCacheStorage,
  readOfflineDb,
  seedDownloadViaUi,
} from './_helpers'

/**
 * Scénario E — Cache Storage.
 * Attendu : CACHE_STORAGE_OK (shell présent, /offline + manifest + icônes,
 * AUCUNE réponse API/privée mise en cache).
 */
test.describe('E — Cache Storage', () => {
  test('contient le shell générique et jamais d’API privée', async ({ page }) => {
    await page.goto(HARNESS_PATH)
    await waitForServiceWorkerActive(page)
    // Laisse le précache d'install se terminer.
    await page.waitForTimeout(1500)

    const caches = await readCacheStorage(page)
    expect(Object.keys(caches)).toContain(SHELL_CACHE)
    const shell = caches[SHELL_CACHE] || []

    // Shell générique attendu (précaché à l'install).
    expect(shell, 'le shell doit contenir /offline').toContain('/offline')
    expect(shell).toContain('/manifest.json')
    expect(shell).toContain('/icon-192.png')
    expect(shell).toContain('/icon-512.png')
    expect(shell).toContain('/images/logo-mark.png')

    // SÉCURITÉ : aucune réponse API ni RSC/_next/data mise en cache, tous caches confondus.
    const allPaths = Object.values(caches).flat()
    const leaked = allPaths.filter(
      (p) => p.startsWith('/api/') || p.startsWith('/_next/data/') || p.includes('_rsc='),
    )
    expect(leaked, `ressources sensibles mises en cache par erreur: ${leaked.join(', ')}`).toEqual([])
  })

  test('garde les médias protégés dans IndexedDB et hors de tous les caches', async ({ page, context }) => {
    await installOfflineApiMocks(context)
    await page.goto(HARNESS_PATH)
    await waitForServiceWorkerActive(page)

    await seedDownloadViaUi(page, PDF_FIXTURE.contentId)
    await seedDownloadViaUi(page, AUDIO_FIXTURE.contentId)

    const db = await readOfflineDb(page)
    const downloaded = db.items.filter(
      (item) => item.contentId === PDF_FIXTURE.contentId || item.contentId === AUDIO_FIXTURE.contentId,
    )
    expect(downloaded.map((item) => item.contentId).sort()).toEqual([PDF_FIXTURE.contentId, AUDIO_FIXTURE.contentId].sort())
    expect(db.fileKeys.map(String)).toEqual(expect.arrayContaining(downloaded.map((item) => String(item.id))))

    const cachedResponses = await page.evaluate(async () => {
      const entries: Array<{ url: string; contentType: string }> = []
      for (const cacheName of await caches.keys()) {
        const cache = await caches.open(cacheName)
        for (const request of await cache.keys()) {
          const response = await cache.match(request)
          entries.push({ url: request.url, contentType: response?.headers.get('content-type') || '' })
        }
      }
      return entries
    })

    const protectedMedia = cachedResponses.filter(
      ({ url, contentType }) =>
        url.includes(`/api/member/offline/download?contentId=${PDF_FIXTURE.contentId}`) ||
        url.includes(`/api/member/offline/download?contentId=${AUDIO_FIXTURE.contentId}`) ||
        contentType.toLowerCase() === 'application/pdf' ||
        contentType.toLowerCase().startsWith('audio/'),
    )
    expect(protectedMedia, `médias protégés trouvés dans Cache Storage: ${JSON.stringify(protectedMedia)}`).toEqual([])
  })
})
