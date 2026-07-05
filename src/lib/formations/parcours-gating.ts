/**
 * VERROU INTER-PARCOURS — logique PURE (aucune dépendance réseau/UI).
 *
 * Le Programme d'Intégration enchaîne des formations dans un ordre
 * (P1 → P2 → P3), décrit par la table existante `parcours_formations`.
 * Règle : une formation reste verrouillée tant que celle qui la précède dans
 * la séquence n'est pas TERMINÉE à 100 % par l'utilisateur.
 *
 * Ce module ne fait que calculer le verrou à partir de données déjà chargées
 * (séquence + formations complétées) — la persistance et les requêtes vivent
 * dans la couche API. Testable et réutilisable serveur/client.
 */

export interface ParcoursSequenceItem {
  formationId: string
  ordre: number
}

export type ParcoursLockReason = 'prev_parcours_incomplet'

export interface ParcoursLock {
  /** La formation est-elle accessible (séquence respectée) ? */
  unlocked: boolean
  /** Motif du verrou, sinon null. */
  reason: ParcoursLockReason | null
  /** Formation précédente à terminer d'abord (si verrouillée). */
  previousFormationId: string | null
}

/** Une formation est complétée si elle a au moins un module publié et que tous le sont. */
export function isFormationComplete(totalPublishedModules: number, completedModules: number): boolean {
  return totalPublishedModules > 0 && completedModules >= totalPublishedModules
}

/**
 * Calcule le verrou inter-parcours pour `targetFormationId`.
 *  - Hors de toute séquence, ou première de la séquence → déverrouillée.
 *  - Sinon : déverrouillée seulement si la formation immédiatement précédente
 *    (plus grand `ordre` strictement inférieur) figure dans `completedFormationIds`.
 */
export function computeParcoursLock(
  targetFormationId: string,
  sequence: ParcoursSequenceItem[],
  completedFormationIds: Iterable<string>,
): ParcoursLock {
  const done = completedFormationIds instanceof Set
    ? completedFormationIds
    : new Set(completedFormationIds)

  const target = sequence.find((s) => s.formationId === targetFormationId)
  // Pas dans une séquence → aucun verrou inter-parcours.
  if (!target) return { unlocked: true, reason: null, previousFormationId: null }

  // La formation immédiatement précédente dans l'ordre.
  const previous = sequence
    .filter((s) => s.ordre < target.ordre)
    .sort((a, b) => b.ordre - a.ordre)[0]

  // Première de la séquence → déverrouillée.
  if (!previous) return { unlocked: true, reason: null, previousFormationId: null }

  if (done.has(previous.formationId)) {
    return { unlocked: true, reason: null, previousFormationId: previous.formationId }
  }
  return { unlocked: false, reason: 'prev_parcours_incomplet', previousFormationId: previous.formationId }
}
