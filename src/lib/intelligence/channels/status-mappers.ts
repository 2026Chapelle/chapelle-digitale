/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Mappers PURS (testables, sans I/O) pour la route /api/intelligence/status.
 * Isolés hors de route.ts : un fichier `route.ts` Next ne peut exporter que des
 * handlers/params de route, jamais des helpers.
 */

import type {
  ChannelId,
  ChannelState,
  ChannelStatus,
} from './types'
import type { SeoConnectorStatus } from '../seo/types'
import type { Freshness } from '../types/freshness'

/**
 * Statut connecteur Google → état canal normalisé.
 * PASS→CONNECTED, NOT_CONFIGURED→NOT_CONFIGURED, ERROR→ERROR.
 */
export function mapSeoStateToChannelState(state: SeoConnectorStatus['state']): ChannelState {
  switch (state) {
    case 'PASS':
      return 'CONNECTED'
    case 'NOT_CONFIGURED':
      return 'NOT_CONFIGURED'
    default:
      return 'ERROR'
  }
}

export function mapSeoStatusToChannel(
  seo: SeoConnectorStatus,
  channel: Extract<ChannelId, 'google_search_console' | 'google_analytics'>,
  displayName: string,
  freshness: Freshness,
  nowIso: string,
): ChannelStatus {
  const state = mapSeoStateToChannelState(seo.state)
  const checkedAt = seo.checkedAt || nowIso
  const status: ChannelStatus = {
    channel,
    displayName,
    state,
    freshness,
    // Une synchro réelle n'existe que si des données réelles sont servies.
    lastSync: state === 'CONNECTED' ? checkedAt : null,
    setupRequired: state === 'NOT_CONFIGURED',
    checkedAt,
  }
  if (seo.reason) status.reason = seo.reason
  if (seo.property) status.property = seo.property
  return status
}

/** Canal first-party : analytics propriétaire Citadelle, actif par nature. */
export function firstPartyStatus(nowIso: string): ChannelStatus {
  return {
    channel: 'first_party',
    displayName: 'Analytics interne (first-party)',
    state: 'ACTIVE',
    freshness: 'REALTIME',
    lastSync: nowIso,
    reason: 'Analytics propriétaire Citadelle (sessions, événements, attribution).',
    checkedAt: nowIso,
  }
}
