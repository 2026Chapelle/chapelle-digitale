import { describe, it, expect } from 'vitest'
import { conversionRate, countUnattributed, tallyBySource } from '../aggregate'

describe('agrégations d’attribution', () => {
  it('tallyBySource compte par source et ignore null', () => {
    const m = tallyBySource(['whatsapp', 'whatsapp', 'direct', null, 'facebook'])
    expect(m.get('whatsapp')).toBe(2)
    expect(m.get('direct')).toBe(1)
    expect(m.get('facebook')).toBe(1)
    expect(Array.from(m.values()).reduce((a, b) => a + b, 0)).toBe(4) // null exclu
  })

  it('countUnattributed compte les null', () => {
    expect(countUnattributed(['whatsapp', null, null, 'direct'])).toBe(2)
    expect(countUnattributed([])).toBe(0)
  })

  it('ZERO_DENOMINATOR_SAFE : taux null si visites=0 (jamais NaN/Infinity/faux 0%)', () => {
    expect(conversionRate(0, 0)).toBeNull()
    expect(conversionRate(5, 0)).toBeNull()
    expect(conversionRate(0, 10)).toBe(0) // vrai 0 %
    expect(conversionRate(3, 12)).toBe(0.25)
  })
})
