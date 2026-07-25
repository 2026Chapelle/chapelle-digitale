import { test, expect } from '@playwright/test'
import { HARNESS_PATH, SHELL_CACHE, waitForServiceWorkerActive, readCacheStorage } from './_helpers'

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
})
