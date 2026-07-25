import { describe, it, expect } from 'vitest'
import {
  findProductionSignal,
  isLocalUrl,
  assertOfflineE2ESafe,
  isOfflineE2EServer,
  PRODUCTION_SIGNALS,
  MONITORED_ENV_KEYS,
  type EnvLike,
} from '../e2e-guard'

/** Environnement E2E sain de référence (valeurs 100 % factices, locales). */
const SAFE_ENV: EnvLike = {
  OFFLINE_E2E_MODE: 'true',
  NODE_ENV: 'production', // légitime : le SW ne s'enregistre qu'en prod
  NEXT_PUBLIC_OFFLINE_E2E_MODE: 'true',
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100',
  NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3100',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54999',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'offline-e2e-fake-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'offline-e2e-fake-service-key',
}

describe('offline e2e-guard — détection de signaux de production', () => {
  it('repère la référence du projet Supabase réel', () => {
    expect(findProductionSignal('https://nvyuyffywnuollaxguen.supabase.co')).toBe('nvyuyffywnuollaxguen')
  })
  it('repère le domaine de production', () => {
    expect(findProductionSignal('https://citadelle.chapelleduroyaume.org')).toBe('chapelleduroyaume.org')
  })
  it('repère le FORMAT d’une clé réelle sans la connaître', () => {
    expect(findProductionSignal('sb_secret_whatever')).toBe('sb_secret_')
    expect(findProductionSignal('sb_publishable_whatever')).toBe('sb_publishable_')
  })
  it('repère « production » / « prod- »', () => {
    expect(findProductionSignal('prod-abc.supabase.co')).toBe('prod-')
    expect(findProductionSignal('my-production-key')).toBe('production')
  })
  it('ne signale rien pour des valeurs factices locales', () => {
    expect(findProductionSignal('http://127.0.0.1:54999')).toBeNull()
    expect(findProductionSignal('offline-e2e-fake-anon-key')).toBeNull()
    expect(findProductionSignal(undefined)).toBeNull()
    expect(findProductionSignal('')).toBeNull()
  })
})

describe('offline e2e-guard — isLocalUrl', () => {
  it('accepte loopback', () => {
    expect(isLocalUrl('http://127.0.0.1:3100')).toBe(true)
    expect(isLocalUrl('http://localhost:3100/x')).toBe(true)
  })
  it('rejette tout le reste', () => {
    expect(isLocalUrl('https://citadelle.chapelleduroyaume.org')).toBe(false)
    expect(isLocalUrl('https://example.com')).toBe(false)
    expect(isLocalUrl(undefined)).toBe(false)
  })
})

describe('offline e2e-guard — assertOfflineE2ESafe (garde-fou bloquant)', () => {
  it('ne fait rien quand le flag est absent (prod inchangée)', () => {
    expect(() => assertOfflineE2ESafe({ NODE_ENV: 'production' })).not.toThrow()
    // Même avec des valeurs de prod, tant que le flag n'est pas armé, aucun effet.
    expect(() =>
      assertOfflineE2ESafe({
        NEXT_PUBLIC_SUPABASE_URL: 'https://nvyuyffywnuollaxguen.supabase.co',
      }),
    ).not.toThrow()
  })

  it('passe pour un environnement E2E sain', () => {
    expect(() => assertOfflineE2ESafe(SAFE_ENV)).not.toThrow()
    expect(isOfflineE2EServer(SAFE_ENV)).toBe(true)
  })

  it('LÈVE si l’URL Supabase de production est présente + flag armé', () => {
    const env = { ...SAFE_ENV, NEXT_PUBLIC_SUPABASE_URL: 'https://nvyuyffywnuollaxguen.supabase.co' }
    expect(() => assertOfflineE2ESafe(env)).toThrow(/production/i)
    expect(() => isOfflineE2EServer(env)).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('LÈVE pour chaque variable surveillée contenant un signal de prod', () => {
    for (const key of MONITORED_ENV_KEYS) {
      const env = { ...SAFE_ENV, [key]: 'https://citadelle.chapelleduroyaume.org' }
      expect(() => assertOfflineE2ESafe(env), `${key} devrait être refusé`).toThrow()
    }
  })

  it('LÈVE si une clé réelle (format sb_secret_) est fournie', () => {
    const env = { ...SAFE_ENV, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_xxx' }
    expect(() => assertOfflineE2ESafe(env)).toThrow(/sb_secret_/)
  })

  it('LÈVE si le site n’est pas local', () => {
    const env = { ...SAFE_ENV, NEXT_PUBLIC_SITE_URL: 'https://example.com' }
    expect(() => assertOfflineE2ESafe(env)).toThrow(/locale/)
  })

  it('le flag désactivé donne isOfflineE2EServer=false', () => {
    expect(isOfflineE2EServer({ ...SAFE_ENV, OFFLINE_E2E_MODE: undefined })).toBe(false)
    expect(isOfflineE2EServer({ NODE_ENV: 'production' })).toBe(false)
  })

  it('la blocklist reste non vide (protection active)', () => {
    expect(PRODUCTION_SIGNALS.length).toBeGreaterThan(0)
  })
})
