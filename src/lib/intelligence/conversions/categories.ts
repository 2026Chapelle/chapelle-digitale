/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Construction PURE des catégories de conversion et des étapes du tunnel, à partir
 * de comptes DÉJÀ LUS (aucun I/O ici). Seules les catégories dont une source
 * FIABLE ET PROUVÉE existe sont REAL ; les autres restent UNAVAILABLE + raison.
 *
 * Sources prouvées (vérifiées dans le schéma / les adapters existants) :
 *  - ACQUISITION      : public.profiles.created_at (trigger handle_new_user)
 *  - ENGAGEMENT       : public.audio_listening_events (play_start/resume, occurred_at)
 *  - DISCIPULAT       : public.module_completions.completed_at (immuable, dédupliqué)
 *  - COMMUNAUTE       : public.event_registrations (type in inscription/participation)
 *  - CONTACT          : public.priere_demandes.created_at
 *  - GENEROSITE       : public.dons (statut='complete' — webhook Chariow strict)
 * Catégorie SANS source fiable → UNAVAILABLE (jamais un faux 0) :
 *  - ACCOMPLISSEMENT  : aucun événement fiable de fin de PARCOURS/FORMATION complet.
 */

import type { Freshness } from '../types/freshness'
import type {
  CohortUnit,
  ConversionCategory,
  ConversionCategoryKey,
  FunnelStage,
} from './types'

/** Comptes de conversion prouvés (fenêtre = aujourd'hui). null ⇒ démo. */
export interface ConversionCounts {
  pageViews: number
  signups: number
  podcastPlays: number
  moduleCompletions: number
  eventRegistrations: number
  prayerRequests: number
  donationsConfirmed: number
}

/** Définition statique d'une catégorie. Union discriminée : une catégorie prouvée
 *  porte un `countKey` ; une catégorie intrinsèquement indisponible porte `reason`. */
type CategoryDef =
  | {
      key: ConversionCategoryKey
      label: string
      metricKey: string
      source: string
      freshness: Freshness
      kind: 'proven'
      countKey: keyof ConversionCounts
    }
  | {
      key: ConversionCategoryKey
      label: string
      metricKey: string
      source: string
      freshness: Freshness
      kind: 'unavailable'
      reason: string
    }

export const CATEGORY_DEFS: ReadonlyArray<CategoryDef> = [
  {
    key: 'ACQUISITION',
    label: 'Acquisition — inscription Citadelle',
    metricKey: 'conv_acquisition',
    source: 'profiles.created_at',
    freshness: 'SYNCED',
    kind: 'proven',
    countKey: 'signups',
  },
  {
    key: 'ENGAGEMENT',
    label: 'Engagement — écoute podcast',
    metricKey: 'conv_engagement',
    source: 'audio_listening_events (play_start/resume)',
    freshness: 'NEAR_REALTIME',
    kind: 'proven',
    countKey: 'podcastPlays',
  },
  {
    key: 'DISCIPULAT',
    label: 'Discipulat — complétion de module',
    metricKey: 'conv_discipulat',
    source: 'module_completions.completed_at',
    freshness: 'SYNCED',
    kind: 'proven',
    countKey: 'moduleCompletions',
  },
  {
    key: 'ACCOMPLISSEMENT',
    label: 'Accomplissement — formation/parcours terminé',
    metricKey: 'conv_accomplissement',
    source: '—',
    freshness: 'SYNCED',
    kind: 'unavailable',
    reason:
      "Aucun événement fiable de fin de parcours/formation complet : module_completions compte des modules, pas l'achèvement du parcours entier, et aucun marqueur d'achèvement global n'est instrumenté de façon garantie en production.",
  },
  {
    key: 'COMMUNAUTE',
    label: 'Communauté — inscription événement',
    metricKey: 'conv_communaute',
    source: "event_registrations (type in 'inscription','participation')",
    freshness: 'SYNCED',
    kind: 'proven',
    countKey: 'eventRegistrations',
  },
  {
    key: 'CONTACT',
    label: 'Contact — demande de prière',
    metricKey: 'conv_contact',
    source: 'priere_demandes.created_at',
    freshness: 'SYNCED',
    kind: 'proven',
    countKey: 'prayerRequests',
  },
  {
    key: 'GENEROSITE',
    label: 'Générosité — don confirmé',
    metricKey: 'conv_generosite',
    source: "dons (statut='complete', date_creation)",
    freshness: 'SYNCED',
    kind: 'proven',
    countKey: 'donationsConfirmed',
  },
]

export interface BuildCategoriesOptions {
  period: string
  demo?: boolean
}

/**
 * Construit les 7 catégories. PURE.
 * - kind='unavailable' → UNAVAILABLE, value=null (jamais un 0 trompeur).
 * - démo (ou counts=null) → DEMO, value=null (aucun nombre fictif présenté comme réel).
 * - sinon → REAL avec le vrai compte (0 réel reste REAL, PAS indisponible).
 */
