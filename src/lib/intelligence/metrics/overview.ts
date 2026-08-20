/**
 * CITADELLE INTELLIGENCE HUB — HUB-1 (First-party analytics)
 * Service canonique de la VUE GÉNÉRALE. PUR (aucun I/O) : prend des comptes déjà
 * lus + une horloge injectée, et produit des métriques normalisées.
 *
 * L'UI ne connaît JAMAIS les tables sources : elle ne voit que des OverviewMetric.
 * Chaque métrique est explicitement `real` | `demo` | `unavailable` — jamais un
 * nombre fictif présenté comme réel (cf. FIRST-PARTY TRUTH BEFORE EXTERNAL CHANNELS).
 */

import { makeEnvelope } from '../core/metric-envelope'
import type { MetricEnvelope } from '../types/metrics'
import type { Freshness } from '../types/freshness'
import type { OverviewCountKey, OverviewCounts } from '../adapters/count-specs'

export type MetricAvailability = 'real' | 'demo' | 'unavailable'

/**
 * Définition statique d'une carte de la Vue générale.
 * Union discriminée : une source PORTE toujours un countKey ; une carte
 * indisponible porte toujours une raison (état "sans countKey" irreprésentable).
 */
type OverviewMetricDef =
  | { key: string; label: string; kind: 'source'; freshness: Freshness; countKey: OverviewCountKey }
  | { key: string; label: string; kind: 'unavailable'; freshness: Freshness; reason: string }

/**
 * Les 7 cartes de la Vue générale (aligne l'écran cible du GO).
 * 5 réelles (branchées sur des stores existants) + 2 indisponibles honnêtes.
 */
export const OVERVIEW_METRIC_DEFS: ReadonlyArray<OverviewMetricDef> = [
  { key: 'page_views', label: 'Visites', kind: 'source', freshness: 'NEAR_REALTIME', countKey: 'pageViewsToday' },
  // "Sessions actives" (pas "Utilisateurs") : compte des sessions, honnête sur l'anonyme/multi-onglets.
  { key: 'active_sessions', label: 'Sessions actives', kind: 'source', freshness: 'REALTIME', countKey: 'activeSessionsNow' },
  {
    key: 'logins',
    label: 'Connexions',
    kind: 'unavailable',
    freshness: 'NEAR_REALTIME',
    reason: "Aucun événement de connexion fiable (l'attempt 'sign_in_started' est réétiqueté 'custom' et ne prouve pas le succès).",
  },
  { key: 'signups', label: 'Inscriptions', kind: 'source', freshness: 'SYNCED', countKey: 'signupsToday' },
  { key: 'podcast_starts', label: 'Écoutes podcast', kind: 'source', freshness: 'NEAR_REALTIME', countKey: 'podcastStartsToday' },
  {
    key: 'video_starts',
    label: 'Lectures vidéo',
    kind: 'unavailable',
    freshness: 'SYNCED',
    reason: "Pas d'événement de lecture vidéo fiable : le proxy type='video' surcompte (les checkpoints de progression émettent plusieurs lignes).",
  },
  { key: 'lesson_completions', label: 'Progressions parcours', kind: 'source', freshness: 'SYNCED', countKey: 'lessonCompletionsToday' },
]

/** Métrique telle que consommée par l'UI. */
export interface OverviewMetric {
  key: string
  label: string
  availability: MetricAvailability
  /** Enveloppe normalisée si real/demo ; null si unavailable. */
  envelope: MetricEnvelope | null
  /** Raison (indisponible) ou note. */
  reason?: string
}

export interface BuildOverviewInput {
  /** Comptes lus des stores. `null` ⇒ forcé en démo (ex. Supabase non configuré). */
  counts: OverviewCounts | null
  nowIso: string
  /** true ⇒ mode démo explicite (les sources deviennent des cartes DEMO à 0). */
  demo?: boolean
}

export interface OverviewResult {
  generatedAt: string
  demoMode: boolean
  metrics: OverviewMetric[]
}

/**
 * Construit la Vue générale. PURE et déterministe.
 * - kind='unavailable' → availability='unavailable', envelope=null (jamais de 0 trompeur).
 * - mode démo (ou counts=null) → availability='demo', envelope demo=true (value 0).
 * - sinon → availability='real', envelope demo=false avec la vraie valeur.
 */
export function buildOverview(input: BuildOverviewInput): OverviewResult {
  const demoMode = input.demo === true || input.counts === null
  const metrics = OVERVIEW_METRIC_DEFS.map<OverviewMetric>((def) => {
    if (def.kind === 'unavailable') {
      return { key: def.key, label: def.label, availability: 'unavailable', envelope: null, reason: def.reason }
    }
    if (demoMode || !input.counts) {
      return {
        key: def.key,
        label: def.label,
        availability: 'demo',
        envelope: makeEnvelope({
          source: 'demo',
          metric: def.key,
          value: 0,
          unit: 'count',
          freshness: def.freshness,
          syncedAt: input.nowIso,
        }),
      }
    }
    return {
      key: def.key,
      label: def.label,
      availability: 'real',
      envelope: makeEnvelope({
        source: 'first_party',
        metric: def.key,
        value: input.counts[def.countKey],
        unit: 'count',
        freshness: def.freshness,
        measuredAt: input.nowIso,
        syncedAt: input.nowIso,
        demo: false,
        dimensions: { window: def.freshness === 'REALTIME' ? 'now' : 'today' },
      }),
    }
  })
  return { generatedAt: input.nowIso, demoMode, metrics }
}
