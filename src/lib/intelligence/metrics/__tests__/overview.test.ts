import { describe, it, expect } from 'vitest'
import { buildOverview, OVERVIEW_METRIC_DEFS } from '../overview'
import { validateEnvelope } from '../../core/metric-envelope'
import type { OverviewCounts } from '../../adapters/count-specs'

const NOW = '2026-08-19T18:00:00.000Z'
const COUNTS: OverviewCounts = {
  pageViewsToday: 120,
  activeSessionsNow: 8,
  signupsToday: 3,
  podcastStartsToday: 45,
  lessonCompletionsToday: 6,
}

function byKey(metrics: ReturnType<typeof buildOverview>['metrics'], key: string) {
  const m = metrics.find((x) => x.key === key)
  if (!m) throw new Error(`métrique absente: ${key}`)
  return m
}

describe('buildOverview (pur — réel/démo/indisponible)', () => {
  it('les 7 cartes de la Vue générale sont produites', () => {
    const { metrics } = buildOverview({ counts: COUNTS, nowIso: NOW })
    expect(metrics).toHaveLength(OVERVIEW_METRIC_DEFS.length)
    expect(metrics).toHaveLength(7)
  })

  it('mode réel : les sources portent la vraie valeur, demo=false, enveloppe valide', () => {
    const { demoMode, metrics } = buildOverview({ counts: COUNTS, nowIso: NOW })
    expect(demoMode).toBe(false)
    const pv = byKey(metrics, 'page_views')
    expect(pv.availability).toBe('real')
    expect(pv.envelope?.value).toBe(120)
    expect(pv.envelope?.demo).toBe(false)
    expect(validateEnvelope(pv.envelope!)).toEqual([])
    expect(byKey(metrics, 'active_sessions').envelope?.value).toBe(8)
    expect(byKey(metrics, 'active_sessions').envelope?.freshness).toBe('REALTIME')
    expect(byKey(metrics, 'signups').envelope?.value).toBe(3)
    expect(byKey(metrics, 'podcast_starts').envelope?.value).toBe(45)
    expect(byKey(metrics, 'lesson_completions').envelope?.value).toBe(6)
  })

  it('Connexions et Lectures vidéo sont Indisponibles (jamais un 0 trompeur)', () => {
    const { metrics } = buildOverview({ counts: COUNTS, nowIso: NOW })
    for (const key of ['logins', 'video_starts']) {
      const m = byKey(metrics, key)
      expect(m.availability).toBe('unavailable')
      expect(m.envelope).toBeNull()
      expect((m.reason ?? '').length).toBeGreaterThan(0)
    }
  })

  it('mode démo (counts=null) : sources → démo (demo=true, valeur 0), indispo inchangées', () => {
    const { demoMode, metrics } = buildOverview({ counts: null, nowIso: NOW })
    expect(demoMode).toBe(true)
    const pv = byKey(metrics, 'page_views')
    expect(pv.availability).toBe('demo')
    expect(pv.envelope?.demo).toBe(true)
    expect(pv.envelope?.value).toBe(0)
    // les indisponibles ne deviennent jamais des démos
    expect(byKey(metrics, 'logins').availability).toBe('unavailable')
  })

  it('flag demo=true force le mode démo même avec des counts', () => {
    const { demoMode, metrics } = buildOverview({ counts: COUNTS, nowIso: NOW, demo: true })
    expect(demoMode).toBe(true)
    expect(byKey(metrics, 'page_views').availability).toBe('demo')
  })

  it('aucune dimension ne porte de PII (uniquement window)', () => {
    const { metrics } = buildOverview({ counts: COUNTS, nowIso: NOW })
    for (const m of metrics) {
      if (m.envelope?.dimensions) {
        expect(Object.keys(m.envelope.dimensions)).toEqual(['window'])
      }
    }
  })
})
