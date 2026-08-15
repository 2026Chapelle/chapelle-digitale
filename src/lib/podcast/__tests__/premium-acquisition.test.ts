import { describe, it, expect, vi } from 'vitest'
import {
  entitlementKeyForProduct,
  computeExpiresAt,
  grantEntitlementFromPurchase,
  revokeEntitlementForSource,
  grantEntitlementByAdmin,
  revokeEntitlementForUser,
  getEntitlementStatus,
  PODCAST_PREMIUM_ENTITLEMENT_KEY,
  type WriteClient,
} from '../premium-acquisition'

const NOW = Date.parse('2026-08-13T12:00:00.000Z')

/** Chaîne thenable : tout `.eq()/.is()/.order()` renvoie le même proxy ; `await` → result. */
function chain(result: unknown): any {
  const p = Promise.resolve(result)
  const proxy: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return p.then.bind(p)
        if (prop === 'catch') return (p as any).catch.bind(p)
        if (prop === 'finally') return (p as any).finally.bind(p)
        return () => proxy
      },
    },
  )
  return proxy
}

interface StubOpts {
  insertResult?: { error: { code?: string; message?: string } | null }
  updateResult?: { error: { message?: string } | null }
  selectResult?: { data: unknown; error: unknown }
}

function stub(opts: StubOpts = {}) {
  const inserts: any[] = []
  const insert = vi.fn(async (row: any) => { inserts.push(row); return opts.insertResult ?? { error: null } })
  const update = vi.fn(() => chain(opts.updateResult ?? { error: null }))
  const select = vi.fn(() => chain(opts.selectResult ?? { data: [], error: null }))
  const client: WriteClient = { from: vi.fn(() => ({ insert, update, select })) }
  return { client, inserts, insert, update, select }
}

describe('entitlementKeyForProduct (pur)', () => {
  it('clé présente → renvoyée (trim)', () => {
    expect(entitlementKeyForProduct({ entitlement_key: ' podcast_premium ' })).toBe('podcast_premium')
  })
  it('produit ordinaire (clé absente/vide) → null (aucun droit)', () => {
    expect(entitlementKeyForProduct({ entitlement_key: null })).toBeNull()
    expect(entitlementKeyForProduct({ entitlement_key: '' })).toBeNull()
    expect(entitlementKeyForProduct({})).toBeNull()
    expect(entitlementKeyForProduct(null)).toBeNull()
  })
})

describe('computeExpiresAt (pur, ne fabrique jamais de durée)', () => {
  it('durée nulle → à vie (null)', () => {
    expect(computeExpiresAt(null, NOW)).toBeNull()
    expect(computeExpiresAt(undefined, NOW)).toBeNull()
  })
  it('durée <= 0 ou non finie → à vie (null, jamais un droit déjà expiré)', () => {
    expect(computeExpiresAt(0, NOW)).toBeNull()
    expect(computeExpiresAt(-5, NOW)).toBeNull()
    expect(computeExpiresAt(Number.NaN, NOW)).toBeNull()
  })
  it('durée positive → now + jours', () => {
    expect(computeExpiresAt(30, NOW)).toBe(new Date(NOW + 30 * 86400000).toISOString())
  })
})

describe('grantEntitlementFromPurchase (achat → droit, idempotent)', () => {
  it('achat valide (produit à vie) → octroi source_type=purchase, expires null', async () => {
    const { client, inserts } = stub()
    const res = await grantEntitlementFromPurchase(client, {
      userId: 'u1', entitlementKey: PODCAST_PREMIUM_ENTITLEMENT_KEY, sourceId: 'purch-1', nowMs: NOW,
    })
    expect(res).toEqual({ granted: true, idempotent: false })
    expect(inserts[0]).toMatchObject({
      user_id: 'u1', entitlement_key: 'podcast_premium', source_type: 'purchase', source_id: 'purch-1', expires_at: null,
    })
  })
  it('produit à durée limitée → expires_at mappé', async () => {
    const { client, inserts } = stub()
    await grantEntitlementFromPurchase(client, {
      userId: 'u1', entitlementKey: 'podcast_premium', sourceId: 'p2', durationDays: 30, nowMs: NOW,
    })
    expect(inserts[0].expires_at).toBe(new Date(NOW + 30 * 86400000).toISOString())
  })
  it('rejeu du MÊME achat (conflit 23505) → idempotent, aucun doublon', async () => {
    const { client } = stub({ insertResult: { error: { code: '23505' } } })
    const res = await grantEntitlementFromPurchase(client, {
      userId: 'u1', entitlementKey: 'podcast_premium', sourceId: 'p1', nowMs: NOW,
    })
    expect(res).toEqual({ granted: false, idempotent: true })
  })
  it('entrée invalide (sans user/source) → pas d’octroi', async () => {
    const { client, insert } = stub()
    expect(await grantEntitlementFromPurchase(client, { userId: '', entitlementKey: 'podcast_premium', sourceId: 'p' })).toMatchObject({ granted: false })
    expect(insert).not.toHaveBeenCalled()
  })
  it('erreur DB non-23505 → error remontée, non octroyé', async () => {
    const { client } = stub({ insertResult: { error: { code: 'XX000', message: 'boom' } } })
    const res = await grantEntitlementFromPurchase(client, { userId: 'u1', entitlementKey: 'podcast_premium', sourceId: 'p', nowMs: NOW })
    expect(res.granted).toBe(false)
    expect(res.error).toBe('boom')
  })
})

