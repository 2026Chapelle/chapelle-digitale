/**
 * Validation PURE d'un challenge WebAuthn (aucune I/O — testable en isolation).
 * Le challenge est aléatoire, à usage unique et à TTL court ; la consommation
 * atomique est faite côté store (SQL), ici on valide l'état lu.
 */
import { CHALLENGE_TTL_MS, type Ceremony } from './config'

/** Instant d'expiration d'un challenge créé à `nowMs`. */
export function challengeExpiresAtMs(nowMs: number): number {
  return nowMs + CHALLENGE_TTL_MS
}

/** Le challenge est-il expiré à `nowMs` ? (borne incluse = expiré). */
export function isChallengeExpired(expiresAtMs: number, nowMs: number): boolean {
  return nowMs >= expiresAtMs
}

/** Le challenge a-t-il déjà été consommé ? */
export function isChallengeConsumed(consumedAt: number | null | undefined): boolean {
  return consumedAt !== null && consumedAt !== undefined
}

export type ChallengeValidity =
  | { ok: true }
  | { ok: false; reason: 'consumed' | 'wrong_ceremony' | 'expired' }

/**
 * Valide un challenge lu : non consommé, bon type de cérémonie, non expiré.
 * L'ordre privilégie la détection de rejeu (consumed) puis le type puis le TTL.
 */
export function validateChallenge(input: {
  ceremony: Ceremony
  expectedCeremony: Ceremony
  expiresAtMs: number
  consumedAt: number | null | undefined
  nowMs: number
}): ChallengeValidity {
  if (isChallengeConsumed(input.consumedAt)) return { ok: false, reason: 'consumed' }
  if (input.ceremony !== input.expectedCeremony) return { ok: false, reason: 'wrong_ceremony' }
  if (isChallengeExpired(input.expiresAtMs, input.nowMs)) return { ok: false, reason: 'expired' }
  return { ok: true }
}
