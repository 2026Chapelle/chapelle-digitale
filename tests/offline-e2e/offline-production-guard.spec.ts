import { test, expect } from '@playwright/test'
import {
  assertOfflineE2ESafe,
  isOfflineE2EServer,
  findProductionSignal,
  type EnvLike,
} from '../../src/lib/offline/e2e-guard'
import { HARNESS_PATH } from './_helpers'

/**
 * Scénario — GARDE-FOU PRODUCTION.
 * Prouve que toute tentative d'utiliser une valeur de production échoue AVANT
 * lancement, et que le serveur de test tourne bien en mode local sain.
 */
test.describe('Garde-fou production', () => {
  const SAFE: EnvLike = {
    OFFLINE_E2E_MODE: 'true',
    NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54999',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'offline-e2e-fake-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'offline-e2e-fake-service-key',
  }

  test('refuse l’URL Supabase de production', () => {
    expect(findProductionSignal('https://nvyuyffywnuollaxguen.supabase.co')).toBeTruthy()
    expect(() =>
      assertOfflineE2ESafe({ ...SAFE, NEXT_PUBLIC_SUPABASE_URL: 'https://nvyuyffywnuollaxguen.supabase.co' }),
    ).toThrow(/production/i)
  })

  test('refuse le domaine de production', () => {
    expect(() =>
      assertOfflineE2ESafe({ ...SAFE, NEXT_PUBLIC_SITE_URL: 'https://citadelle.chapelleduroyaume.org' }),
    ).toThrow()
  })

  test('refuse une clé au format réel (sb_secret_)', () => {
    expect(() => assertOfflineE2ESafe({ ...SAFE, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc' })).toThrow(/sb_secret_/)
  })

  test('accepte l’environnement local sain', () => {
    expect(() => assertOfflineE2ESafe(SAFE)).not.toThrow()
    expect(isOfflineE2EServer(SAFE)).toBe(true)
  })

  test('le serveur de test tourne en mode E2E local (page harnais servie)', async ({ page }) => {
    const res = await page.goto(HARNESS_PATH)
    expect(res?.status(), 'la page harnais doit répondre 200 en local').toBe(200)
    await expect(page.getByTestId('offline-e2e-title')).toBeVisible()
    // Preuve que l'on ne touche pas la prod : l'URL de base est loopback.
    expect(page.url()).toMatch(/^http:\/\/127\.0\.0\.1:3100\//)
  })
})
