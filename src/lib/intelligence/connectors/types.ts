/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Contrats de CONNECTEURS.
 *
 * Flux imposé :
 *   API externe → Connector → Normalisation → Storage/Aggregation → Service → UI
 * L'UI ne dépend JAMAIS du format brut d'une API externe : tout connecteur renvoie
 * des MetricEnvelope normalisés.
 *
 * PHASE 0 : contrats uniquement. Aucun appel réseau, aucun secret, aucun
 * process.env. Les implémentations réelles (porteuses de secrets, SERVER-ONLY)
 * appartiennent à une phase ultérieure (HUB-1+).
 */

import type { Freshness } from '../types/freshness'
import type { MetricEnvelope } from '../types/metrics'

/** Identifiants stables des connecteurs prévus. */
export const CONNECTOR_IDS = [
  'google_analytics',
  'google_search_console',
  'youtube',
  'meta',
  'whatsapp_attribution',
] as const

export type ConnectorId = (typeof CONNECTOR_IDS)[number]

/** Fenêtre temporelle demandée à un connecteur (bornes ISO 8601). */
export interface MetricQuery {
  from: string
  to: string
  /** Métriques souhaitées ; vide = ensemble par défaut du connecteur. */
  metrics?: ReadonlyArray<string>
}

/** Métadonnées descriptives d'un connecteur (sans secret). */
export interface ConnectorDescriptor {
  id: ConnectorId
  displayName: string
  /** Fraîcheur nominale des données servies par ce connecteur. */
  freshness: Freshness
  /** Le connecteur RÉEL nécessitera-t-il une authentification côté serveur ? */
  requiresAuth: boolean
  /** Le connecteur RÉEL effectuera-t-il des appels réseau ? */
  requiresNetwork: boolean
  /** Le connecteur est-il READ-ONLY vis-à-vis de la plateforme externe ? (toujours true) */
  readOnly: true
}

/**
 * Contrat commun. En Phase 0, `fetchMetrics` d'une implémentation de fondation
 * ne fait AUCUN I/O : soit elle renvoie [] (Null), soit de la donnée `demo`.
 */
export interface IntelligenceConnector {
  readonly descriptor: ConnectorDescriptor
  /**
   * `available()` indique si le connecteur peut servir de vraies données.
   * En Phase 0 c'est toujours false (pas de secrets, pas de réseau).
   */
  available(): boolean
  /** Renvoie des métriques normalisées. Pur en Phase 0. */
  fetchMetrics(query: MetricQuery): Promise<ReadonlyArray<MetricEnvelope>>
}

/**
 * Contrats spécialisés (alias de domaine ; mêmes garanties que la base).
 * Alias (et non `interface extends {}`) pour rester lint-clean et signaler
 * qu'aucun membre supplémentaire n'est requis tant qu'un connecteur ne diverge pas.
 */
export type GoogleAnalyticsConnector = IntelligenceConnector
export type GoogleSearchConsoleConnector = IntelligenceConnector
export type YouTubeConnector = IntelligenceConnector
export type MetaConnector = IntelligenceConnector
export type WhatsAppAttributionConnector = IntelligenceConnector
