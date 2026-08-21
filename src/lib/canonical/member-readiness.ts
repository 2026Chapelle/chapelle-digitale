/**
 * MEMBER READINESS (Phase 3C, LECTURE SEULE) — active la chaîne dormante
 * COMPLÉTION → READY_FOR_REVIEW en la calculant EN LECTURE, sans AUCUNE écriture ni
 * mutation, à partir des faits pédagogiques (parcours complétés). Réutilise le moteur
 * pur `evaluateJourneyReadiness` (Phase 3A) sans le modifier.
 *
 * Alimente deux surfaces :
 *   • le membre (affichage CAVIARDÉ : « en attente de reconnaissance », jamais la cible) ;
 *   • le pastorat (dossier / file de revue) pour proposer une validation HUMAINE.
 *
 * INVARIANT ABSOLU : READY_FOR_REVIEW ≠ PROMOTED. Aucune valeur cible n'est révélée au
 * membre (pas d'auto-étiquetage). Aucune promotion : la reconnaissance réelle n'existe
 * que via la route admin humaine auditée (RPC validate_member_canonical_axis).
 */
import { evaluateJourneyReadiness, type ReadinessParcoursFact } from './journey-readiness'
import type { ReadinessStatus } from './types'

export interface MemberReadinessInput {
  /** profiles.membre_statut actuel (fait legacy, lu seulement). */
  current_statut: string | null
  /** Faits pédagogiques (slug, complete, done, total) — issus de getIntegrationProgress. */
  parcours: ReadinessParcoursFact[]
}

export interface MemberReadinessView {
  /** true dès qu'un parcours complété rend le membre READY_FOR_REVIEW (borné ≤ disciple). */
  pending: boolean
  status: ReadinessStatus
}

/**
 * Calcule l'état de préparation du membre — pur, déterministe, sans écriture.
 * Le membre est « en attente de reconnaissance » dès qu'AU MOINS un parcours complété
 * (pris comme déclencheur) produit READY_FOR_REVIEW via le moteur borné (≤ disciple).
 */
export function computeMemberReadiness(input: MemberReadinessInput): MemberReadinessView {
  const completed = input.parcours.filter((p) => p.complete)
  const pending = completed.some(
    (p) =>
      evaluateJourneyReadiness({
        member_id: 'self',
        current_statut: input.current_statut,
        parcours: input.parcours,
        completed_parcours_slug: p.slug,
      }).status === 'READY_FOR_REVIEW',
  )
  return { pending, status: pending ? 'READY_FOR_REVIEW' : 'NOT_READY' }
}
