import { defineConfig, devices } from '@playwright/test'

/**
 * Configuration Playwright DÉDIÉE au harnais OFFLINE (Lot 1.2).
 *
 * Isolée de toute autre config. Cible un build de PRODUCTION LOCAL servi sur
 * 127.0.0.1:3100 (le service worker ne s'enregistre qu'en prod). Chromium seul.
 * Artefacts (traces/captures/vidéos) UNIQUEMENT en cas d'échec.
 *
 * Prérequis : `npm run build:offline-e2e` (build avec .env.offline-e2e factice)
 * puis `npm run test:offline-e2e` (lance le serveur + les specs).
 */
const PORT = 3100
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './tests/offline-e2e',
  outputDir: './artifacts/offline-playwright/test-results',
  fullyParallel: false,
  workers: 1, // service worker + IndexedDB : exécution séquentielle déterministe
  retries: 0, // local : pas de retry (échec = échec)
  forbidOnly: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: './artifacts/offline-playwright/html-report', open: 'never' }],
    ['json', { outputFile: './artifacts/offline-playwright/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    serviceWorkers: 'allow', // indispensable pour tester l'installation du SW
  },
  projects: [
    {
      name: 'chromium-offline',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Relance le build de prod avec l'environnement factice (garde-fou inclus).
    command: 'node scripts/offline-e2e/with-env.mjs next start -p 3100',
    url: BASE_URL,
    // false : on démarre TOUJOURS un serveur frais avec l'environnement E2E
    // (un serveur résiduel prod-leaké ne doit JAMAIS être réutilisé).
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
