import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  inserts: [] as { table: string; row: Record<string, any> }[],
  existing: null as Record<string, unknown> | null,
}))

vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ ok: true }), clientIp: () => '0.0.0.0' }))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: state.existing }) }) }),
      insert: (row: Record<string, any>) => { state.inserts.push({ table, row }); return Promise.resolve({ error: null }) },
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}))

import { POST } from './route'

const post = (body: unknown) =>
  POST({ text: async () => JSON.stringify(body), headers: new Headers({ 'user-agent': 'vitest' }) } as any)

describe('POST /api/analytics/track — intégrité', () => {
  beforeEach(() => { state.inserts = []; state.existing = null })

  it('enregistre un pageview avec les UTM first-touch (non-régression HUB-3)', async () => {
    const res = await post({ session: 'abc', type: 'pageview', path: '/', utm: { source: 'facebook', medium: 'social', campaign: 'Noel' } })
    expect(res.status).toBe(204)
    const sess = state.inserts.find((i) => i.table === 'analytics_sessions')!.row
    expect(sess.utm_medium).toBe('social')
    expect(sess.utm_campaign).toBeTruthy()
    expect(state.inserts.find((i) => i.table === 'analytics_events')!.row.type).toBe('pageview')
  })

  it('conserve un clic CTA comme simple clic', async () => {
    await post({ session: 'abc', type: 'click', category: 'inscription', path: '/rejoindre' })
    const evt = state.inserts.find((i) => i.table === 'analytics_events')!.row
    expect(evt.type).toBe('click')
    expect(evt.category).toBe('inscription')
  })

  it('refuse une clé de session réservée aux événements serveur (srv:)', async () => {
    const res = await post({ session: 'srv:signup:11111111-2222-4333-8444-555555555555', type: 'conversion', category: 'inscription' })
    expect(res.status).toBe(204)
    expect(state.inserts).toHaveLength(0)
  })

  it('retire les marqueurs serveur (origin, idem_key) des métadonnées client', async () => {
    await post({ session: 'abc', type: 'conversion', category: 'inscription', meta: { origin: 'server', idem_key: 'signup:x', step: 2 } })
    const evt = state.inserts.find((i) => i.table === 'analytics_events')!.row
    expect(evt.meta).toEqual({ step: 2 })
  })
})
