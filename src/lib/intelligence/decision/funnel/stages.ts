/**
 * CITADELLE INTELLIGENCE — 5B · AGENT 1 · TABLE STATIQUE DES ÉTAPES DU FUNNEL.
 *
 * Table de DÉFINITION (aucun I/O, aucun compte) des 7 paliers verticaux du tunnel
 * de décision Citadelle (cf. DECISION_FUNNEL_STAGE_ORDER). Chaque palier déclare
 * ce qu'il compte VRAIMENT, sa source réelle (table.colonne) et son unité de
 * cohorte. Une étape SANS événement fiablement instrumenté est déclarée
 * `uninstrumented` : elle sortira UNAVAILABLE (jamais 0) au build.
 *
 * Audit des sources (repris de HUB-2/HUB-4 — rien d'inventé) :
 *  - CITADELLE_VISIT : analytics_events (type='pageview')        → INSTRUMENTÉ (pageviews)
 *  - SIGNUP          : profiles.created_at                        → INSTRUMENTÉ (new_persons)
 *  - ACTIVATION      : —                                          → NON INSTRUMENTÉ
 *      Aucun événement « activation » (première action signifiante post-inscription)
 *      n'est instrumenté de façon fiable. On NE fabrique PAS de proxy.
 *  - ENGAGEMENT      : audio_listening_events (play_start/resume) → INSTRUMENTÉ (plays)
 *  - PARCOURS_START  : —                                          → NON INSTRUMENTÉ
 *      Aucun événement fiable de DÉBUT de parcours/module (inscription/démarrage).
 *      module_completions compte des COMPLÉTIONS, pas des démarrages.
 *  - PROGRESSION     : module_completions.completed_at            → INSTRUMENTÉ (module_completions)
 *  - CONVERSION      : —                                          → NON INSTRUMENTÉ (composite)
 *      Regroupe des cohortes hétérogènes (dons, prières, événements) non sommables
 *      en un seul nombre — cohérent avec conversions/categories.ts.
 */

import type { Freshness } from '../../types/freshness'
import type { ConversionCounts } from '../../conversions/categories'
import type { CohortUnit } from '../../conversions/types'
import type { DecisionFunnelStageKey } from '../contract'
import { DECISION_FUNNEL_STAGE_ORDER } from '../contract'

/**
 * Définition statique d'une étape. Union discriminée :
 *  - `instrumented` : porte une `countKey` vers un compte RÉEL déjà lu ;
 *  - `uninstrumented` : porte une `reason` — aucune source fiable, restera UNAVAILABLE.
 */
export type FunnelStageDef =
  | {
      key: DecisionFunnelStageKey
      /** Libellé FR court (badge/colonne). */
      label: string
      /** Ce que l'étape compte VRAIMENT (définition canonique). */
      definition: string
      /** Source réelle (table.colonne) — jamais un secret. */
      source: string
      /** Unité de cohorte : deux étapes ne sont comparables que si identique. */
      cohort: CohortUnit
      freshness: Freshness
      /** Clé du dictionnaire guide (InfoTip). */
      metricKey: string
      kind: 'instrumented'
      /** Compte réel correspondant dans ConversionCounts. */
      countKey: keyof ConversionCounts
    }
  | {
      key: DecisionFunnelStageKey
      label: string
      definition: string
      source: string
      cohort: CohortUnit
      freshness: Freshness
      metricKey: string
      kind: 'uninstrumented'
      /** Raison honnête de l'indisponibilité (OBLIGATOIRE). */
      reason: string
    }

/**
 * Les 7 étapes canoniques (haut → bas), dans l'ordre gelé du contrat.
 * Les cohortes voisines sont DISTINCTES : les taux inter-étapes sortiront donc
 * (honnêtement) UNAVAILABLE au build — c'est le résultat correct.
 */
