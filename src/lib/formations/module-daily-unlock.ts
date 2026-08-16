/**
 * DÉBLOCAGE QUOTIDIEN DES MODULES — Option C (logique PURE).
 *
 * Périmètre strict : uniquement les 4 parcours d'intégration listés ci-dessous.
 * Règle métier :
 *  - module courant terminé immédiatement (completed_at réel) ;
 *  - s'il existe un module suivant (prérequis validé), il reste verrouillé
 *    jusqu'au prochain changement de jour (00:00 UTC) ;
 *  - dernier module d'un parcours → aucune attente, parcours terminé tout de suite.
 *
 * `next_available_at` est CALCULÉ à partir de `completed_at` du prédécesseur
 * (aucune colonne SQL, aucune migration). Testable sans réseau/UI.
 */

/** Slugs des formations soumises à la progression quotidienne (Option C). */
export const DAILY_UNLOCK_PARCOURS_SLUGS = [
  'nouveau-croyant',
  'je-decouvre-la-maison',
  'je-stabilise-ma-foi',
  'je-deviens-disciple-actif',
] as const

export type DailyUnlockParcoursSlug = (typeof DAILY_UNLOCK_PARCOURS_SLUGS)[number]

export const DAILY_LOCK_REASON = 'daily' as const

/** Message UX principal (verrou quotidien). */
export const DAILY_LOCK_MESSAGE =
  'Votre prochain module sera disponible demain à 00h00.'

export function isDailyUnlockParcours(slug?: string | null): boolean {
  if (!slug) return false
  return (DAILY_UNLOCK_PARCOURS_SLUGS as readonly string[]).includes(slug)
}

/**
 * Prochain jour civil UTC à 00:00:00.000 après `completedAt`.
 *
 * Exemples (UTC) :
 *  - 2026-07-10 14:35 → 2026-07-11 00:00
 *  - 2026-07-10 23:58 → 2026-07-11 00:00
 */
export function computeNextAvailableAt(completedAt: Date | string): Date {
  const d = typeof completedAt === 'string' ? new Date(completedAt) : completedAt
  if (Number.isNaN(d.getTime())) {
    // Date invalide : ne pas bloquer indéfiniment (fail-open progressif).
    return new Date(0)
  }
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + 1,
    0, 0, 0, 0,
  ))
}

/** Accès autorisé si maintenant >= next_available_at. */
export function isAvailableAt(now: Date | string, nextAvailableAt: Date | string): boolean {
  const n = typeof now === 'string' ? new Date(now) : now
  const a = typeof nextAvailableAt === 'string' ? new Date(nextAvailableAt) : nextAvailableAt
  if (Number.isNaN(n.getTime()) || Number.isNaN(a.getTime())) return true
  return n.getTime() >= a.getTime()
}

/**
 * Compteur pédagogique : "Disponible dans 8h 24min."
 * Retourne null si déjà disponible.
 */
export function formatRemainingUntil(now: Date, nextAvailableAt: Date): string | null {
  const ms = nextAvailableAt.getTime() - now.getTime()
  if (ms <= 0) return null
  const totalMin = Math.max(1, Math.ceil(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) {
    return m <= 1 ? 'Disponible dans moins d\'1 min.' : `Disponible dans ${m} min.`
  }
  return `Disponible dans ${h}h ${String(m).padStart(2, '0')}min.`
}

export interface DailyLockEvaluation {
  /** True si le module suivant est encore verrouillé par la règle quotidienne. */
  locked: boolean
  next_available_at: string | null
  remaining_label: string | null
}

/**
 * Évalue le verrou quotidien pour un module dont le prérequis est déjà validé.
 *
 * - Hors périmètre → jamais verrouillé par cette règle.
 * - Sans `prereqCompletedAt` → pas de verrou daily (géré par le prérequis ailleurs).
 * - Avec prereq validé → locked tant que now < next_available_at.
 */
export function evaluateDailyLock(
  formationSlug: string | null | undefined,
  prereqCompletedAt: string | Date | null | undefined,
  now: Date = new Date(),
): DailyLockEvaluation {
  if (!isDailyUnlockParcours(formationSlug) || !prereqCompletedAt) {
    return { locked: false, next_available_at: null, remaining_label: null }
  }
  const next = computeNextAvailableAt(prereqCompletedAt)
  if (isAvailableAt(now, next)) {
    return { locked: false, next_available_at: next.toISOString(), remaining_label: null }
  }
  return {
    locked: true,
    next_available_at: next.toISOString(),
    remaining_label: formatRemainingUntil(now, next),
  }
}
