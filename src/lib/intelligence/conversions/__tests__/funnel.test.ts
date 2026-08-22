import { describe, it, expect } from 'vitest'
import { buildFunnel, computeStageRate } from '../funnel'
import type { FunnelStage } from '../types'

function stage(over: Partial<FunnelStage>): FunnelStage {
  return {
    key: 'k',
    label: 'L',
    metricKey: 'm',
    value: 0,
    availability: 'REAL',
    cohort: 'new_persons',
    source: 's',
    freshness: 'SYNCED',
    ...over,
  }
}

describe('computeStageRate', () => {
  it('calcule un taux quand les deux étapes sont réelles et de MÊME cohorte', () => {
    const from = stage({ key: 'a', value: 200, cohort: 'new_persons' })
    const to = stage({ key: 'b', value: 50, cohort: 'new_persons' })
    const r = computeStageRate(from, to)
    expect(r.availability).toBe('REAL')
    expect(r.rate).toBeCloseTo(0.25, 10)
    expect(r.reason).toBeUndefined()
  })

  it('marque UNAVAILABLE + raison quand les cohortes sont incompatibles', () => {
    const from = stage({ key: 'a', value: 1000, cohort: 'pageviews', label: 'Visites' })
    const to = stage({ key: 'b', value: 30, cohort: 'new_persons', label: 'Inscriptions' })
    const r = computeStageRate(from, to)
    expect(r.availability).toBe('UNAVAILABLE')
    expect(r.rate).toBeNull()
    expect(r.reason).toMatch(/Cohortes non comparables/)
    expect(r.reason).toContain('Visites')
    expect(r.reason).toContain('Inscriptions')
  })

  it('UNAVAILABLE si l’étape amont n’est pas réelle', () => {
    const from = stage({ key: 'a', value: null, availability: 'UNAVAILABLE', label: 'X' })
    const to = stage({ key: 'b', value: 10 })
    const r = computeStageRate(from, to)
    expect(r.availability).toBe('UNAVAILABLE')
    expect(r.reason).toMatch(/amont/)
  })

  it('UNAVAILABLE si l’étape aval n’est pas réelle', () => {
    const from = stage({ key: 'a', value: 10 })
    const to = stage({ key: 'b', value: null, availability: 'DEMO', label: 'Y' })
    const r = computeStageRate(from, to)
    expect(r.availability).toBe('UNAVAILABLE')
    expect(r.reason).toMatch(/aval/)
  })

  it('UNAVAILABLE si dénominateur nul (jamais NaN/Infinity)', () => {
    const from = stage({ key: 'a', value: 0, cohort: 'plays' })
    const to = stage({ key: 'b', value: 0, cohort: 'plays' })
    const r = computeStageRate(from, to)
    expect(r.availability).toBe('UNAVAILABLE')
    expect(r.rate).toBeNull()
    expect(r.reason).toMatch(/Dénominateur nul/)
  })
})

describe('buildFunnel', () => {
  it('produit exactement N-1 taux pour N étapes', () => {
    const stages = [stage({ key: 'a' }), stage({ key: 'b' }), stage({ key: 'c' })]
    const f = buildFunnel(stages)
    expect(f.stages).toHaveLength(3)
    expect(f.rates).toHaveLength(2)
    expect(f.rates[0]).toMatchObject({ fromKey: 'a', toKey: 'b' })
    expect(f.rates[1]).toMatchObject({ fromKey: 'b', toKey: 'c' })
  })

  it('gère une entrée vide (0 étape → 0 taux)', () => {
    const f = buildFunnel([])
    expect(f.stages).toHaveLength(0)
    expect(f.rates).toHaveLength(0)
  })
})
