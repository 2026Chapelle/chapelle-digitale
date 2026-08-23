import { describe, it, expect } from 'vitest'
import {
  formatMetric,
  count,
  percent01,
  position,
  currency_xof,
  seconds,
  minutes,
} from '../format'
import { NO_VALUE_PLACEHOLDER, type MetricAvailability } from '../availability'

const DASH = NO_VALUE_PLACEHOLDER // « — »

describe('formatMetric — règle canonique de disponibilité', () => {
  it('real 0 → « 0 » (0 réel n\'est jamais masqué)', () => {
    expect(formatMetric(0, 'real', 'count')).toBe('0')
  })

  it('real 1234 → « 1 234 » (groupement FR)', () => {
    // espace insécable comme séparateur de milliers
    expect(formatMetric(1234, 'real', 'count')).toBe('1 234')
  })

  it('no_data → « — » même si une valeur est fournie', () => {
    expect(formatMetric(0, 'no_data', 'count')).toBe(DASH)
    expect(formatMetric(42, 'no_data', 'count')).toBe(DASH)
  })

  it('unavailable → « — »', () => {
    expect(formatMetric(0, 'unavailable', 'count')).toBe(DASH)
    expect(formatMetric(99, 'unavailable', 'count')).toBe(DASH)
  })

  it('not_applicable → « — »', () => {
    expect(formatMetric(0, 'not_applicable', 'count')).toBe(DASH)
    expect(formatMetric(7, 'not_applicable', 'percent01')).toBe(DASH)
  })

  it('demo → « — » (jamais confondu avec du réel)', () => {
    expect(formatMetric(0, 'demo', 'count')).toBe(DASH)
    expect(formatMetric(123, 'demo', 'currency_xof')).toBe(DASH)
  })

  it('real mais valeur null/undefined/NaN → « — » (on n\'invente pas un 0)', () => {
    expect(formatMetric(null, 'real', 'count')).toBe(DASH)
    expect(formatMetric(undefined, 'real', 'count')).toBe(DASH)
    expect(formatMetric(Number.NaN, 'real', 'count')).toBe(DASH)
  })

  it('toutes les disponibilités non-real renvoient « — »', () => {
    const nonReal: MetricAvailability[] = ['no_data', 'unavailable', 'not_applicable', 'demo']
    for (const a of nonReal) {
      expect(formatMetric(1000, a, 'count')).toBe(DASH)
    }
  })
})

describe('formatMetric — formatage par unité (uniquement si real)', () => {
  it('percent01 : ratio 0..1 → « 12.34 % »', () => {
    expect(formatMetric(0.1234, 'real', 'percent01')).toBe('12.34 %')
    expect(formatMetric(0, 'real', 'percent01')).toBe('0.00 %')
    expect(formatMetric(1, 'real', 'percent01')).toBe('100.00 %')
  })

  it('position : une décimale → « 3.2 »', () => {
    expect(formatMetric(3.2, 'real', 'position')).toBe('3.2')
    expect(formatMetric(3.25, 'real', 'position')).toBe('3.3')
    expect(formatMetric(0, 'real', 'position')).toBe('0.0')
  })

  it('count : groupement FR', () => {
    expect(formatMetric(0, 'real', 'count')).toBe('0')
    expect(formatMetric(1234567, 'real', 'count')).toBe('1 234 567')
  })

  it('currency_xof : montant FCFA sans centimes', () => {
    expect(formatMetric(1234, 'real', 'currency_xof')).toBe('1 234 FCFA')
    expect(formatMetric(0, 'real', 'currency_xof')).toBe('0 FCFA')
  })

  it('seconds : m:ss', () => {
    expect(formatMetric(83, 'real', 'seconds')).toBe('1:23')
    expect(formatMetric(5, 'real', 'seconds')).toBe('0:05')
    expect(formatMetric(0, 'real', 'seconds')).toBe('0:00')
  })

  it('minutes : « 12 h 34 min » / « 34 min »', () => {
    expect(formatMetric(754, 'real', 'minutes')).toBe('12 h 34 min')
    expect(formatMetric(34, 'real', 'minutes')).toBe('34 min')
    expect(formatMetric(0, 'real', 'minutes')).toBe('0 min')
  })

  it('unité par défaut = count', () => {
    expect(formatMetric(1000, 'real')).toBe('1 000')
  })
})

describe('helpers purs exportés', () => {
  it('count', () => {
    expect(count(0)).toBe('0')
    expect(count(12345)).toBe('12 345')
  })
  it('percent01', () => {
    expect(percent01(0.5)).toBe('50.00 %')
  })
  it('position', () => {
    expect(position(7.89)).toBe('7.9')
  })
  it('currency_xof', () => {
    expect(currency_xof(5000)).toBe('5 000 FCFA')
  })
  it('seconds', () => {
    expect(seconds(125)).toBe('2:05')
  })
  it('minutes', () => {
    expect(minutes(90)).toBe('1 h 30 min')
  })
})
