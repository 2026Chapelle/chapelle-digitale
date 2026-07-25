import { test, expect } from '@playwright/test'
import {
  HARNESS_PATH,
  AUDIO_FIXTURE,
  installOfflineApiMocks,
  waitForServiceWorkerActive,
  readOfflineDb,
  seedDownloadViaUi,
} from './_helpers'

/**
 * Scénario C — Audio hors ligne.
 * Attendu : OFFLINE_AUDIO_OK (entrée IndexedDB, source locale, play/pause/reprise,
 * progression, lecture hors ligne).
 */
test.describe('C — Audio hors ligne', () => {
  test('télécharge, puis lit/pause/progresse sans réseau', async ({ page, context }) => {
    await installOfflineApiMocks(context)
    await page.goto(HARNESS_PATH)
    await waitForServiceWorkerActive(page)

    await seedDownloadViaUi(page, AUDIO_FIXTURE.contentId)

    const { items, fileKeys } = await readOfflineDb(page)
    const item = items.find((i) => i.contentId === AUDIO_FIXTURE.contentId)
    expect(item, 'item audio présent en IndexedDB').toBeTruthy()
    expect(item.type).toBe('audio')
    expect(item.downloadStatus).toBe('completed')
    expect(item.mimeType).toMatch(/^audio\//)
    expect(item.sizeBytes).toBe(AUDIO_FIXTURE.sizeBytes)
    expect(fileKeys.map(String)).toContain(String(item.id))

    // Repeuple la bibliothèque puis passe hors ligne.
    await page.reload()
    await waitForServiceWorkerActive(page)
    await context.setOffline(true)

    const blobRequests: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/member/offline/download')) blobRequests.push(r.url())
    })

    // Ouvre le lecteur audio (vrai composant de production).
    const lib = page.getByTestId('offline-e2e-library')
    await lib.getByRole('button', { name: /Écouter/i }).first().click()
    const audio = page.locator('audio')
    await expect(audio).toHaveCount(1)

    // La source est un Blob local.
    const src = await audio.getAttribute('src')
    expect(src, 'source audio locale (blob:)').toMatch(/^blob:/)

    // Lecture (déclenchée par un geste utilisateur → autorisée).
    await lib.getByRole('button', { name: /^Lecture$/ }).click()
    // La progression avance sans réseau.
    await expect
      .poll(async () => page.evaluate(() => (document.querySelector('audio') as HTMLAudioElement)?.currentTime || 0), {
        timeout: 8_000,
      })
      .toBeGreaterThan(0)

    // Pause.
    await lib.getByRole('button', { name: /^Pause$/ }).click()
    const tPause = await page.evaluate(() => (document.querySelector('audio') as HTMLAudioElement)?.currentTime || 0)
    expect(tPause).toBeGreaterThan(0)

    // Reprise.
    await lib.getByRole('button', { name: /^Lecture$/ }).click()
    await expect
      .poll(async () => page.evaluate(() => (document.querySelector('audio') as HTMLAudioElement)?.currentTime || 0), {
        timeout: 8_000,
      })
      .toBeGreaterThanOrEqual(tPause)

    expect(blobRequests, 'aucune requête réseau pour lire l’audio hors ligne').toEqual([])
  })
})
