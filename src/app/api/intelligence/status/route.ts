/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * GET /api/intelligence/status — État RÉEL des sources/canaux (admin-only).
 *
 * Sécurité / honnêteté (règle Doxa) :
 *  - ADMIN_ONLY : gardé explicitement par isAdminRequest (le middleware ne couvre
 *    PAS /api/intelligence, seulement /admin, /member, /auth).
 *  - Chaque source déclare son ÉTAT RÉEL : jamais de faux « connecté », jamais de
 *    fraîcheur mensongère. Un connecteur non configuré reste NOT_CONFIGURED.
 *  - Chaque source est appelée dans un wrapper : une exception d'une source →
 *    état ERROR pour CE canal, jamais un plantage de toute la route.
 *  - NO_SECRET : aucun token/clé ni contenu de credential n'est renvoyé. Les
 *    connecteurs ne remontent que des raisons/propriétés publiques (non sensibles).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import type {
  ChannelId,
  ChannelState,
  ChannelStatus,
  ChannelStatusReport,
} from '@/lib/intelligence/channels/types'
import type { SeoConnectorStatus } from '@/lib/intelligence/seo/types'
import type { Freshness } from '@/lib/intelligence/types/freshness'
import { getSearchConsoleSeo } from '@/lib/intelligence/connectors/google-search-console'
import { getGa4OrganicSeo } from '@/lib/intelligence/connectors/google-analytics'
import { getYouTubeStatus } from '@/lib/intelligence/connectors/youtube'
import {
  getMetaFacebookStatus,
  getMetaInstagramStatus,
} from '@/lib/intelligence/connectors/meta'
import { getWhatsAppStatus } from '@/lib/intelligence/connectors/whatsapp'
import { buildSeoPeriod, parsePeriodKey } from '@/lib/intelligence/seo/period'

export const dynamic = 'force-dynamic'

/**
 * Mapper PUR (testable, sans I/O) : statut connecteur Google → statut canal
 * normalisé. PASS→CONNECTED, NOT_CONFIGURED→NOT_CONFIGURED, ERROR→ERROR.
 * Ne fabrique jamais de `lastSync` : renseigné uniquement quand des données
 * réelles sont servies (CONNECTED).
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

/**
 * Enveloppe honnête : une exception d'une source ne casse jamais la route ;
 * elle dégrade CE canal en ERROR (raison non sensible), les autres restent lus.
 */
async function safeChannel(
  channel: ChannelId,
  displayName: string,
  freshness: Freshness,
  nowIso: string,
  producer: () => Promise<ChannelStatus>,
): Promise<ChannelStatus> {
  try {
    return await producer()
  } catch {
    return {
      channel,
      displayName,
      state: 'ERROR',
      freshness,
      lastSync: null,
      reason: 'status_check_failed',
      setupRequired: false,
      checkedAt: nowIso,
    }
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  // Période par défaut 28j (les deux appels Google en exigent une). Read-only.
  const period = buildSeoPeriod(parsePeriodKey('28d'), Date.now())

  const [gsc, ga4, youtube, facebook, instagram, whatsapp] = await Promise.all([
    safeChannel('google_search_console', 'Google Search Console', 'SEO_DELAYED', nowIso, async () => {
      const data = await getSearchConsoleSeo({ period, nowIso })
      return mapSeoStatusToChannel(
        data.status,
        'google_search_console',
        'Google Search Console',
        'SEO_DELAYED',
        nowIso,
      )
    }),
    safeChannel('google_analytics', 'Google Analytics 4', 'SYNCED', nowIso, async () => {
      const data = await getGa4OrganicSeo({ period, nowIso })
      return mapSeoStatusToChannel(
        data.status,
        'google_analytics',
        'Google Analytics 4',
        'SYNCED',
        nowIso,
      )
    }),
    safeChannel('youtube', 'YouTube', 'SEO_DELAYED', nowIso, () => getYouTubeStatus(nowIso)),
    safeChannel('meta_facebook', 'Facebook', 'SYNCED', nowIso, () => getMetaFacebookStatus(nowIso)),
    safeChannel('meta_instagram', 'Instagram', 'SYNCED', nowIso, () => getMetaInstagramStatus(nowIso)),
    safeChannel('whatsapp', 'WhatsApp (attribution)', 'NEAR_REALTIME', nowIso, () =>
      getWhatsAppStatus(nowIso),
    ),
  ])

  const report: ChannelStatusReport = {
    generatedAt: nowIso,
    channels: [firstPartyStatus(nowIso), gsc, ga4, youtube, facebook, instagram, whatsapp],
  }
  return NextResponse.json(report)
}
