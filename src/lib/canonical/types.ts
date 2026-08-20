/**
 * CANONICAL CONTRACTS (types purs, aucune I/O, aucun runtime).
 *
 * Quatre AXES SÉPARÉS, jamais fondus dans une seule échelle « magique » :
 *   - GROWTH_LEVEL     : croissance spirituelle (jamais dérivée automatiquement de l'activité)
 *   - COMMUNITY_STATUS : appartenance communautaire
 *   - LEARNING_JOURNEY : parcours pédagogique (complétion peut être automatique)
 *   - MINISTRY_ROLE    : fonction / ministère (distinct du RBAC `role` et du SaaS `membershipRole`)
 *
 * Clés canoniques en ANGLAIS (contrat Phase 3B). Les libellés FR relèvent de la
 * présentation (non stockés). Aucune notion de score spirituel, aucune promotion
 * automatique. `pastor` n'est PAS un niveau de croissance (c'est un ministère).
 */

// ---------------------------------------------------------------------------
// AXE 1 — GROWTH_LEVEL
// Contrat du task : `pastor` n'est PAS un niveau de croissance (c'est un ministère,
// AXE 4). `shepherd` (berger) EST un niveau de croissance (maturité spirituelle de
// celui qui prend soin des autres) — À NE PAS confondre avec le ministère `shepherd`
// de member_ministry_roles (fonction assignée). Les deux axes coexistent sans se
// dériver l'un de l'autre (MINOR-1 : distinction volontaire, documentée).
// ---------------------------------------------------------------------------
export type GrowthLevel =
  | 'visitor'
  | 'new_believer'
  | 'disciple'
  | 'servant'
  | 'leader'
  | 'worker'
  | 'responsible'
  | 'shepherd'

/** Ordre canonique (rang 0→7). Comparaison/affichage seulement. */
export const GROWTH_LEVEL_ORDER: GrowthLevel[] = [
  'visitor', 'new_believer', 'disciple', 'servant',
  'leader', 'worker', 'responsible', 'shepherd',
]

/**
 * Confiance de la valeur canonique dérivée du legacy.
 *  - 'confirmed'       : mapping déterministe et sûr.
 *  - 'requires_review' : legacy ambigu ou auto-promu non validé → décision pastorale humaine.
 */
export type CanonicalConfidence = 'confirmed' | 'requires_review'

export interface CanonicalGrowth {
  /** null = inconnu (jamais fabriqué). */
  level: GrowthLevel | null
  confidence: CanonicalConfidence
}

// ---------------------------------------------------------------------------
// AXE 2 — COMMUNITY_STATUS
// ---------------------------------------------------------------------------
export type CommunityStatus = 'visitor' | 'contact' | 'integrating' | 'member'

export const COMMUNITY_STATUS_ORDER: CommunityStatus[] = [
  'visitor', 'contact', 'integrating', 'member',
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
// AXE 4 — MINISTRY_ROLE (fonction / ministère — clés registre EN, multi-valué)
// ---------------------------------------------------------------------------
export type MinistryRole =
  | 'mentor'
  | 'cell_leader'
  | 'team_leader'
  | 'servant'
  | 'trainer'
  | 'integration_lead'
  | 'shepherd'
  | 'pastor'

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
  /** Provenance de la vue : 'canonical' (ligne persistée) ou 'legacy_fallback'. */
  source: 'canonical' | 'legacy_fallback'
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
  fact: string
  source: string
  value?: number | string
}

export interface PastoralSignal {
  type: SignalType
  severity: SignalSeverity
  /** Phrase prudente et non-jugeante — JAMAIS un verdict spirituel. */
  reason: string
  evidence: PastoralEvidence[]
  generated_at: string
  member_id: string
  /** Geste humain proposé — invitation, jamais une mutation. */
  suggested_action: string
  expires_at?: string
}

// ---------------------------------------------------------------------------
// JOURNEY READINESS (readiness ≠ promotion)
// ---------------------------------------------------------------------------
export type ReadinessStatus = 'NOT_READY' | 'READY_FOR_REVIEW'

/**
 * Classe de transition future :
 *  - AUTOMATIC      : pédagogique pur — jamais un statut spirituel.
 *  - SEMI_AUTOMATIC : critères atteints → suggestion → VALIDATION HUMAINE obligatoire.
 *  - PASTORAL_ONLY  : autorité (leader_cellule+/berger/pasteur) — 100 % humain.
 */
export type TransitionClass = 'AUTOMATIC' | 'SEMI_AUTOMATIC' | 'PASTORAL_ONLY'

export interface ReadinessCriterion {
  key: string
  label: string
  met: boolean
  evidence: string
}

export interface JourneyReadiness {
  member_id: string
  current_growth_level: string | null
  /** Niveau candidat SI strictement supérieur ET borné (≤ disciple). Sinon null. */
  candidate_level: string | null
  criteria: ReadinessCriterion[]
  missing: string[]
  status: ReadinessStatus
  transition_class: TransitionClass
  // INVARIANT : aucun champ ne peut exprimer « promu ». READY_FOR_REVIEW ≠ PROMOTED.
}
