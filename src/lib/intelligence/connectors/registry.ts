/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * Descripteurs des 5 connecteurs prévus + fabrique de connecteurs de fondation.
 *
 * Aucun secret, aucun réseau. Chaque descripteur documente la fraîcheur nominale
 * et les besoins FUTURS (auth) — sans jamais les mobiliser en Phase 0.
 */

import { NullConnector, type NullConnectorMode } from './null-connector'
import type { ConnectorDescriptor, ConnectorId, IntelligenceConnector } from './types'
import type { MetricSource } from '../types/metrics'

/**
 * Pont canonique ConnectorId → MetricSource. Nécessaire car l'id de connecteur
 * (`whatsapp_attribution`) diffère de la source métrique (`whatsapp`). Toute
 * enveloppe émise par un connecteur DOIT étiqueter `source` via cette table pour
 * éviter des libellés divergents (cf. revue architecture).
 */
export const CONNECTOR_TO_METRIC_SOURCE: Readonly<Record<ConnectorId, MetricSource>> = {
  google_analytics: 'google_analytics',
  google_search_console: 'google_search_console',
  youtube: 'youtube',
  meta: 'meta',
  whatsapp_attribution: 'whatsapp',
}

/** Source métrique canonique d'un connecteur. */
export function connectorMetricSource(id: ConnectorId): MetricSource {
  return CONNECTOR_TO_METRIC_SOURCE[id]
}

export const CONNECTOR_DESCRIPTORS: Readonly<Record<ConnectorId, ConnectorDescriptor>> = {
  google_analytics: {
    id: 'google_analytics',
    displayName: 'Google Analytics 4',
    freshness: 'SYNCED',
    requiresAuth: true,
    requiresNetwork: true, // vrai connecteur futur ; NullConnector force false
    readOnly: true,
  },
  google_search_console: {
    id: 'google_search_console',
    displayName: 'Google Search Console',
    freshness: 'SEO_DELAYED', // données GSC typiquement à J-2/J-3
    requiresAuth: true,
    requiresNetwork: true,
    readOnly: true,
  },
  youtube: {
    id: 'youtube',
    displayName: 'YouTube Data',
    freshness: 'SEO_DELAYED', // stats YouTube différées
    requiresAuth: true,
    requiresNetwork: true,
    readOnly: true,
  },
  meta: {
    id: 'meta',
    displayName: 'Meta (Facebook / Instagram)',
    freshness: 'SYNCED',
    requiresAuth: true,
    requiresNetwork: true,
    readOnly: true,
  },
  whatsapp_attribution: {
    id: 'whatsapp_attribution',
    displayName: 'WhatsApp (attribution)',
    freshness: 'SYNCED',
    // Attribution-only : dérive des UTM/liens wa.me côté first-party.
    // Pas d'API d'écriture, pas de secret requis pour l'attribution de base.
    requiresAuth: false,
    requiresNetwork: false,
    readOnly: true,
  },
}

/**
 * Fabrique un connecteur de FONDATION (NullConnector) pour un id donné.
 * Phase 0 : `available()` = false, aucun I/O.
 */
export function createFoundationConnector(
  id: ConnectorId,
  mode: NullConnectorMode = 'empty',
): IntelligenceConnector {
  return new NullConnector(CONNECTOR_DESCRIPTORS[id], mode)
}

/** Instancie les 5 connecteurs de fondation. */
export function createAllFoundationConnectors(
  mode: NullConnectorMode = 'empty',
): IntelligenceConnector[] {
  return (Object.keys(CONNECTOR_DESCRIPTORS) as ConnectorId[]).map((id) =>
    createFoundationConnector(id, mode),
  )
}
