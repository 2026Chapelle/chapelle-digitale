import { describe, expect, it } from 'vitest'
import { canonicalDashboardEnabled, computeCanonicalTraffic, fetchCanonicalTraffic, rangeStart } from './canonical-traffic'

const NOW = new Date('2026-11-20T15:30:00Z')
const iso = (s: string) => new Date(s).toISOString()

describe('flag INTEL_CANONICAL_DASHBOARD', () => {
  it('est désactivé par défaut', () => {
    expect(canonicalDashboardEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false)
    expect(canonicalDashboardEnabled({ INTEL_CANONICAL_DASHBOARD: '0' } as unknown as NodeJS.ProcessEnv)).toBe(false)
    expect(canonicalDashboardEnabled({ INTEL_CANONICAL_DASHBOARD: '1' } as unknown as NodeJS.ProcessEnv)).toBe(true)
  })
})

describe('rangeStart — même sémantique que chapelle.admin_dashboard', () => {
  it('today = minuit UTC, 7d = J-6, 30d = J-29', () => {
    expect(rangeStart('today', NOW).toISOString()).toBe('2026-11-20T00:00:00.000Z')
    expect(rangeStart('7d', NOW).toISOString()).toBe('2026-11-14T15:30:00.000Z')
    expect(rangeStart('30d', NOW).toISOString()).toBe('2026-10-22T15:30:00.000Z')
  })
})

describe('computeCanonicalTraffic — public.analytics_*', () => {
  const events = [
    { type: 'pageview', session_key: 'a', path: '/', created_at: iso('2026-11-20T10:00:00Z') },
    { type: 'pageview', session_key: 'a', path: '/live', created_at: iso('2026-11-20T10:01:00Z') },
    { type: 'pageview', session_key: 'b', path: '/', created_at: iso('2026-11-19T09:00:00Z') },
    { type: 'pageview', session_key: 'c', path: '/', created_at: iso('2026-11-10T09:00:00Z') }, // hors 7d, dans la semaine ? non (J-10)
    { type: 'click', session_key: 'a', path: '/', created_at: iso('2026-11-20T10:02:00Z') },
    { type: 'conversion', session_key: 'srv:signup:u1', path: '/bienvenue', created_at: iso('2026-11-20T10:03:00Z') },
  ]
  const sessions = [
    { session_key: 'a', pays: 'CD', first_seen: iso('2026-11-20T10:00:00Z'), last_seen: iso('2026-11-20T10:05:00Z') },
    { session_key: 'b', pays: null, first_seen: iso('2026-11-19T09:00:00Z'), last_seen: iso('2026-11-19T09:05:00Z') },
    { session_key: 'c', pays: 'FR', first_seen: iso('2026-11-10T09:00:00Z'), last_seen: iso('2026-11-10T09:05:00Z') },
  ]

  it('compte des visiteurs distincts (sessions avec pageview), jamais les sessions serveur', () => {
    const t = computeCanonicalTraffic({ range: '7d', now: NOW, sessions, events })
    expect(t.visiteursToday).toBe(1)
    expect(t.visiteursSemaine).toBe(2)
    expect(t.visiteursPeriode).toBe(2)
  })

  it('classe les pages par vues et les pays par visiteurs (Inconnu si absent)', () => {
    const t = computeCanonicalTraffic({ range: '30d', now: NOW, sessions, events })
    expect(t.topPages[0]).toEqual({ path: '/', views: 3 })
    expect(t.pays).toEqual(expect.arrayContaining([{ pays: 'CD', visiteurs: 1 }, { pays: 'FR', visiteurs: 1 }, { pays: 'Inconnu', visiteurs: 1 }]))
  })

  it('produit une tendance journalière bornée à la période', () => {
    const t = computeCanonicalTraffic({ range: '7d', now: NOW, sessions, events })
    expect(t.tendance).toHaveLength(7)
    expect(t.tendance.at(-1)).toEqual({ label: '20/11', visiteurs: 1 })
    expect(t.tendance.at(-2)).toEqual({ label: '19/11', visiteurs: 1 })
  })

  it('tendance horaire pour today', () => {
    const t = computeCanonicalTraffic({ range: 'today', now: NOW, sessions, events })
    expect(t.tendance).toHaveLength(16)
    expect(t.tendance[10]).toEqual({ label: '10h', visiteurs: 1 })
  })
})