export const DECISION_FUNNEL_STAGE_DEFS: ReadonlyArray<FunnelStageDef> = [
  {
    key: 'CITADELLE_VISIT',
    label: 'Visites Citadelle',
    definition:
      "Pages vues sur la Citadelle (événements de type 'pageview', PAS des visiteurs uniques).",
    source: "analytics_events (type='pageview')",
    cohort: 'pageviews',
    freshness: 'NEAR_REALTIME',
    metricKey: 'decision_funnel_citadelle_visit',
    kind: 'instrumented',
    countKey: 'pageViews',
  },
  {
    key: 'SIGNUP',
    label: 'Inscriptions',
    definition: 'Personnes nouvellement inscrites (comptes profiles créés sur la période).',
    source: 'profiles.created_at',
    cohort: 'new_persons',
    freshness: 'SYNCED',
    metricKey: 'decision_funnel_signup',
    kind: 'instrumented',
    countKey: 'signups',
  },
  {
    key: 'ACTIVATION',
    label: 'Activation',
    definition:
      "Première action signifiante d'un inscrit (activation du compte). Aucun événement d'activation n'est instrumenté.",
    source: '—',
    cohort: 'unavailable',
    freshness: 'SYNCED',
    metricKey: 'decision_funnel_activation',
    kind: 'uninstrumented',
    reason:
      "Aucun événement « activation » n'est instrumenté de façon fiable : il n'existe pas de marqueur garanti de première action signifiante post-inscription. On ne peut pas savoir (ce n'est pas 0), et aucun proxy n'est fabriqué.",
  },
  {
    key: 'ENGAGEMENT',
    label: 'Engagement (écoutes)',
    definition: 'Écoutes de contenu audio (play_start/play_resume ; lectures, PAS auditeurs uniques).',
    source: 'audio_listening_events (play_start/resume)',
    cohort: 'plays',
    freshness: 'NEAR_REALTIME',
    metricKey: 'decision_funnel_engagement',
    kind: 'instrumented',
    countKey: 'podcastPlays',
  },
  {
    key: 'PARCOURS_START',
    label: 'Démarrages de parcours',
    definition:
      "Démarrage/inscription à un parcours ou module. Aucun événement de DÉBUT n'est instrumenté (les complétions ne sont pas des démarrages).",
    source: '—',
    cohort: 'unavailable',
    freshness: 'SYNCED',
    metricKey: 'decision_funnel_parcours_start',
    kind: 'uninstrumented',
    reason:
      "Aucun événement fiable de DÉBUT de parcours/module (inscription ou démarrage) n'est instrumenté. module_completions compte des COMPLÉTIONS, pas des démarrages : on ne peut pas savoir combien de parcours ont été commencés (ce n'est pas 0).",
  },
  {
    key: 'PROGRESSION',
    label: 'Progressions (complétions)',
    definition: 'Complétions de module (immuables, dédupliquées) — une progression réelle du parcours.',
    source: 'module_completions.completed_at',
    cohort: 'module_completions',
    freshness: 'SYNCED',
    metricKey: 'decision_funnel_progression',
    kind: 'instrumented',
    countKey: 'moduleCompletions',
  },
  {
    key: 'CONVERSION',
    label: 'Conversions (profondes)',
    definition:
      "Conversion finale profonde : agrégat hétérogène (dons, prières, inscriptions événement) non sommable en un seul nombre.",
    source: '—',
    cohort: 'composite',
    freshness: 'SYNCED',
    metricKey: 'decision_funnel_conversion',
    kind: 'uninstrumented',
    reason:
      "La conversion finale regroupe des cohortes hétérogènes (dons confirmés, demandes de prière, inscriptions événement) non sommables en un seul nombre. Voir le détail par catégorie (conversions/categories). Un total unique serait trompeur.",
  },
]

/** Une étape de définition est-elle réellement instrumentée (source fiable) ? */
export function isStageInstrumented(def: FunnelStageDef): def is Extract<FunnelStageDef, { kind: 'instrumented' }> {
  return def.kind === 'instrumented'
}

/** Récupère la définition d'une étape par sa clé (déterministe). */
export function getStageDef(key: DecisionFunnelStageKey): FunnelStageDef {
  const def = DECISION_FUNNEL_STAGE_DEFS.find((d) => d.key === key)
  if (!def) {
    // Impossible si la table couvre DECISION_FUNNEL_STAGE_ORDER (garanti par test).
    throw new Error(`Étape de funnel inconnue : ${key}`)
  }
  return def
}

/** Les définitions dans l'ordre canonique gelé (source de vérité de l'ordre). */
export function orderedStageDefs(): FunnelStageDef[] {
  return DECISION_FUNNEL_STAGE_ORDER.map((key) => getStageDef(key))
}
