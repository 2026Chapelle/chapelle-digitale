/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Construction et garde-fous PURS autour du MetricEnvelope.
 */

import type { Freshness } from '../types/freshness'
import type {
  MetricEnvelope,
  MetricSource,
  MetricUnit,
} from '../types/metrics'

export interface MakeEnvelopeInput {
  source: MetricSource
  metric: string
  value: number
  unit: MetricUnit
  freshness: Freshness
  /** Instant de mesure à la source (ISO). Défaut = synced. */
  measuredAt?: string
  /** Instant d'arrivée dans le Hub (ISO). Obligatoire pour rester déterministe. */
  syncedAt: string
  demo?: boolean
  dimensions?: Record<string, string>
}

/**
 * Fabrique une enveloppe normalisée. `demo` est explicite : par défaut false
 * pour les vraies sources, mais toute donnée `source: 'demo'` est FORCÉE à demo=true
 * afin qu'aucun nombre fictif ne puisse se faire passer pour de la production.
 */
export function makeEnvelope(input: MakeEnvelopeInput): MetricEnvelope {
  const measured_at = input.measuredAt ?? input.syncedAt
  const demo = input.source === 'demo' ? true : input.demo ?? false
  return {
    source: input.source,
    metric: input.metric,
    value: input.value,
    unit: input.unit,
    measured_at,
    synced_at: input.syncedAt,
    freshness: input.freshness,
    demo,
    dimensions: input.dimensions ? Object.freeze({ ...input.dimensions }) : undefined,
  }
}

/** true si l'enveloppe est une donnée de démonstration. */
export function isDemoEnvelope(env: Pick<MetricEnvelope, 'source' | 'demo'>): boolean {
  return env.demo || env.source === 'demo'
}

/** true si un lot d'enveloppes contient au moins une donnée de démonstration. */
export function containsDemo(envs: ReadonlyArray<Pick<MetricEnvelope, 'source' | 'demo'>>): boolean {
  return envs.some(isDemoEnvelope)
}

/**
 * Validation légère et pure d'une enveloppe (garde-fou avant affichage).
 * Retourne la liste des problèmes (vide = valide).
 */
export function validateEnvelope(env: MetricEnvelope): string[] {
  const problems: string[] = []
  if (!env.metric.trim()) problems.push('metric vide')
  if (!Number.isFinite(env.value)) problems.push('value non finie')
  if (env.unit === 'ratio' && (env.value < 0 || env.value > 1)) {
    problems.push('ratio hors [0,1]')
  }
  if (env.unit === 'percent' && (env.value < 0 || env.value > 100)) {
    problems.push('percent hors [0,100]')
  }
  if (Number.isNaN(Date.parse(env.measured_at))) problems.push('measured_at invalide')
  if (Number.isNaN(Date.parse(env.synced_at))) problems.push('synced_at invalide')
  return problems
}
