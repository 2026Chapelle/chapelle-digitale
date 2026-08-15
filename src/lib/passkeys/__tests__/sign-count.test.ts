import { describe, it, expect } from 'vitest'
import { isSignCountRegression, nextSignCount } from '../sign-count'

describe('signCount — anti-rejeu / clonage', () => {
  it('nouveau > stocké → pas de régression', () => {
    expect(isSignCountRegression(5, 6)).toBe(false)
    expect(isSignCountRegression(0, 1)).toBe(false)
  })
  it('nouveau <= stocké (et > 0) → régression (clonage possible)', () => {
    expect(isSignCountRegression(5, 5)).toBe(true)
    expect(isSignCountRegression(5, 4)).toBe(true)
  })
  it('nouveau = 0 → jamais une régression (passkey synchronisée / sans compteur)', () => {
    expect(isSignCountRegression(0, 0)).toBe(false)
    expect(isSignCountRegression(42, 0)).toBe(false)
  })
})

describe('nextSignCount', () => {
  it('conserve le maximum (jamais décroissant)', () => {
    expect(nextSignCount(5, 6)).toBe(6)
    expect(nextSignCount(5, 5)).toBe(5)
    expect(nextSignCount(5, 0)).toBe(5) // compteur nul : on garde le stocké
  })
})