describe('clics CTA canoniques — anti-doublons de catégorie et sécurité', () => {
  it('compte les vraies actions et ignore les faux clics, les événements serveur et les anciennes périodes', () => {
    const events = [
      { type: 'pageview', session_key: 's1', path: '/', created_at: iso('2026-11-20T11:00:00Z') },
      { type: 'click', session_key: 's1', category: 'inscription', label: 'Rejoindre', created_at: iso('2026-11-20T11:01:00Z') },
      { type: 'click', session_key: 's1', category: 'inscription', label: 'Rejoindre', created_at: iso('2026-11-20T11:02:00Z') },
      { type: 'click', session_key: 's2', category: 'don', label: 'Offrir', created_at: iso('2026-11-20T11:03:00Z') },
      { type: 'click', session_key: 's2', category: 'don', label: '', created_at: iso('2026-11-20T11:04:00Z') },
      { type: 'click', session_key: 'srv:fake', category: 'don', label: 'Piratage', created_at: iso('2026-11-20T11:05:00Z') },
      { type: 'conversion', session_key: 'srv:signup:1', category: 'inscription', label: 'Rejoindre', created_at: iso('2026-11-20T11:05:00Z') },
      { type: 'click', session_key: 's3', category: 'don', label: 'Ancien', created_at: iso('2026-10-01T11:05:00Z') },
    ]
    const t = computeCanonicalTraffic({ range: 'today', now: NOW, sessions: [], events })
    expect(t.clicsBoutons).toEqual([
      { label: 'Rejoindre', clicks: 2 },
      { label: 'Offrir', clicks: 1 },
    ])
    expect(t.visiteursToday).toBe(1)
  })

  it('désambiguïse les boutons ayant le même libellé dans des catégories différentes', () => {
    const events = [
      { type: 'click', session_key: 's1', category: 'inscription', label: 'Continuer', created_at: iso('2026-11-20T11:01:00Z') },
      { type: 'click', session_key: 's1', category: 'don', label: 'Continuer', created_at: iso('2026-11-20T11:02:00Z') },
    ]
    const t = computeCanonicalTraffic({ range: 'today', now: NOW, sessions: [], events })
    expect(t.clicsBoutons.map((c) => c.label).sort()).toEqual(['Continuer (don)', 'Continuer (inscription)'])
  })

  it('n’échoue pas sur les visiteurs lorsque la requête des clics est indisponible', async () => {
    const client = {
      from: (table: string) => {
        let type = ''
        const q: any = {
          select: () => q,
          eq: (_col: string, value: string) => { type = value; return q },
          gte: () => q,
          order: () => q,
          limit: async () => {
            if (table === 'analytics_sessions') return { data: [], error: null }
            if (type === 'click') return { data: null, error: { message: 'read blocked' } }
            return {
              data: [{ type: 'pageview', session_key: 's1', path: '/', created_at: iso('2026-11-20T10:00:00Z') }],
              error: null,
            }
          },
        }
        return q
      },
    }
    const t = await fetchCanonicalTraffic(client, 'today', NOW)
    expect(t.visiteursToday).toBe(1)
    expect(t.clicksAvailable).toBe(false)
    expect(t.clicsBoutons).toEqual([])
  })

  it('préserve aussi les visiteurs si la requête clics rejette une exception réseau', async () => {
    const client = {
      from: (table: string) => {
        let eventType = ''
        const q: any = {
          select: () => q,
          eq: (_col: string, value: string) => { eventType = value; return q },
          gte: () => q,
          order: () => q,
          limit: async () => {
            if (table === 'analytics_sessions') return { data: [], error: null }
            if (eventType === 'click') throw new Error('réseau indisponible')
            return { data: [{ type: 'pageview', session_key: 's1', path: '/', created_at: iso('2026-11-20T10:00:00Z') }], error: null }
          },
        }
        return q
      },
    }
    const t = await fetchCanonicalTraffic(client, 'today', NOW)
    expect(t.visiteursToday).toBe(1)
    expect(t.clicksAvailable).toBe(false)
  })
})
