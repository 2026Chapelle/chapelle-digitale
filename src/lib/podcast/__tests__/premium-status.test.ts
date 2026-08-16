import { describe, it, expect, vi } from 'vitest'
import { computeMyPremiumStatus, fetchMyPremiumStatus } from '../premium-status'
import type { EntitlementRow } from '../entitlement'

const NOW = Date.parse('2026-08-13T12:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()
const row = (p: Partial<EntitlementRow>): EntitlementRow => ({ starts_at: iso(NOW - 86400000), expires_at: null, revoked_at: null, ...p })

describe('computeMyPremiumStatus (pur)', () => {
  it('aucune ligne → neutre (jamais eu)', () => {
    expect(computeMyPremiumStatus([], NOW)).toEqual({ active: false, hadAny: false, activeExpiresAt: null })
    expect(computeMyPremiumStatus(null, NOW)).toEqual({ active: false, hadAny: false, activeExpiresAt: null })
  })
  it('droit à vie actif → active, sans date', () => {
    expect(computeMyPremiumStatus([row({})], NOW)).toEqual({ active: true, hadAny: true, activeExpiresAt: null })
  })
  it('uniquement expiré → hadAny mais inactif (copie « n’est plus actif »)', () => {
    expect(computeMyPremiumStatus([row({ expires_at: iso(NOW - 1000) })], NOW)).toEqual({ active: false, hadAny: true, activeExpiresAt: null })
  })
  it('uniquement révoqué → hadAny mais inactif', () => {
    expect(computeMyPremiumStatus([row({ revoked_at: iso(NOW - 1000) })], NOW)).toEqual({ active: false, hadAny: true, activeExpiresAt: null })
  })
  it('droit borné actif → expose la date la plus lointaine', () => {
    const s = computeMyPremiumStatus([row({ expires_at: iso(NOW + 1000) }), row({ expires_at: iso(NOW + 5000) })], NOW)
    expect(s.active).toBe(true)
    expect(s.activeExpiresAt).toBe(iso(NOW + 5000))
  })
  it('à vie prime sur borné → aucune date', () => {
    const s = computeMyPremiumStatus([row({ expires_at: iso(NOW + 5000) }), row({ expires_at: null })], NOW)
    expect(s.active).toBe(true)
    expect(s.activeExpiresAt).toBeNull()
  })
})

describe('fetchMyPremiumStatus (RLS select-own, fail-safe)', () => {
  const client = (data: unknown, error: unknown = null) => ({
    from: () => ({ select: () => ({ eq: () => Promise.resolve({ data, error }) }) }),
  })
  it('lit ses droits et calcule active', async () => {
    const s = await fetchMyPremiumStatus(client([row({})]), NOW)
    expect(s.active).toBe(true)
  })
  it('erreur → état neutre', async () => {
    expect(await fetchMyPremiumStatus(client(null, { message: 'x' }), NOW)).toEqual({ active: false, hadAny: false, activeExpiresAt: null })
  })
  it('exception → état neutre', async () => {
    const bad = { from: () => { throw new Error('boom') } }
    expect(await fetchMyPremiumStatus(bad as any, NOW)).toEqual({ active: false, hadAny: false, activeExpiresAt: null })
  })
})
