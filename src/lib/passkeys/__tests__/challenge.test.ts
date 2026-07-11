import { describe, it, expect } from 'vitest'
import {
  challengeExpiresAtMs,
  isChallengeExpired,
  isChallengeConsumed,
  validateChallenge,
} from '../challenge'
import { CHALLENGE_TTL_MS } from '../config'

const NOW = 1_000_000

describe('challenge — expiration', () => {
  it('calcule expiresAt = now + TTL (≤ 2 min)', () => {
    expect(challengeExpiresAtMs(NOW)).toBe(NOW + CHALLENGE_TTL_MS)
    expect(CHALLENGE_TTL_MS).toBeLessThanOrEqual(2 * 60 * 1000)
  })
  it('non expiré dans la fenêtre, expiré à la borne et au-delà', () => {
    const exp = challengeExpiresAtMs(NOW)
    expect(isChallengeExpired(exp, NOW)).toBe(false)
    expect(isChallengeExpired(exp, exp - 1)).toBe(false)
    expect(isChallengeExpired(exp, exp)).toBe(true) // borne incluse = expiré
    expect(isChallengeExpired(exp, exp + 1)).toBe(true)
  })
})

describe('challenge — consommation (anti-rejeu)', () => {
  it('détecte un challenge consommé', () => {
    expect(isChallengeConsumed(null)).toBe(false)
    expect(isChallengeConsumed(undefined)).toBe(false)
    expect(isChallengeConsumed(NOW)).toBe(true)
    expect(isChallengeConsumed(0)).toBe(true)
  })
})

describe('validateChallenge', () => {
  const base = {
    ceremony: 'registration' as const,
    expectedCeremony: 'registration' as const,
    expiresAtMs: NOW + CHALLENGE_TTL_MS,
    consumedAt: null as number | null,
    nowMs: NOW,
  }
  it('OK pour un challenge frais, non consommé, bon type', () => {
    expect(validateChallenge(base)).toEqual({ ok: true })
  })
  it('rejette un challenge déjà consommé (priorité rejeu)', () => {
    expect(validateChallenge({ ...base, consumedAt: NOW })).toEqual({ ok: false, reason: 'consumed' })
  })
  it('rejette un mauvais type de cérémonie', () => {
    expect(validateChallenge({ ...base, expectedCeremony: 'authentication' })).toEqual({ ok: false, reason: 'wrong_ceremony' })
  })
  it('rejette un challenge expiré', () => {
    expect(validateChallenge({ ...base, nowMs: base.expiresAtMs })).toEqual({ ok: false, reason: 'expired' })
  })
})
