import { describe, it, expect } from 'vitest'
import { coerceWeekdays } from '../weekdays'

describe('coerceWeekdays', () => {
  it('convertit des chaînes en entiers 0..6 (champ admin tags)', () => {
    expect(coerceWeekdays(['1', '3', '5'])).toEqual([1, 3, 5])
  })
  it('accepte déjà des nombres', () => {
    expect(coerceWeekdays([0, 6])).toEqual([0, 6])
  })
  it('ignore les valeurs hors domaine (<0 ou >6) et non numériques', () => {
    expect(coerceWeekdays(['-1', '7', '3', 'lundi', ''])).toEqual([3])
  })
  it('déduplique en conservant l’ordre d’apparition', () => {
    expect(coerceWeekdays(['3', '3', '1', '1'])).toEqual([3, 1])
  })
  it('entrée vide / null / non-tableau → []', () => {
    expect(coerceWeekdays([])).toEqual([])
    expect(coerceWeekdays(null)).toEqual([])
    expect(coerceWeekdays(undefined)).toEqual([])
    expect(coerceWeekdays('')).toEqual([])
  })
  it('valeur scalaire unique tolérée', () => {
    expect(coerceWeekdays('2')).toEqual([2])
  })
  it('trim les espaces', () => {
    expect(coerceWeekdays([' 4 ', ' 5'])).toEqual([4, 5])
  })
})
