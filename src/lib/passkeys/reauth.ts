/**
 * Fraîcheur de réauthentification — VÉRIFIABLE CÔTÉ SERVEUR (PUR).
 *
 * `lastSignInAtMs` provient de GoTrue `last_sign_in_at` (mis à jour à chaque
 * connexion EXPLICITE par mot de passe), lu via `auth.getUser()` côté serveur —
 * jamais d'un état React, du navigateur, ni de l'ancienneté déclarative du cookie.
 */
import { REAUTH_MAX_AGE_MS } from './config'

export function isReauthFresh(
  lastSignInAtMs: number | null | undefined,
  nowMs: number,
  maxAgeMs: number = REAUTH_MAX_AGE_MS,
): boolean {
  if (lastSignInAtMs === null || lastSignInAtMs === undefined) return false
  if (lastSignInAtMs > nowMs) return true // léger décalage d'horloge toléré
  return nowMs - lastSignInAtMs <= maxAgeMs
}
