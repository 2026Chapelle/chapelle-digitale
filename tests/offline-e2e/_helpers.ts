/**
 * Helpers partagés du harnais OFFLINE E2E (Lot 1.2). NON collecté par Playwright
 * (pas de suffixe .spec/.test).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { BrowserContext, Page } from '@playwright/test'

// Playwright transpile les specs en CJS : `__dirname` est disponible (pas
// `import.meta`). Ce fichier n'est jamais chargé en ESM.
const FIXTURE_DIR = resolve(__dirname, '..', 'fixtures', 'offline')

export interface FixtureItem {
  contentId: string
  file: string
  title: string
  type: 'pdf' | 'audio'
  mime: string
  sizeBytes: number
  sha256: string
  authorized: boolean
  accessVersion: string
}

export const HARNESS_PATH = '/offline-e2e'
export const OFFLINE_DB_NAME = 'citadelle-offline'
export const SHELL_CACHE = 'citadelle-shell-v1'

const manifest = JSON.parse(readFileSync(resolve(FIXTURE_DIR, 'fixtures.json'), 'utf8'))
export const FIXTURES: FixtureItem[] = manifest.items
export const PDF_FIXTURE = FIXTURES.find((f) => f.type === 'pdf')!
export const AUDIO_FIXTURE = FIXTURES.find((f) => f.type === 'audio')!

export function fixtureBytes(f: FixtureItem): Buffer {
  return readFileSync(resolve(FIXTURE_DIR, f.file))
}

/**
 * Installe les mocks réseau des 2 endpoints offline sur le CONTEXTE (approche B :
 * les routes serveur de production restent intactes ; on intercepte au réseau).
 */
export async function installOfflineApiMocks(context: BrowserContext): Promise<void> {
  await context.route('**/api/member/offline/authorize', async (route) => {
    let contentId = ''
    try {
      contentId = JSON.parse(route.request().postData() || '{}').contentId || ''
    } catch {
      /* ignore */
    }
    const fx = FIXTURES.find((f) => f.contentId === contentId)
    if (!fx) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, authorized: false, contentId, reason: 'not_available' }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        authorized: true,
        downloadAllowed: true,
        contentId: fx.contentId,
        contentType: fx.type,
        title: fx.title,
        mimeType: fx.mime,
        sizeBytes: fx.sizeBytes,
        coverUrl: null,
        duration: null,
        accessVersion: fx.accessVersion,
        expiresAt: '2026-12-31T00:00:00.000Z',
      }),
    })
  })

  await context.route('**/api/member/offline/download**', async (route) => {
    const url = new URL(route.request().url())
    const contentId = url.searchParams.get('contentId') || ''
    const fx = FIXTURES.find((f) => f.contentId === contentId)
    if (!fx) {
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ ok: false }) })
      return
    }
    const bytes = fixtureBytes(fx)
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': fx.mime,
        'Content-Length': String(bytes.length),
        'X-Offline-Access-Version': fx.accessVersion,
        'X-Offline-Content-Type': fx.type,
        'Cache-Control': 'no-store, private',
      },
      body: bytes,
    })
  })
}

/** Attend que le service worker soit enregistré ET actif. */
export async function waitForServiceWorkerActive(page: Page, timeout = 25_000): Promise<void> {
  await page.waitForFunction(
    async () => {
      if (!('serviceWorker' in navigator)) return false
      const reg = await navigator.serviceWorker.ready.catch(() => null)
      return !!(reg && reg.active)
    },
    undefined,
    { timeout },
  )
}

/** Lit les items + clés de blobs du magasin IndexedDB offline. */
export async function readOfflineDb(
  page: Page,
): Promise<{ items: any[]; fileKeys: IDBValidKey[] }> {
  return page.evaluate(
    ({ dbName }) =>
      new Promise<{ items: any[]; fileKeys: IDBValidKey[] }>((resolvePromise, reject) => {
        const req = indexedDB.open(dbName, 1)
        req.onsuccess = () => {
          const db = req.result
          try {
            const tx = db.transaction(['offline_items', 'offline_files'], 'readonly')
            const itemsReq = tx.objectStore('offline_items').getAll()
            itemsReq.onsuccess = () => {
              const keysReq = tx.objectStore('offline_files').getAllKeys()
              keysReq.onsuccess = () =>
                resolvePromise({ items: itemsReq.result || [], fileKeys: keysReq.result || [] })
              keysReq.onerror = () => reject(keysReq.error)
            }
            itemsReq.onerror = () => reject(itemsReq.error)
          } catch (e) {
            // Stores absents (aucun download encore) → renvoyer vide.
            resolvePromise({ items: [], fileKeys: [] })
          }
        }
        req.onerror = () => reject(req.error)
      }),
    { dbName: OFFLINE_DB_NAME },
  )
}

/** Retourne un dictionnaire { nomDeCache: [pathnames…] }. */
export async function readCacheStorage(page: Page): Promise<Record<string, string[]>> {
  return page.evaluate(async () => {
    const out: Record<string, string[]> = {}
    const names = await caches.keys()
    for (const n of names) {
      const c = await caches.open(n)
      const reqs = await c.keys()
      out[n] = reqs.map((r) => {
        try {
          return new URL(r.url).pathname + (new URL(r.url).search || '')
        } catch {
          return r.url
        }
      })
    }
    return out
  })
}

/**
 * Déclenche un téléchargement via le VRAI bouton de production et attend l'état
 * « Disponible hors ligne ». Le contenu vient des mocks réseau.
 */
export async function seedDownloadViaUi(page: Page, contentId: string): Promise<void> {
  const li = page.getByTestId(`offline-e2e-fixture-${contentId}`)
  await li.getByRole('button', { name: /Télécharger/i }).click()
  await li.getByText(/Disponible hors ligne/i).first().waitFor({ state: 'visible', timeout: 25_000 })
}

/** Collecte les erreurs console (pour asserter l'absence d'erreur). */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(String(err?.message || err)))
  return errors
}
