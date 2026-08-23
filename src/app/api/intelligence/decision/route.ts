/**
 * CITADELLE INTELLIGENCE HUB — 5B · SURFACE DE DÉCISION (agrégateur superviseur).
 * GET /api/intelligence/decision — funnel + signaux + canaux + qualité (admin-only).
 *
 * Ce route est le SEUL point IMPUR de la Couche Décision : il lit le réel (réutilise
 * les lecteurs 5A existants + connecteurs read-only) puis compose les builders PURS
 * des agents 1/2/3. Aucune donnée fabriquée ; aucun LLM ; agrégats uniquement.
 *
 * Sécurité / honnêteté :
 *  - ADMIN_ONLY : isAdminRequest (le middleware ne couvre pas /api/intelligence).
 *  - service_role côté serveur uniquement ; NO_RAW_PII (comptes agrégés).
 *  - Chaque source externe est isolée : son échec dégrade CETTE entrée (null),
 *    jamais toute la surface. Fail-safe global → payload démo marqué + flag.
 *  - Meta : jamais d'appel muté ; état honnête (indisponible/en attente).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { cached } from '@/lib/cache'

import { readConversionCounts, type CountDb } from '@/lib/intelligence/conversions'
import { readAcquisition, type RowsDb } from '@/lib/intelligence/adapters/acquisition-reader'
import { buildAcquisition } from '@/lib/intelligence/metrics/acquisition'

import { buildDecisionFunnel } from '@/lib/intelligence/decision/funnel'
import { buildChannelValue, type MetaChannelInput } from '@/lib/intelligence/decision/channels'
import { buildDataQuality } from '@/lib/intelligence/decision/data-quality'
import {
  evaluateSignals,
  type ConnectorStatusInput,
  type DecisionContentFacts,
} from '@/lib/intelligence/decision/signals'
import type {
  DecisionPeriod,
  DecisionSurfacePayload,
} from '@/lib/intelligence/decision/contract'

import { getYouTubeData } from '@/lib/intelligence/connectors/youtube'
import { getSearchConsoleSeo } from '@/lib/intelligence/connectors/google-search-console'
import { getGa4OrganicSeo } from '@/lib/intelligence/connectors/google-analytics'
import {
  getMetaFacebookStatus,
  getMetaInstagramStatus,
} from '@/lib/intelligence/connectors/meta'
import { getWhatsAppStatus } from '@/lib/intelligence/connectors/whatsapp'
import { buildSeoPeriod, parsePeriodKey } from '@/lib/intelligence/seo/period'
import type { SearchConsoleData } from '@/lib/intelligence/seo/types'
import type { YouTubeData } from '@/lib/intelligence/connectors/youtube/types'
import type { ChannelStatus } from '@/lib/intelligence/channels/types'

export const dynamic = 'force-dynamic'

const TTL_MS = 60_000
const PERIOD_LABEL = "Aujourd'hui (UTC)"
const PLATFORM_WINDOW_LABEL = '28 derniers jours'

function startOfTodayUtcIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

/** Fenêtre de décision « aujourd'hui » (funnel + attribution Citadelle). */
function todayPeriod(nowIso: string): DecisionPeriod {
  return { label: PERIOD_LABEL, sinceIso: startOfTodayUtcIso(new Date(nowIso)), untilIso: nowIso }
}

/** Enveloppe honnête : une source qui échoue devient `null` (jamais un plantage). */
async function safe<T>(producer: () => Promise<T>): Promise<T | null> {
  try {
    return await producer()
  } catch {
    return null
  }
}

/** Payload démo explicite (Supabase absent ou échec global). Aucun faux réel. */
function demoSurface(nowIso: string, error?: string): DecisionSurfacePayload {
  const period = todayPeriod(nowIso)
  const funnel = buildDecisionFunnel({ counts: null, period, nowIso, demo: true })
  const channels = buildChannelValue({ acquisition: null, period, nowIso, demo: true })
  const dataQuality = buildDataQuality({ nowIso, funnel, channels })
  const signals = evaluateSignals({
    funnel,
    channels,
    dataQuality,
    period,
    scope: 'citadelle',
    nowIso,
    demo: true,
  })
  return {
    generatedAt: nowIso,
    scope: 'citadelle',
    period,
    demoMode: true,
    signals,
    funnel,
    channels,
    dataQuality,
    ...(error ? { error } : {}),
  }
}

/** Statut Meta → entrée MetaChannelInput honnête (jamais d'appel muté). */
function metaInput(status: ChannelStatus | null, label: string): MetaChannelInput {
  if (!status) {
    return { state: 'UNAVAILABLE', label, reason: 'Connexion Meta en attente (propriété gérée côté propriétaire externe).' }
  }
  return { state: status.state, label, reason: status.reason }
}

/** État connecteur normalisé → entrée de signal (CONNECTOR_STATUS). */
function connStatus(
  channel: string,
  label: string,
  state: string,
  setupRequired?: boolean,
): ConnectorStatusInput {
  return { channel, label, state, setupRequired }
}

/** SEO insuffisant pour conclure : non connecté OU aucune impression réelle. */
function isSeoInsufficient(gsc: SearchConsoleData | null): boolean {
  if (!gsc || gsc.status.state !== 'PASS') return true
  const impressions = gsc.totals?.impressions ?? 0
  return impressions === 0
}

