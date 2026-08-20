/**
 * JOURNEY SERVICE — composition PURE (lecture seule) des contrats Phase 3A avec le
 * modèle canonique. AUCUNE mutation : ne modifie ni growth_level, ni community_status,
 * ni ministry_role. Produit un « bundle » lisible pour un futur écran d'examen (3C),
 * mais n'ouvre AUCUN endpoint de mutation (frontière 3B/3C respectée).
 */
import type { CanonicalMemberView, JourneyReadiness, PastoralSignal } from './types'
import { evaluateJourneyReadiness, type ReadinessInput } from './journey-readiness'

export interface MemberJourneyBundle {
  member_id: string
  /** Vue canonique (persistée ou fallback legacy). */
  view: CanonicalMemberView
  /** Préparation à une éventuelle montée — NOT_READY | READY_FOR_REVIEW (jamais PROMOTED). */
  readiness: JourneyReadiness
  /** Signaux pastoraux descriptifs (non décisionnels). */
  signals: PastoralSignal[]
}

/**
 * Assemble la vue + la readiness + les signaux. Déterministe, pure, sans écriture.
 * INVARIANT : `readiness.status` ne peut valoir que NOT_READY ou READY_FOR_REVIEW.
 */
export function buildMemberJourneyBundle(input: {
  member_id: string
  view: CanonicalMemberView
  readinessInput: ReadinessInput
  signals?: PastoralSignal[]
}): MemberJourneyBundle {
  const readiness = evaluateJourneyReadiness(input.readinessInput)
  return {
    member_id: input.member_id,
    view: input.view,
    readiness,
    signals: input.signals ?? [],
  }
}
