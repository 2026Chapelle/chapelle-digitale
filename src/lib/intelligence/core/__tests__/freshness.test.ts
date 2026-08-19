import { describe, it, expect } from 'vitest'
import {
  combineFreshness,
  isRealtime,
  isStale,
  stalenessMs,
  worstFreshness,
} from '../freshness'
import { FRESHNESS_LEVELS } from '../../types/freshness'

const T0 = Date.parse('2026-08-19T12:00:00.000Z')

describe('freshness helpers (purs)', () => {
  it('stalenessMs mesure l’âge et borne à 0', () => {
    expect(stalenessMs('2026-08-19T11:59:00.000Z', T0)).toBe(60_000)
    // mesure "dans le futur" ⇒ 0, jamais négatif
    expect(stalenessMs('2026-08-19T12:01:00.000Z', T0)).toBe(0)
  })

  it('stalenessMs renvoie Infinity sur date invalide', () => {
    expect(stalenessMs('pas-une-date', T0)).toBe(Number.POSITIVE_INFINITY)
  })

  it('isStale respecte la fenêtre par niveau', () => {
    // REALTIME toléré 60s : 30s ⇒ frais, 90s ⇒ périmé
    expect(isStale('REALTIME', '2026-08-19T11:59:30.000Z', T0)).toBe(false)
    expect(isStale('REALTIME', '2026-08-19T11:58:30.000Z', T0)).toBe(true)
    // SEO_DELAYED toléré 4j : 3j ⇒ frais
    expect(isStale('SEO_DELAYED', '2026-08-16T12:00:00.000Z', T0)).toBe(false)
  })

  it('isRealtime uniquement pour REALTIME', () => {
    expect(isRealtime('REALTIME')).toBe(true)
    for (const f of FRESHNESS_LEVELS.filter((x) => x !== 'REALTIME')) {
      expect(isRealtime(f)).toBe(false)
    }
  })

  it('worstFreshness renvoie le plus retardé', () => {
    expect(worstFreshness('REALTIME', 'SEO_DELAYED')).toBe('SEO_DELAYED')
    expect(worstFreshness('SYNCED', 'NEAR_REALTIME')).toBe('SYNCED')
    expect(worstFreshness('REALTIME', 'REALTIME')).toBe('REALTIME')
  })

  it('combineFreshness réduit au pire ; vide ⇒ REALTIME', () => {
    expect(combineFreshness([])).toBe('REALTIME')
    expect(combineFreshness(['REALTIME', 'NEAR_REALTIME', 'SEO_DELAYED'])).toBe('SEO_DELAYED')
    expect(combineFreshness(['REALTIME', 'NEAR_REALTIME'])).toBe('NEAR_REALTIME')
  })
})
