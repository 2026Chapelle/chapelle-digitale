/**
 * ADMIN — désignation « L'Instant Citadelle » (aperçu GRATUIT sur l'accueil).
 *
 * Une case unique côté admin (`is_home_instant`) ↔ la destination éditoriale
 * `home_instant` de l'épisode. Lib PURE (aucune I/O) → testable.
 *
 * Règles :
 *   • ne touche JAMAIS `access_level` (métadonnée d'accès inchangée) ;
 *   • ajoute/retire UNIQUEMENT `home_instant`, sans écraser les autres destinations
 *     (catalog / home_premium / featured) ;
 *   • GARDE-FOU : un épisode `premium` ne peut JAMAIS être l'Instant gratuit
 *     (aligné sur le endpoint /api/podcast/home-instant/play, fail-closed serveur).
 *
 * L'UNICITÉ du slot (un seul épisode `home_instant` à la fois — le nouveau remplace
 * l'ancien) est appliquée côté route (DB), car elle porte sur les AUTRES lignes.
 */

export const HOME_INSTANT_DESTINATION = 'home_instant'

export const HOME_INSTANT_PREMIUM_ERROR =
  "Un épisode Premium ne peut pas être « L'Instant Citadelle » gratuit. " +
  "Choisissez un épisode Public ou Membre, ou changez l'accès de cet épisode."

export type HomeInstantToggle =
  | { ok: true; destinations: string[] }
  | { ok: false; error: string }

/** Vrai si l'épisode est actuellement désigné Instant (destination `home_instant`). */
export function isHomeInstantDesignated(destinations: unknown): boolean {
  return Array.isArray(destinations) && destinations.includes(HOME_INSTANT_DESTINATION)
}

/**
 * Applique la case « Instant gratuit » aux destinations, SANS écraser les autres.
 * Refuse (garde-fou) si on active sur un épisode `premium`. Dédoublonne, ordre stable.
 */
export function applyHomeInstantToggle(input: {
  isHomeInstant: boolean
  accessLevel: unknown
  destinations: unknown
}): HomeInstantToggle {
  const isOn = input.isHomeInstant === true
  if (isOn && input.accessLevel === 'premium') {
    return { ok: false, error: HOME_INSTANT_PREMIUM_ERROR }
  }
  const current = Array.isArray(input.destinations)
    ? input.destinations.filter((d): d is string => typeof d === 'string')
    : []
  const without = current.filter((d) => d !== HOME_INSTANT_DESTINATION)
  const next = isOn ? [...without, HOME_INSTANT_DESTINATION] : without
  // Dédoublonnage en préservant l'ordre.
  return { ok: true, destinations: next.filter((d, i) => next.indexOf(d) === i) }
}
