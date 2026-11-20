import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Caractérisation des compteurs du tableau analytics interne.
 * Données factices : 3 sessions, des clics CTA « inscription » et 1 profil créé.
 */
const state = vi.hoisted(() => ({
  rows: {} as Record<string, Record<string, unknown>[]>,
  profileCount: 0,
  profileFilters: [] as string[],
}))

vi.mock('@/lib/admin-auth', () => ({ isAdminRequest: () => true }))
vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/cache', () => ({ cached: (_k: string, _t: number, fn: () => unknown) => fn() }))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const filters: string[] = []
      let head = false
      const q: any = {
        select: (_cols: string, opts?: { head?: boolean }) => { head = !!opts?.head; return q },
        eq: (c: string, v: unknown) => { filters.push(`${c}=${v}`); return q },
        gte: (c: string) => { filters.push(`${c}>=`); return q },
        in: () => q,
        order: () => q,
        limit: () => q,
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (table === 'profiles' && head) {
            state.profileFilters.push(...filters)
            return Promise.resolve({ count: state.profileCount, data: null, error: null }).then(res, rej)
          }
          let data = state.rows[table] || []
          const typeEq = filters.find((f) => f.startsWith('type='))
          if (typeEq) data = data.filter((r) => `type=${r.type}` === typeEq)
          return Promise.resolve({ data, error: null }).then(res, rej)
        },
      }
      return q
    },
  },
}))

import { GET } from './route'

const req = (qs = '') => ({ nextUrl: new URL(`http://x/api/admin/analytics${qs}`) }) as any

describe('GET /api/admin/analytics — entonnoir', () => {
  beforeEach(() => {
    state.profileFilters = []
    state.profileCount = 1
    const now = new Date().toISOString()
    state.rows = {
      analytics_sessions: [
        { session_key: 's1', last_seen: now, duration_sec: 10 },
        { session_key: 's2', last_seen: now, duration_sec: 10 },
        { session_key: 's3', last_seen: now, duration_sec: 10 },
      ],
      analytics_events: [
        // 3 sessions ont cliqué un CTA « inscription » : ce sont des intentions, pas des inscriptions.
        { type: 'click', category: 'inscription', session_key: 's1', path: '/rejoindre', created_at: now },
        { type: 'click', category: 'inscription', session_key: 's2', path: '/rejoindre', created_at: now },
        { type: 'click', category: 'inscription', session_key: 's3', path: '/', created_at: now },
        { type: 'click', category: 'don', session_key: 's1', path: '/', created_at: now },
        { type: 'pageview', session_key: 's1', path: '/', created_at: now },
      ],
    }
  })

  it('ne compte plus les clics CTA comme des inscriptions réussies', async () => {
    const body = await (await GET(req())).json()
    const inscription = body.funnel.find((f: any) => f.etape === 'Inscription')
    expect(inscription.n).toBe(1) // 1 profil créé sur la période (source canonique profiles.created_at)
  })

  it('expose les clics CTA séparément comme intentions', async () => {
    const body = await (await GET(req())).json()
    expect(body.kpis.intentions_inscription).toBe(3)
  })

  it('conserve la forme publique de l’entonnoir (4 étapes, mêmes libellés)', async () => {
    const body = await (await GET(req())).json()
    expect(body.funnel.map((f: any) => f.etape)).toEqual(['Visite', 'Inscription', 'Don', 'Formation'])
    expect(body.funnel[0].n).toBe(3)
    expect(body.funnel[2].n).toBe(1)
  })

  it('filtre les inscriptions par période et par pays quand demandé', async () => {
    await GET(req('?range=30d&pays=cd'))
    expect(state.profileFilters).toContain('created_at>=')
    expect(state.profileFilters).toContain('pays=CD')
  })

  it('compte les inscriptions serveur et non le clic quand aucun profil n’est lisible', async () => {
    state.profileCount = null as unknown as number
    const now = new Date().toISOString()
    state.rows.analytics_events.push({
      type: 'conversion', category: 'inscription', session_key: 'srv:signup:u1', path: '/bienvenue', created_at: now,
      meta: { origin: 'server', event: 'signup_complete', idem_key: 'signup:u1' },
    } as any)
    const body = await (await GET(req())).json()
    expect(body.funnel.find((f: any) => f.etape === 'Inscription').n).toBe(1)
    expect(body.funnel[0].n).toBe(3) // une session serveur srv: n’est jamais une visite
  })
})
