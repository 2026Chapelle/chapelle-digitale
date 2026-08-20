/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Contrat canonique d'une MÉTRIQUE normalisée : le "MetricEnvelope".
 *
 * L'UI ne dépend JAMAIS du format d'une API externe. Tout connecteur (GA4, GSC,
 * YouTube, Meta, WhatsApp…) ainsi que les sources first-party existantes doivent
 * produire des MetricEnvelope. C'est le seul format que voit le service
 * Intelligence puis l'UI.
 */

import type { Freshness } from './freshness'

/** Origine logique d'une métrique (source de vérité). */
export const METRIC_SOURCES = [
  'first_party', // événements internes (analytics_events, activity_logs, audio_listening_events, video_progress…)
  'google_analytics',
  'google_search_console',
  'youtube',
  'meta',
  'whatsapp',
  'demo', // donnée de démonstration explicite (jamais confondue avec la prod)
] as const

export type MetricSource = (typeof METRIC_SOURCES)[number]

/** Unité d'une valeur métrique. */
export const METRIC_UNITS = [
  'count', // nombre absolu (vues, sessions, clics…)
  'ratio', // 0..1 (taux de complétion, de conversion…)
  'percent', // 0..100
  'seconds', // durée
  'currency_xof', // FCFA (dons) — devise canonique projet
] as const

export type MetricUnit = (typeof METRIC_UNITS)[number]

/**
 * Enveloppe canonique d'une métrique.
 * - `measured_at` : instant auquel la valeur est mesurée à la source.
 * - `synced_at`   : instant auquel elle est arrivée dans le Hub.
 * - `freshness`   : classe de fraîcheur (cf. Freshness).
 * - `demo`        : true ⇒ donnée de démonstration, à signaler explicitement.
 */
export interface MetricEnvelope {
  source: MetricSource
  metric: string
  value: number
  unit: MetricUnit
  measured_at: string // ISO 8601
  synced_at: string // ISO 8601
  freshness: Freshness
  demo: boolean
  /** Dimensions optionnelles NON identifiantes (jamais de PII brute). */
  dimensions?: Readonly<Record<string, string>>
}

/** Série temporelle d'enveloppes pour une même métrique. */
export interface MetricSeries {
  metric: string
  source: MetricSource
  unit: MetricUnit
  freshness: Freshness
  points: ReadonlyArray<Pick<MetricEnvelope, 'value' | 'measured_at'>>
  demo: boolean
}