/** Faits de contenu FACTUELS (jamais de recommandation de sujet — cf. 6A hors périmètre). */
function contentFacts(youtube: YouTubeData | null): DecisionContentFacts | null {
  const top = youtube?.topVideos?.[0]
  if (!top) return null
  return {
    mostViewedYouTube: {
      title: top.title,
      views: top.views,
      source: `YouTube Analytics — vidéo la plus vue (${PLATFORM_WINDOW_LABEL})`,
    },
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()

  if (IS_DEMO_MODE) {
    return NextResponse.json(demoSurface(nowIso))
  }

  try {
    const period = todayPeriod(nowIso)
    const seoPeriod = buildSeoPeriod(parsePeriodKey('28d'), Date.now())
    // Fenêtre RÉELLE des données de plateforme (28 j), distincte d'« aujourd'hui » :
    // portée explicitement partout où un nombre de plateforme est affiché.
    const platformPeriod: DecisionPeriod = {
      label: PLATFORM_WINDOW_LABEL,
      sinceIso: seoPeriod.from,
      untilIso: seoPeriod.to,
    }

    // 1) Lectures first-party (bornées, agrégées) — mises en cache court.
    const hourBucket = nowIso.slice(0, 13)
    const snapshot = await cached(`hub:decision:${hourBucket}`, TTL_MS, async () => {
      const captured = new Date()
      const capturedIso = captured.toISOString()
      const sinceTodayIso = startOfTodayUtcIso(captured)
      const [counts, acqRaw] = await Promise.all([
        readConversionCounts(supabaseAdmin as unknown as CountDb, { sinceTodayIso }),
        readAcquisition(supabaseAdmin as unknown as RowsDb, { sinceTodayIso, nowIso: capturedIso }),
      ])
      return { counts, acqRaw, capturedIso }
    })

    // 2) Connecteurs externes read-only, chacun isolé (échec → null).
    const [youtube, gsc, ga4, metaFb, metaIg, whatsapp] = await Promise.all([
      safe(() => getYouTubeData({ period: seoPeriod, nowIso })),
      safe(() => getSearchConsoleSeo({ period: seoPeriod, nowIso })),
      safe(() => getGa4OrganicSeo({ period: seoPeriod, nowIso })),
      safe(() => getMetaFacebookStatus(nowIso)),
      safe(() => getMetaInstagramStatus(nowIso)),
      safe(() => getWhatsAppStatus(nowIso)),
    ])

    // 3) Builders PURS (agents 1/2/3).
    const acquisition = buildAcquisition({
      visits: snapshot.acqRaw.visits,
      signupSources: snapshot.acqRaw.signupSources,
      podcastSources: snapshot.acqRaw.podcastSources,
      parcoursSources: snapshot.acqRaw.parcoursSources,
      nowIso: snapshot.capturedIso,
    })

    const funnel = buildDecisionFunnel({ counts: snapshot.counts, period, nowIso, demo: false })

    const channels = buildChannelValue({
      acquisition,
      youtube: youtube ?? null,
      metaFacebook: metaInput(metaFb, 'Facebook'),
      metaInstagram: metaInput(metaIg, 'Instagram'),
      period,
      platformWindowLabel: PLATFORM_WINDOW_LABEL,
      nowIso,
      demo: false,
    })

    const seoInsufficient = isSeoInsufficient(gsc)

    const dataQuality = buildDataQuality({
      nowIso,
      gscConfigured: gsc?.status.state === 'PASS',
      ga4Configured: ga4?.status.state === 'PASS',
      youtubeConnected: youtube?.status.state === 'CONNECTED',
      funnel,
      channels,
      seoInsufficient,
    })

    const connectorStatuses: ConnectorStatusInput[] = [
      connStatus('youtube', 'YouTube', youtube?.status.state ?? 'ERROR', youtube?.status.setupRequired),
      connStatus('google_search_console', 'Google Search Console', gsc?.status.state ?? 'ERROR'),
      connStatus('google_analytics', 'Google Analytics 4', ga4?.status.state ?? 'ERROR'),
      connStatus('meta_facebook', 'Facebook', metaFb?.state ?? 'UNAVAILABLE', metaFb?.setupRequired),
      connStatus('meta_instagram', 'Instagram', metaIg?.state ?? 'UNAVAILABLE', metaIg?.setupRequired),
      connStatus('whatsapp', 'WhatsApp', whatsapp?.state ?? 'ACTIVE'),
    ]

    const signals = evaluateSignals({
      funnel,
      channels,
      dataQuality,
      period,
      platformPeriod,
      scope: 'citadelle',
      youtubeTrends: youtube?.trends ?? null,
      seoInsufficient,
      connectorStatuses,
      content: contentFacts(youtube ?? null),
      nowIso,
      demo: false,
    })

    const payload: DecisionSurfacePayload = {
      generatedAt: nowIso,
      scope: 'citadelle',
      period,
      demoMode: false,
      signals,
      funnel,
      channels,
      dataQuality,
    }
    return NextResponse.json(payload)
  } catch {
    // Fail-safe honnête : démo marquée + drapeau, jamais un faux réel.
    return NextResponse.json(demoSurface(nowIso, 'read_failed'), { status: 200 })
  }
}