describe('revokeEntitlementForSource (remboursement/annulation — primitive prête)', () => {
  it('révoque le droit lié à l’achat (pose revoked_at, ne supprime pas)', async () => {
    const { client, update } = stub()
    const res = await revokeEntitlementForSource(client, { entitlementKey: 'podcast_premium', sourceId: 'p1', nowMs: NOW })
    expect(res.revoked).toBe(true)
    expect(update).toHaveBeenCalledWith({ revoked_at: new Date(NOW).toISOString() })
  })
  it('erreur update → revoked false', async () => {
    const { client } = stub({ updateResult: { error: { message: 'db' } } })
    expect(await revokeEntitlementForSource(client, { entitlementKey: 'podcast_premium', sourceId: 'p1' })).toMatchObject({ revoked: false })
  })
})

describe('grantEntitlementByAdmin / revokeEntitlementForUser', () => {
  it('octroi admin → source_type=admin, note + expiration facultatives', async () => {
    const { client, inserts } = stub()
    const res = await grantEntitlementByAdmin(client, {
      userId: 'u1', entitlementKey: 'podcast_premium', expiresAt: '2027-01-01T00:00:00.000Z', note: 'VIP', nowMs: NOW,
    })
    expect(res.granted).toBe(true)
    expect(inserts[0]).toMatchObject({ source_type: 'admin', expires_at: '2027-01-01T00:00:00.000Z', note: 'VIP' })
  })
  it('octroi admin sur droit à vie déjà actif (23505) → idempotent', async () => {
    const { client } = stub({ insertResult: { error: { code: '23505' } } })
    expect(await grantEntitlementByAdmin(client, { userId: 'u1', entitlementKey: 'podcast_premium' })).toMatchObject({ idempotent: true })
  })
  it('révocation admin → pose revoked_at', async () => {
    const { client, update } = stub()
    expect(await revokeEntitlementForUser(client, { userId: 'u1', entitlementKey: 'podcast_premium', nowMs: NOW })).toMatchObject({ revoked: true })
    expect(update).toHaveBeenCalledWith({ revoked_at: new Date(NOW).toISOString() })
  })
})

describe('getEntitlementStatus (miroir de la règle d’activité)', () => {
  it('droit à vie non révoqué → active', async () => {
    const rows = [{ starts_at: new Date(NOW - 86400000).toISOString(), expires_at: null, revoked_at: null, source_type: 'admin' }]
    const { client } = stub({ selectResult: { data: rows, error: null } })
    const s = await getEntitlementStatus(client, 'u1', 'podcast_premium', NOW)
    expect(s.active).toBe(true)
    expect(s.rows).toHaveLength(1)
  })
  it('uniquement un droit révoqué → inactif', async () => {
    const rows = [{ starts_at: new Date(NOW - 86400000).toISOString(), expires_at: null, revoked_at: new Date(NOW - 1000).toISOString() }]
    const { client } = stub({ selectResult: { data: rows, error: null } })
    expect((await getEntitlementStatus(client, 'u1', 'podcast_premium', NOW)).active).toBe(false)
  })
  it('erreur select → inactif, rows vide', async () => {
    const { client } = stub({ selectResult: { data: null, error: { message: 'x' } } })
    expect(await getEntitlementStatus(client, 'u1', 'podcast_premium', NOW)).toEqual({ active: false, rows: [] })
  })
})
