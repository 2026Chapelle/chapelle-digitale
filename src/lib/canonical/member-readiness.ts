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
import { rankOf } from '@/lib/formations/statut-progression'
import type { ReadinessStatus } from './types'

/**
 * Correspondance niveau de croissance CANONIQUE (EN) → espace de rang LEGACY, pour
 * comparer une reconnaissance canonique confirmée aux cibles pédagogiques (FR legacy).
 * La reconnaissance humaine (RPC validate_member_canonical_axis) écrit member_canonical_axes.
 * growth_level et NON profiles.membre_statut ; sans cette table de correspondance, la
 * readiness resterait « en attente » à jamais après validation. `membre_actif` (rang 2)
 * n'a pas d'équivalent canonique — sans incidence (cibles bornées ≤ disciple).
 */
const CANONICAL_GROWTH_TO_LEGACY: Record<string, string> = {
  visitor: 'visiteur',
  new_believer: 'nouveau_membre',
  disciple: 'disciple',
  servant: 'leader_cellule',
  leader: 'leader_cellule',
  worker: 'berger',
  responsible: 'berger',
  shepherd: 'pasteur',
}

export interface MemberReadinessInput {
  /** profiles.membre_statut actuel (fait legacy). */
  current_statut: string | null
  /**
   * member_canonical_axes.growth_level (clé canonique EN) SI une reconnaissance existe,
   * sinon null. C'est la SOURCE DE VÉRITÉ de la croissance reconnue : une validation
   * pastorale confirmée fait retomber `pending` à false.
   */
  current_growth_canonical?: string | null
  /** Faits pédagogiques (slug, complete, done, total) — issus de getIntegrationProgress. */
  parcours: ReadinessParcoursFact[]
}

export interface MemberReadinessView {
  /** true dès qu'un parcours complété rend le membre READY_FOR_REVIEW (borné ≤ disciple). */
  pending: boolean
  status: ReadinessStatus
}

/**
 * Niveau reconnu EFFECTIF (espace legacy) = le plus haut rang entre le statut legacy et
 * la reconnaissance canonique mappée. Pur. La reconnaissance canonique prime dès qu'elle
 * est au moins aussi haute — ce qui clôt la readiness une fois la validation humaine faite.
 */
export function effectiveCurrentStatut(
  legacyStatut: string | null,
  canonicalGrowthKey: string | null | undefined,
): string | null {
  const canonMapped = canonicalGrowthKey ? CANONICAL_GROWTH_TO_LEGACY[canonicalGrowthKey] ?? null : null
  if (canonMapped && rankOf(canonMapped) >= rankOf(legacyStatut)) return canonMapped
  return legacyStatut ?? null
}

/**
 * Calcule l'état de préparation du membre — pur, déterministe, sans écriture.
 * Le membre est « en attente de reconnaissance » dès qu'AU MOINS un parcours complété
 * (pris comme déclencheur) produit READY_FOR_REVIEW via le moteur borné (≤ disciple),
 * relativement au niveau reconnu EFFECTIF (legacy ∨ canonique confirmé).
 */
export function computeMemberReadiness(input: MemberReadinessInput): MemberReadinessView {
  const current = effectiveCurrentStatut(input.current_statut, input.current_growth_canonical)
  const completed = input.parcours.filter((p) => p.complete)
  const pending = completed.some(
    (p) =>
      evaluateJourneyReadiness({
        member_id: 'self',
        current_statut: current,
        parcours: input.parcours,
        completed_parcours_slug: p.slug,
      }).status === 'READY_FOR_REVIEW',
  )
  return { pending, status: pending ? 'READY_FOR_REVIEW' : 'NOT_READY' }
}
