import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ publicReads: [] as string[] }))

function q(result: unknown) {
  const c: any = {}
  for (const k of ['select', 'eq', 'gte', 'order', 'limit', 'in']) c[k] = () => c
  c.then = (r: any, j: any) => Promise.resolve(result).then(r, j)
  return c
}

vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    schema: () => ({
      rpc: async () => ({
        error: null,
        data: { visiteurs_today: 0, visiteurs_semaine: 0, visiteurs_periode: 0, inscriptions: 4, nouveaux_membres: 1, tendance: [], top_pages: [], pays: [], clics: [] },
      }),
      from: () => q({ data: [], error: null }),
    }),
    from: (table: string) => {
      m.publicReads.push(table)
      const now = new Date().toISOString()
      if (table === 'analytics_events') return q({ error: null, data: [
        { type: 'pageview', session_key: 'a', path: '/', created_at: now },
        { type: 'pageview', session_key: 'b', path: '/live', created_at: now },
      ] })
      return q({ error: null, data: [{ session_key: 'a', pays: 'CD', last_seen: now }, { session_key: 'b', pays: null, last_seen: now }] })
    },
  },
}))

import { liveDashboard } from './admin-live'

describe('liveDashboard — trafic canonique', () => {
  beforeEach(() => { m.publicReads = [] })
  afterEach(() => { delete process.env.INTEL_CANONICAL_DASHBOARD })

  it('flag coupé : comportement inchangé, aucune lecture de public.analytics_*', async () => {
    const d = (await liveDashboard('7d'))!
    expect(d.visiteursPeriode.value).toBe(0)
    expect(d.inscriptions.value).toBe(4)
    expect(m.publicReads).not.toContain('analytics_events')
  })

  it('flag actif : visiteurs depuis public.analytics_*, inscriptions inchangées', async () => {
    process.env.INTEL_CANONICAL_DASHBOARD = '1'
    const d = (await liveDashboard('7d'))!
    expect(d.visiteursAujourdhui.value).toBe(2)
    expect(d.visiteursPeriode.value).toBe(2)
    expect(d.inscriptions.value).toBe(4)
    expect(d.tauxConversion.value).toBe(50)
    expect(d.paysVisiteurs.map((p) => p.pays)).toEqual(expect.arrayContaining(['CD', 'Inconnu']))
  })
})