export function buildConversionCategories(
  counts: ConversionCounts | null,
  opts: BuildCategoriesOptions,
): ConversionCategory[] {
  const demoMode = opts.demo === true || counts === null
  return CATEGORY_DEFS.map<ConversionCategory>((def) => {
    if (def.kind === 'unavailable') {
      return {
        key: def.key,
        label: def.label,
        metricKey: def.metricKey,
        source: def.source,
        period: opts.period,
        freshness: def.freshness,
        availability: 'UNAVAILABLE',
        value: null,
        reason: def.reason,
      }
    }
    if (demoMode || !counts) {
      return {
        key: def.key,
        label: def.label,
        metricKey: def.metricKey,
        source: def.source,
        period: opts.period,
        freshness: def.freshness,
        availability: 'DEMO',
        value: null,
      }
    }
    return {
      key: def.key,
      label: def.label,
      metricKey: def.metricKey,
      source: def.source,
      period: opts.period,
      freshness: def.freshness,
      availability: 'REAL',
      value: counts[def.countKey],
    }
  })
}

/* ------------------------------------------------------------------ */
/* Étapes du tunnel                                                    */
/* ------------------------------------------------------------------ */

type FunnelStageDef =
  | {
      key: string
      label: string
      metricKey: string
      source: string
      freshness: Freshness
      cohort: CohortUnit
      kind: 'proven'
      countKey: keyof ConversionCounts
    }
  | {
      key: string
      label: string
      metricKey: string
      source: string
      freshness: Freshness
      cohort: CohortUnit
      kind: 'unavailable'
      reason: string
    }

/**
 * Les 6 étapes VISITES → INSCRIPTIONS → ENGAGEMENT → PARCOURS → COMPLÉTIONS →
 * CONVERSIONS. Chaque unité de cohorte est DISTINCTE des voisines ⇒ tous les taux
 * inter-étapes sortent UNAVAILABLE (comportement honnête, cf. funnel.ts).
 */
export const FUNNEL_STAGE_DEFS: ReadonlyArray<FunnelStageDef> = [
  {
    key: 'visites',
    label: 'Visites',
    metricKey: 'funnel_visites',
    source: "analytics_events (type='pageview')",
    freshness: 'NEAR_REALTIME',
    cohort: 'pageviews',
    kind: 'proven',
    countKey: 'pageViews',
  },
  {
    key: 'inscriptions',
    label: 'Inscriptions',
    metricKey: 'funnel_inscriptions',
    source: 'profiles.created_at',
    freshness: 'SYNCED',
    cohort: 'new_persons',
    kind: 'proven',
    countKey: 'signups',
  },
  {
    key: 'engagement',
    label: 'Engagement (écoutes podcast)',
    metricKey: 'funnel_engagement',
    source: 'audio_listening_events',
    freshness: 'NEAR_REALTIME',
    cohort: 'plays',
    kind: 'proven',
    countKey: 'podcastPlays',
  },
  {
    key: 'parcours',
    label: 'Parcours (progressions)',
    metricKey: 'funnel_parcours',
    source: 'module_completions.completed_at',
    freshness: 'SYNCED',
    cohort: 'module_completions',
    kind: 'proven',
    countKey: 'moduleCompletions',
  },
  {
    key: 'completions',
    label: 'Complétions (parcours terminés)',
    metricKey: 'funnel_completions',
    source: '—',
    freshness: 'SYNCED',
    cohort: 'unavailable',
    kind: 'unavailable',
    reason:
      "Aucun événement fiable de fin de parcours/formation complet (voir catégorie Accomplissement).",
  },
  {
    key: 'conversions',
    label: 'Conversions (profondes)',
    metricKey: 'funnel_conversions',
    source: '—',
    freshness: 'SYNCED',
    cohort: 'composite',
    kind: 'unavailable',
    reason:
      'La conversion finale regroupe des cohortes hétérogènes (dons, prières, événements) non sommables en un seul nombre. Voir le détail par catégorie.',
  },
]

/** Construit les étapes du tunnel. PURE. Mêmes règles REAL/DEMO/UNAVAILABLE. */
export function buildConversionStages(
  counts: ConversionCounts | null,
  opts: BuildCategoriesOptions,
): FunnelStage[] {
  const demoMode = opts.demo === true || counts === null
  return FUNNEL_STAGE_DEFS.map<FunnelStage>((def) => {
    if (def.kind === 'unavailable') {
      return {
        key: def.key,
        label: def.label,
        metricKey: def.metricKey,
        value: null,
        availability: 'UNAVAILABLE',
        cohort: def.cohort,
        source: def.source,
        freshness: def.freshness,
        reason: def.reason,
      }
    }
    if (demoMode || !counts) {
      return {
        key: def.key,
        label: def.label,
        metricKey: def.metricKey,
        value: null,
        availability: 'DEMO',
        cohort: def.cohort,
        source: def.source,
        freshness: def.freshness,
      }
    }
    return {
      key: def.key,
      label: def.label,
      metricKey: def.metricKey,
      value: counts[def.countKey],
      availability: 'REAL',
      cohort: def.cohort,
      source: def.source,
      freshness: def.freshness,
    }
  })
}
