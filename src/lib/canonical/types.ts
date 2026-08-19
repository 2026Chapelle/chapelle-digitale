/**
 * PHASE 3A — CONTRATS CANONIQUES (types purs, aucune I/O, aucun runtime).
 *
 * Quatre AXES SÉPARÉS, jamais fondus dans une seule échelle « magique » :
 *   - GROWTH_LEVEL     : croissance spirituelle (jamais dérivée automatiquement de l'activité)
 *   - COMMUNITY_STATUS : appartenance communautaire
 *   - LEARNING_JOURNEY : parcours pédagogique (complétion peut être automatique)
 *   - MINISTRY_ROLE    : fonction / ministère (distinct du RBAC `role` et du SaaS `membershipRole`)
 *
 * Ces types NE remplacent AUCUN champ legacy. Ils ne sont, en Phase 3A, consommés
 * par aucun chemin de production : ce sont des contrats + un adaptateur de LECTURE.
 * Aucune notion de score spirituel, aucune promotion/rétrogradation automatique.
 */

// ---------------------------------------------------------------------------
// AXE 1 — GROWTH_LEVEL
// ---------------------------------------------------------------------------
export type GrowthLevel =
  | 'visiteur'
  | 'nouveau_croyant'
  | 'disciple'
  | 'serviteur'
  | 'leader'
  | 'ouvrier'
  | 'responsable'
  | 'berger'

/** Ordre canonique (rang 0→7). Pour comparaison/affichage seulement. */
export const GROWTH_LEVEL_ORDER: GrowthLevel[] = [
  'visiteur', 'nouveau_croyant', 'disciple', 'serviteur',
  'leader', 'ouvrier', 'responsable', 'berger',
]

/**
 * Confiance de la valeur canonique dérivée du legacy.
 *  - 'confirmed'       : mapping déterministe et sûr depuis le legacy.
 *  - 'requires_review' : le legacy est ambigu ou issu d'une auto-promotion non
 *                        validée → décision réservée au pastorat (jamais l'algo).
 */
export type CanonicalConfidence = 'confirmed' | 'requires_review'

export interface CanonicalGrowth {
  /** null = inconnu (aucune donnée fiable) ; jamais fabriqué. */
  level: GrowthLevel | null
  confidence: CanonicalConfidence
}

// ---------------------------------------------------------------------------
// AXE 2 — COMMUNITY_STATUS
// ---------------------------------------------------------------------------
export type CommunityStatus = 'visiteur' | 'contact' | 'integration' | 'membre'

export const COMMUNITY_STATUS_ORDER: CommunityStatus[] = [
  'visiteur', 'contact', 'integration', 'membre',
]

export interface CanonicalCommunity {
  status: CommunityStatus | null
  confidence: CanonicalConfidence
}

// ---------------------------------------------------------------------------
// AXE 3 — LEARNING_JOURNEY (pédagogique — faits, jamais un statut spirituel)
// ---------------------------------------------------------------------------
export type LearningStatus = 'active' | 'paused' | 'completed' | 'closed'

export interface LearningJourney {
  currentProgrammeSlug: string | null
  currentStepKey: string | null
  journeyStatus: LearningStatus | null
  completedProgrammes: string[]
  /** Indicateur legacy relu ICI (pédagogique), jamais interprété comme croissance. */
  parcoursDiscipleEtape: number | null
}

// ---------------------------------------------------------------------------
// AXE 4 — MINISTRY_ROLE (fonction / ministère — multi-valué)
// ---------------------------------------------------------------------------
export type MinistryRole =
  | 'serviteur'
  | 'leader_cellule'
  | 'co_leader'
  | 'hote'
  | 'responsable_plateforme'
  | 'berger'
  | 'pasteur'
  | 'pasteur_national'
  | 'responsable_national'
  | 'responsable_integration'
  | 'nation_pastor'
  | 'formateur'

// ---------------------------------------------------------------------------
// Vue canonique consolidée (sortie de l'adaptateur legacy → canonique)
// ---------------------------------------------------------------------------
export interface CanonicalMemberView {
  growth: CanonicalGrowth
  community: CanonicalCommunity
  ministry_roles: MinistryRole[]
  learning: LearningJourney
  /** Notes d'ambiguïté explicites (jamais silencieuses). */
  notes: string[]
}

// ---------------------------------------------------------------------------
// PASTORAL SIGNAL (read-only, descriptif — jamais un verdict)
// ---------------------------------------------------------------------------
export type SignalSeverity = 'haute' | 'moyenne' | 'info'

export type SignalType =
  | 'nouveau_sans_accompagnement'
  | 'parcours_arrete'
  | 'baisse_participation'
  | 'sans_groupe'
  | 'formation_presque_terminee'
  | 'prieres_repetees_sans_suivi'
  | 'forte_regularite'
  | 'criteres_pedagogiques_accomplis'

export interface PastoralEvidence {
  /** Fait vérifiable, ex. "formations_terminees=2". */
  fact: string
  /** Table/fonction d'origine, ex. "inscriptions_formation". */
  source: string
  value?: number | string
}

export interface PastoralSignal {
  type: SignalType
  severity: SignalSeverity
  /** Phrase prudente et non-jugeante — JAMAIS un verdict spirituel. */
  reason: string
  evidence: PastoralEvidence[]
  /** ISO — recalculé à la volée, non stocké comme vérité. */
  generated_at: string
  member_id: string
  /** Geste humain proposé — invitation, jamais une mutation. */
  suggested_action: string
  /** TTL optionnel : le signal disparaît si le fait n'est plus vrai. */
  expires_at?: string
}

// ---------------------------------------------------------------------------
// JOURNEY READINESS (readiness ≠ promotion)
// ---------------------------------------------------------------------------
export type ReadinessStatus = 'NOT_READY' | 'READY_FOR_REVIEW'

/**
 * Classe de transition future :
 *  - AUTOMATIC      : pédagogique pur (leçon/module/formation/badge) — jamais un statut spirituel.
 *  - SEMI_AUTOMATIC : critères atteints → suggestion → VALIDATION HUMAINE obligatoire.
 *  - PASTORAL_ONLY  : autorité (leader_cellule+/berger/pasteur) — 100 % humain, jamais d'algo.
 */
export type TransitionClass = 'AUTOMATIC' | 'SEMI_AUTOMATIC' | 'PASTORAL_ONLY'

export interface ReadinessCriterion {
  key: string
  label: string
  met: boolean
  /** Preuve factuelle lisible dérivée du réel. */
  evidence: string
}

export interface JourneyReadiness {
  member_id: string
  current_growth_level: string | null
  /** Niveau candidat SI et seulement si strictement supérieur ET borné (≤ disciple). Sinon null. */
  candidate_level: string | null
  criteria: ReadinessCriterion[]
  missing: string[]
  status: ReadinessStatus
  transition_class: TransitionClass
  // INVARIANT : aucun champ ne peut exprimer « promu ». READY_FOR_REVIEW ≠ PROMOTED.
}
