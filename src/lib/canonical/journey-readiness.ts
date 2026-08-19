/**
 * PHASE 3A — READINESS ENGINE, PUR (aucune écriture, aucune mutation, aucune permission).
 *
 * Chaîne visée : signal → readiness → recommandation → VALIDATION HUMAINE → décision auditée.
 * Ce moteur ne fait QUE la 2ᵉ étape : il calcule un état de préparation à partir de faits.
 *
 * INVARIANT ABSOLU : READY_FOR_REVIEW ≠ PROMOTED. Aucune sortie n'exprime « promu » ;
 * la promotion réelle n'existe que via la route admin humaine (hors périmètre 3A).
 *
 * Réutilise la logique PURE existante (src/lib/formations/statut-progression.ts) sans la
 * modifier : computeStatutUpgrade (cible si strictement supérieure) + rankOf (ordre).
 */
import { computeStatutUpgrade, rankOf } from '@/lib/formations/statut-progression'
import type { JourneyReadiness, ReadinessCriterion, TransitionClass } from './types'

/** Plafond de la readiness SEMI-AUTOMATIQUE : jamais au-delà de `disciple`. */
const READINESS_CEILING = 'disciple'

export interface ReadinessParcoursFact {
  slug: string
  complete: boolean
  done?: number
  total?: number
}

export interface ReadinessInput {
  member_id: string
  /** profiles.membre_statut actuel. */
  current_statut: string | null
  /** Faits pédagogiques (issus de getIntegrationProgress côté serveur — passés en entrée). */
  parcours: ReadinessParcoursFact[]
  /** Slug du parcours qui vient d'être complété (déclencheur), ou null. */
  completed_parcours_slug: string | null
}

function classifyTransition(candidate: string | null): TransitionClass {
  if (!candidate) return 'AUTOMATIC' // pédagogique pur, aucun statut spirituel proposé
  return rankOf(candidate) <= rankOf(READINESS_CEILING) ? 'SEMI_AUTOMATIC' : 'PASTORAL_ONLY'
}

/**
 * Évalue la préparation à une éventuelle montée de statut — SANS jamais la décider.
 * Déterministe et pure.
 */
export function evaluateJourneyReadiness(input: ReadinessInput): JourneyReadiness {
  // Cible legacy si strictement supérieure au statut courant (sinon null).
  const rawCandidate = computeStatutUpgrade(input.current_statut, input.completed_parcours_slug)

  // Bornage : une cible au-delà de `disciple` relève du PASTORAL_ONLY → jamais proposée en readiness.
  const transition_class = classifyTransition(rawCandidate)
  const candidate_level = transition_class === 'SEMI_AUTOMATIC' ? rawCandidate : null

  const criteria: ReadinessCriterion[] = []

  if (input.completed_parcours_slug) {
    const p = input.parcours.find((x) => x.slug === input.completed_parcours_slug)
    criteria.push({
      key: `parcours:${input.completed_parcours_slug}`,
      label: `Parcours « ${input.completed_parcours_slug} » complété`,
      met: !!p?.complete,
      evidence: `${p?.done ?? '?'}/${p?.total ?? '?'} modules validés`,
    })
  }

  criteria.push({
    key: 'candidate_above_current',
    label: 'Niveau candidat strictement supérieur au niveau actuel',
    met: rawCandidate != null,
    evidence: `${input.current_statut ?? '—'} → ${rawCandidate ?? '(aucune cible supérieure)'}`,
  })

  const missing = criteria.filter((c) => !c.met).map((c) => c.label)

  // READY_FOR_REVIEW ssi une cible bornée existe ET tous les critères sont satisfaits.
  const status: JourneyReadiness['status'] =
    candidate_level != null && criteria.every((c) => c.met) ? 'READY_FOR_REVIEW' : 'NOT_READY'

  return {
    member_id: input.member_id,
    current_growth_level: input.current_statut,
    candidate_level,
    criteria,
    missing,
    status,
    transition_class,
  }
}
