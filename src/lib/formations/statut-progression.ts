/**
 * PROGRESSION DU STATUT MEMBRE — logique PURE.
 *
 * À la complétion à 100 % d'un parcours d'intégration, le statut du membre
 * (`profiles.membre_statut`) monte automatiquement. La montée est MONOTONE :
 * on ne redescend jamais un membre (un statut acquis manuellement par le
 * pastorat — leader, berger… — n'est jamais écrasé par un parcours).
 *
 * Enum réel (001_initial_schema) :
 *   visiteur · nouveau_membre · membre_actif · disciple · leader_cellule · berger · pasteur
 */

/** Rang ordinal du statut (du plus bas au plus haut). */
export const STATUT_RANK: Record<string, number> = {
  visiteur: 0,
  nouveau_membre: 1,
  membre_actif: 2,
  disciple: 3,
  leader_cellule: 4,
  berger: 5,
  pasteur: 6,
}

export function rankOf(statut?: string | null): number {
  return STATUT_RANK[statut || ''] ?? 0
}

/**
 * Statut cible atteint en TERMINANT le parcours identifié par son slug.
 * Décisions validées :
 *   nouveau-croyant            → nouveau_membre
 *   je-decouvre-la-maison      → membre_actif
 *   je-stabilise-ma-foi        → disciple
 *   je-deviens-disciple-actif  → disciple
 * Tout autre slug → null (pas de migration de statut).
 */
export const PARCOURS_STATUT_CIBLE: Record<string, string> = {
  'nouveau-croyant': 'nouveau_membre',
  'je-decouvre-la-maison': 'membre_actif',
  'je-stabilise-ma-foi': 'disciple',
  'je-deviens-disciple-actif': 'disciple',
}

export function statutCibleForParcours(slug?: string | null): string | null {
  return (slug && PARCOURS_STATUT_CIBLE[slug]) || null
}

/**
 * Calcule le nouveau statut à appliquer (ou null si aucune montée).
 * Ne renvoie une valeur que si le statut cible est STRICTEMENT supérieur au statut actuel.
 */
export function computeStatutUpgrade(currentStatut: string | null | undefined, parcoursSlug: string | null | undefined): string | null {
  const cible = statutCibleForParcours(parcoursSlug)
  if (!cible) return null
  return rankOf(cible) > rankOf(currentStatut) ? cible : null
}
