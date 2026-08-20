/**
 * CITADELLE INTELLIGENCE HUB — Fondation (Phase 0)
 * NullConnector : implémentation de fondation SANS secret ni réseau.
 *
 * Deux modes :
 *  - 'empty' : renvoie [] (aucune donnée) — utile pour un shell vide honnête.
 *  - 'demo'  : renvoie des enveloppes `source:'demo'` (⇒ demo=true) — jamais
 *              confondues avec la production.
 *
 * `available()` renvoie TOUJOURS false : aucune vraie donnée n'est servie en Phase 0.
 */

import { demoEnvelopes } from '../core/demo'
import type { MetricEnvelope } from '../types/metrics'
import type {
  ConnectorDescriptor,
  IntelligenceConnector,
  MetricQuery,
} from './types'

export type NullConnectorMode = 'empty' | 'demo'

export class NullConnector implements IntelligenceConnector {
  readonly descriptor: ConnectorDescriptor
  private readonly mode: NullConnectorMode

  constructor(descriptor: ConnectorDescriptor, mode: NullConnectorMode = 'empty') {
    // Garde-fou d'architecture : aucun connecteur de fondation n'exige le réseau.
    this.descriptor = { ...descriptor, requiresNetwork: false, readOnly: true }
    this.mode = mode
  }

  /** Phase 0 : jamais de vraie donnée. */
  available(): boolean {
    return false
  }

  async fetchMetrics(query: MetricQuery): Promise<ReadonlyArray<MetricEnvelope>> {
    if (this.mode === 'empty') return []
    // Mode démo : instant d'arrivée = borne haute de la requête (déterministe, pas d'horloge).
    return demoEnvelopes(query.to).map((env) => ({
      ...env,
      metric: `${this.descriptor.id}.${env.metric}`,
    }))
  }
}
