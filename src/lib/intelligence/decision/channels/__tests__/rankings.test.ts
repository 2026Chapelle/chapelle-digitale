/**
 * CITADELLE INTELLIGENCE — 5B · AGENT 3 · Tests des CLASSEMENTS nommés.
 *
 * Gardes prouvées :
 *   CHANNEL_COMPARABILITY — un classement est NON disponible si < 2 canaux
 *                           comparables OU si la métrique est incomparable (taux).
 *   DETERMINISM           — tri valeur décroissante puis libellé (départage stable).
 *   RATE_NEVER_RANKED     — top_signup_rate toujours indisponible (taux non fiable).
 */

import { describe, it, expect } from 'vitest'
import { buildChannelRankings } from '../rankings'
import type { ChannelCitadelleValue, DecisionPeriod, MeasuredValue } from '../../contract'

const PERIOD: DecisionPeriod = {
  label: '28 derniers jours',
  sinceIso: '2026-07-26T00:00:00.000Z',
  untilIso: '2026-08-23T00:00:00.000Z',
}

const real = (value: number): MeasuredValue => ({ value, availability: 'REAL' })
const unavailable = (): MeasuredValue => ({ value: null, availability: 'UNAVAILABLE', reason: 'x' })

function row(
  source: string,
  label: string,
  visits: MeasuredValue,
  parcours: MeasuredValue,
): ChannelCitadelleValue {
  return {
    source,
    label,
    citadelleVisits: visits,
    attributedSignups: real(0),
    visitToSignupRate: { rate: null, availability: 'UNAVAILABLE', reason: 'x', sampleSize: visits.value },
    engagement: real(0),
    parcours,
    conversions: unavailable(),
    confidence: 'HIGH',
  }
}

describe('buildChannelRankings — top_traffic_attributed', () => {
  it('disponible avec ≥ 2 canaux comparables, trié valeur desc puis libellé', () => {
    const citadelle = [
      row('youtube', 'YouTube', real(55), real(3)),
      row('whatsapp', 'WhatsApp', real(120), real(9)),
      row('direct', 'Direct', real(120), real(1)), // égalité 120 avec WhatsApp
    ]
    const r = buildChannelRankings(citadelle, PERIOD).find((x) => x.key === 'top_traffic_attributed')!
    expect(r.available).toBe(true)
    expect(r.rows.map((x) => x.source)).toEqual(['direct', 'whatsapp', 'youtube'])
    // 120 (Direct < WhatsApp par libellé) puis 55.
    expect(r.rows.map((x) => x.value)).toEqual([120, 120, 55])
  })

  it('CHANNEL_COMPARABILITY : < 2 canaux comparables => available=false + raison', () => {
    const citadelle = [row('whatsapp', 'WhatsApp', real(120), real(9))]
    const r = buildChannelRankings(citadelle, PERIOD).find((x) => x.key === 'top_traffic_attributed')!
    expect(r.available).toBe(false)
    expect(r.reason).toMatch(/comparables/i)
    expect(r.rows).toEqual([])
  })

  it('ignore les canaux non-REAL pour le compte de comparabilité', () => {
    const citadelle = [
      row('whatsapp', 'WhatsApp', real(120), real(9)),
      row('meta', 'Meta', unavailable(), unavailable()), // non comparable
    ]
    const r = buildChannelRankings(citadelle, PERIOD).find((x) => x.key === 'top_traffic_attributed')!
    // 1 seul canal REAL => non disponible.
    expect(r.available).toBe(false)
  })

  it('REAL_ZERO comparable : deux canaux à 0 visite restent classables (REAL)', () => {
    const citadelle = [
      row('email', 'E-mail', real(0), real(0)),
      row('direct', 'Direct', real(0), real(0)),
    ]
    const r = buildChannelRankings(citadelle, PERIOD).find((x) => x.key === 'top_traffic_attributed')!
    expect(r.available).toBe(true)
    expect(r.rows.map((x) => x.source)).toEqual(['direct', 'email']) // départage par libellé
  })
})

describe('buildChannelRankings — top_progressions_attributed', () => {
  it('classe par progressions quand ≥ 2 comparables', () => {
    const citadelle = [
      row('youtube', 'YouTube', real(55), real(3)),
      row('whatsapp', 'WhatsApp', real(120), real(9)),
    ]
    const r = buildChannelRankings(citadelle, PERIOD).find(
      (x) => x.key === 'top_progressions_attributed',
    )!
    expect(r.available).toBe(true)
    expect(r.rows.map((x) => x.source)).toEqual(['whatsapp', 'youtube'])
    expect(r.rows.map((x) => x.value)).toEqual([9, 3])
  })
})

describe('buildChannelRankings — top_signup_rate (jamais classé)', () => {
  it('RATE_NEVER_RANKED : toujours available=false, raison cohortes, rows vides', () => {
    const citadelle = [
      row('youtube', 'YouTube', real(55), real(3)),
      row('whatsapp', 'WhatsApp', real(120), real(9)),
    ]
    const r = buildChannelRankings(citadelle, PERIOD).find((x) => x.key === 'top_signup_rate')!
    expect(r.available).toBe(false)
    expect(r.reason).toMatch(/comparable|cohortes/i)
    expect(r.rows).toEqual([])
  })
})

describe('buildChannelRankings — enveloppe', () => {
  it('renvoie exactement les 3 classements nommés dans un ordre stable', () => {
    const r = buildChannelRankings([], PERIOD)
    expect(r.map((x) => x.key)).toEqual([
      'top_traffic_attributed',
      'top_progressions_attributed',
      'top_signup_rate',
    ])
    // Liste vide => aucun classement comparable disponible.
    expect(r.every((x) => x.available === false)).toBe(true)
    expect(r.every((x) => x.period === PERIOD)).toBe(true)
  })
})
