import { describe, it, expect } from 'vitest'
import { isEntitlementActive, hasPodcastPremiumAccess, PODCAST_PREMIUM_ENTITLEMENT_KEY, type EntitlementRow } from '../entitlement'

const NOW = Date.parse('2026-08-13T12:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()
const row = (p: Partial<EntitlementRow>): EntitlementRow => ({ starts_at: iso(NOW - 86400000), expires_at: null, revoked_at: null, ...p })

describe('isEntitlementActive (règle pure, miroir SQL)', () => {
  it('actif : démarré, non expiré, non révoqué', () => {
    expect(isEntitlementActive(row({}), NOW)).toBe(true)
  })
  it('à vie (expires_at null) → actif', () => {
    expect(isEntitlementActive(row({ expires_at: null }), NOW)).toBe(true)
  })
  it('expiré (expires_at passé) → inactif', () => {
    expect(isEntitlementActive(row({ expires_at: iso(NOW - 1000) }), NOW)).toBe(false)
  })
  it('révoqué (revoked_at présent) → inactif même si non expiré', () => {
    expect(isEntitlementActive(row({ revoked_at: iso(NOW - 1000), expires_at: iso(NOW + 999999) }), NOW)).toBe(false)
  })
  it('futur (starts_at à venir) → inactif', () => {
    expect(isEntitlementActive(row({ starts_at: iso(NOW + 86400000) }), NOW)).toBe(false)
  })
  it('null → inactif', () => {
    expect(isEntitlementActive(null, NOW)).toBe(false)
  })
  it('frontière : expires_at == now → inactif (<= )', () => {
    expect(isEntitlementActive(row({ expires_at: iso(NOW) }), NOW)).toBe(false)
  })
  it('frontière : starts_at == now → actif', () => {
    expect(isEntitlementActive(row({ starts_at: iso(NOW) }), NOW)).toBe(true)
  })
  it('fail-closed : starts_at absent/illisible → inactif', () => {
    expect(isEntitlementActive(row({ starts_at: null }), NOW)).toBe(false)
    expect(isEntitlementActive(row({ starts_at: 'pas-une-date' }), NOW)).toBe(false)
  })
  it('fail-closed : expires_at illisible → inactif (ne pas traiter comme à vie)', () => {
    expect(isEntitlementActive(row({ expires_at: 'invalide' }), NOW)).toBe(false)
  })
})

describe('hasPodcastPremiumAccess (thin, fail-closed)', () => {
  const clientReturning = (data: unknown, error: unknown = null) => ({ rpc: async () => ({ data, error }) })

  it('userId absent → false sans appel', async () => {
    let called = false
    const client = { rpc: async () => { called = true; return { data: true, error: null } } }
    expect(await hasPodcastPremiumAccess(client, null)).toBe(false)
    expect(called).toBe(false)
  })
  it('RPC true → true', async () => {
    expect(await hasPodcastPremiumAccess(clientReturning(true), 'u1')).toBe(true)
  })
  it('RPC false → false', async () => {
    expect(await hasPodcastPremiumAccess(clientReturning(false), 'u1')).toBe(false)
  })
  it('erreur RPC → false (fail-closed)', async () => {
    expect(await hasPodcastPremiumAccess(clientReturning(null, { message: 'boom' }), 'u1')).toBe(false)
  })
  it('réponse non booléenne → false', async () => {
    expect(await hasPodcastPremiumAccess(clientReturning('yes'), 'u1')).toBe(false)
  })
  it('exception RPC → false (fail-closed)', async () => {
    const client = { rpc: async () => { throw new Error('network') } }
    expect(await hasPodcastPremiumAccess(client, 'u1')).toBe(false)
  })
  it('clé canonique exposée', () => {
    expect(PODCAST_PREMIUM_ENTITLEMENT_KEY).toBe('podcast_premium')
  })
})
