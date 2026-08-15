import { describe, it, expect } from 'vitest'
import { isReauthFresh } from '../reauth'
import { REAUTH_MAX_AGE_MS } from '../config'

const NOW = 10_000_000

describe('isReauthFresh — fraîcheur serveur', () => {
  it('fraîche dans la fenêtre', () => {
    expect(isReauthFresh(NOW, NOW)).toBe(true)
    expect(isReauthFresh(NOW - REAUTH_MAX_AGE_MS + 1, NOW)).toBe(true)
    expect(isReauthFresh(NOW - REAUTH_MAX_AGE_MS, NOW)).toBe(true) // borne incluse = encore frais
  })
  it('périmée au-delà de la fenêtre', () => {
    expect(isReauthFresh(NOW - REAUTH_MAX_AGE_MS - 1, NOW)).toBe(false)
  })
  it('absence de last_sign_in_at → jamais frais', () => {
    expect(isReauthFresh(null, NOW)).toBe(false)
    expect(isReauthFresh(undefined, NOW)).toBe(false)
  })
  it('tolère un léger décalage d’horloge (sign-in "futur")', () => {
    expect(isReauthFresh(NOW + 1000, NOW)).toBe(true)
  })
  it('respecte une fenêtre custom', () => {
    expect(isReauthFresh(NOW - 2000, NOW, 1000)).toBe(false)
    expect(isReauthFresh(NOW - 500, NOW, 1000)).toBe(true)
  })
})
