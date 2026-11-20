import { describe, expect, it } from 'vitest'
import { canonicalDashboardEnabled, computeCanonicalTraffic, rangeStart } from './canonical-traffic'

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
