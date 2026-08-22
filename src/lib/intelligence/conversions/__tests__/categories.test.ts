import { describe, it, expect } from 'vitest'
import {
  buildConversionCategories,
  buildConversionStages,
  CATEGORY_DEFS,
  type ConversionCounts,
} from '../categories'
import { buildFunnel } from '../funnel'

const COUNTS: ConversionCounts = {
  pageViews: 1000,
  signups: 12,
  podcastPlays: 40,
  moduleCompletions: 7,
  eventRegistrations: 3,
  prayerRequests: 5,
  donationsConfirmed: 0, // 0 RÉEL (pas indisponible)
}

const OPTS = { period: "Aujourd'hui (UTC)" }

describe('buildConversionCategories', () => {
  it('rend REAL avec la vraie valeur pour les catégories prouvées', () => {
    const cats = buildConversionCategories(COUNTS, OPTS)
    const acq = cats.find((c) => c.key === 'ACQUISITION')!
    expect(acq.availability).toBe('REAL')
    expect(acq.value).toBe(12)
  })

  it('« 0 réel » reste REAL (value 0), PAS indisponible', () => {
    const cats = buildConversionCategories(COUNTS, OPTS)
    const gen = cats.find((c) => c.key === 'GENEROSITE')!
    expect(gen.availability).toBe('REAL')
    expect(gen.value).toBe(0)
    expect(gen.reason).toBeUndefined()
  })

  it('ACCOMPLISSEMENT est toujours UNAVAILABLE avec une raison (jamais 0)', () => {
    const cats = buildConversionCategories(COUNTS, OPTS)
    const acc = cats.find((c) => c.key === 'ACCOMPLISSEMENT')!
    expect(acc.availability).toBe('UNAVAILABLE')
    expect(acc.value).toBeNull()
    expect(acc.reason && acc.reason.length).toBeGreaterThan(10)
  })

  it('mode démo (counts=null) → prouvées en DEMO (value null), indispo restent UNAVAILABLE', () => {
    const cats = buildConversionCategories(null, OPTS)
    const acq = cats.find((c) => c.key === 'ACQUISITION')!
    expect(acq.availability).toBe('DEMO')
    expect(acq.value).toBeNull()
    const acc = cats.find((c) => c.key === 'ACCOMPLISSEMENT')!
    expect(acc.availability).toBe('UNAVAILABLE')
  })

  it('couvre les 7 catégories canoniques', () => {
    const cats = buildConversionCategories(COUNTS, OPTS)
    expect(cats).toHaveLength(7)
    expect(new Set(cats.map((c) => c.key))).toEqual(
      new Set(['ACQUISITION', 'ENGAGEMENT', 'DISCIPULAT', 'ACCOMPLISSEMENT', 'COMMUNAUTE', 'CONTACT', 'GENEROSITE']),
    )
  })

  it('exactement 6 catégories prouvées + 1 indisponible', () => {
    const proven = CATEGORY_DEFS.filter((d) => d.kind === 'proven')
    const unavailable = CATEGORY_DEFS.filter((d) => d.kind === 'unavailable')
    expect(proven).toHaveLength(6)
    expect(unavailable).toHaveLength(1)
  })
})

describe('buildConversionStages + buildFunnel (cohortes réelles)', () => {
  it('toutes les transitions consécutives sortent UNAVAILABLE (cohortes distinctes)', () => {
    const stages = buildConversionStages(COUNTS, OPTS)
    const funnel = buildFunnel(stages)
    expect(funnel.rates.length).toBe(stages.length - 1)
    for (const r of funnel.rates) {
      expect(r.availability).toBe('UNAVAILABLE')
      expect(r.rate).toBeNull()
      expect(r.reason && r.reason.length).toBeGreaterThan(0)
    }
  })

  it('les étapes prouvées sont REAL, complétions/conversions UNAVAILABLE', () => {
    const stages = buildConversionStages(COUNTS, OPTS)
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s]))
    expect(byKey.visites.availability).toBe('REAL')
    expect(byKey.visites.value).toBe(1000)
    expect(byKey.inscriptions.availability).toBe('REAL')
    expect(byKey.completions.availability).toBe('UNAVAILABLE')
    expect(byKey.conversions.availability).toBe('UNAVAILABLE')
  })
})
