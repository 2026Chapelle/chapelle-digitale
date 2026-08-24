/**
 * CITADELLE INTELLIGENCE HUB — 5C-1 · Surface Performance & Command.
 * GET /api/intelligence/performance — admin-only, read-only.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { cached } from '@/lib/cache'
import type { ChannelStatus } from '@/lib/intelligence/channels/types'
import { getYouTubeData } from '@/lib/intelligence/connectors/youtube'
import { getSearchConsoleSeo } from '@/lib/intelligence/connectors/google-search-console'
import { getGa4OrganicSeo } from '@/lib/intelligence/connectors/google-analytics'
import { getMetaFacebookStatus, getMetaInstagramStatus } from '@/lib/intelligence/connectors/meta'
import { getWhatsAppStatus } from '@/lib/intelligence/connectors/whatsapp'
import { buildSeoPeriod, parsePeriodKey } from '@/lib/intelligence/seo/period'
import type { DecisionAvailability, DecisionPeriod } from '@/lib/intelligence/decision/contract'
import { buildComparableWindows } from '@/lib/intelligence/performance/windows'
import {
  buildPerformanceReadModel,
  buildPerformanceSurface,
  type PerformanceSourceSnapshot,
  type RangeCounts,
  type SeriesHistorySample,
} from '@/lib/intelligence/performance'

export const dynamic = 'force-dynamic'

const TTL_MS = 60_000
const BASELINE_DAYS = 7

type CountSpec = {
  table: string
  timeColumn: string
  filters?: Array<{ kind: 'eq'; col: string; val: string } | { kind: 'in'; col: string; vals: string[] }>
}

const COUNT_SPECS: Record<keyof RangeCounts, CountSpec> = {
  visits: { table: 'analytics_events', timeColumn: 'created_at', filters: [{ kind: 'eq', col: 'type', val: 'pageview' }] },
  signups: { table: 'profiles', timeColumn: 'created_at' },
  podcastStarts: {
    table: 'audio_listening_events',
    timeColumn: 'occurred_at',
    filters: [{ kind: 'in', col: 'event_type', vals: ['play_start', 'play_resume'] }],
  },
  progressions: { table: 'module_completions', timeColumn: 'completed_at' },
}

function applyFilters(q: any, filters: CountSpec['filters'] | undefined): any {
  let out = q
  for (const f of filters ?? []) {
    if (f.kind === 'eq') out = out.eq(f.col, f.val)
    else out = out.in(f.col, f.vals)
  }
  return out
}

async function countRange(spec: CountSpec, sinceIso: string, untilIso: string): Promise<number | null> {
  let q: any = supabaseAdmin.from(spec.table).select('*', { count: 'exact', head: true })
  q = applyFilters(q, spec.filters)
  q = q.gte(spec.timeColumn, sinceIso).lt(spec.timeColumn, untilIso)
  const { count, error } = await q
  if (error) throw new Error(error.message)
  return count ?? null
}

async function readCounts(window: { sinceIso: string; untilIso: string }): Promise<RangeCounts> {
  const [visits, signups, podcastStarts, progressions] = await Promise.all([
    countRange(COUNT_SPECS.visits, window.sinceIso, window.untilIso),
    countRange(COUNT_SPECS.signups, window.sinceIso, window.untilIso),
    countRange(COUNT_SPECS.podcastStarts, window.sinceIso, window.untilIso),
    countRange(COUNT_SPECS.progressions, window.sinceIso, window.untilIso),
  ])
  return { visits, signups, podcastStarts, progressions }
}

function zeroCounts(): RangeCounts {
  return { visits: 0, signups: 0, podcastStarts: 0, progressions: 0 }
}

function nullCounts(): RangeCounts {
  return { visits: null, signups: null, podcastStarts: null, progressions: null }
}

function emptySources(): PerformanceSourceSnapshot {
  return {
    youtube: null,
    gsc: null,
    ga4: null,
    metaFacebook: null,
    metaInstagram: null,
    whatsapp: null,
  }
}

function demoModel(nowIso: string) {
  const windows = buildComparableWindows(nowIso, BASELINE_DAYS)
  const zero = zeroCounts()
  const history: SeriesHistorySample[] = windows.baseline.map((window) => ({ window, counts: zero }))
  return buildPerformanceReadModel(
    nowIso,
    zero,
    zero,
    history,
    emptySources(),
    true,
    'NO_DATA',
    buildSeoPeriod(parsePeriodKey('28d'), Date.now()),
  )
}

function unavailableConnectorSources(nowIso: string): PerformanceSourceSnapshot {
  return {
    youtube: {
      status: {
        channel: 'youtube',
        displayName: 'YouTube',
        state: 'ERROR',
        freshness: 'SEO_DELAYED',
        checkedAt: nowIso,
        reason: 'connector_unavailable',
      },
      period: null,
      channel: null,
      totals: null,
      previousTotals: null,
      trends: null,
      topVideos: [],
      trafficSources: [],
    } as any,
    gsc: {
      status: {
        connector: 'google_search_console',
        state: 'ERROR',
        configured: true,
        checkedAt: nowIso,
        reason: 'connector_unavailable',
      },
      totals: null,
      queries: [],
      pages: [],
      indexation: [],
      sitemaps: [],
    } as any,
    ga4: {
      status: {
        connector: 'google_analytics',
        state: 'ERROR',
        configured: true,
        checkedAt: nowIso,
        reason: 'connector_unavailable',
      },
      organic: null,
    } as any,
    metaFacebook: {
      channel: 'meta_facebook',
      displayName: 'Meta Facebook',
      state: 'ERROR',
      freshness: 'SYNCED',
      lastSync: null,
      checkedAt: nowIso,
      reason: 'connector_unavailable',
    } as ChannelStatus,
    metaInstagram: {
      channel: 'meta_instagram',
      displayName: 'Meta Instagram',
      state: 'ERROR',
      freshness: 'SYNCED',
      lastSync: null,
      checkedAt: nowIso,
      reason: 'connector_unavailable',
    } as ChannelStatus,
    whatsapp: {
      channel: 'whatsapp',
      displayName: 'WhatsApp',
      state: 'ERROR',
      freshness: 'SYNCED',
      lastSync: null,
      checkedAt: nowIso,
      reason: 'connector_unavailable',
    } as ChannelStatus,
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  const seoPeriod = buildSeoPeriod(parsePeriodKey('28d'), Date.now())
  if (IS_DEMO_MODE) {
    return NextResponse.json(buildPerformanceSurface(demoModel(nowIso)))
  }

  try {
    const snapshot = await cached(`intelligence:performance:${nowIso.slice(0, 13)}`, TTL_MS, async () => {
      const windows = buildComparableWindows(nowIso, BASELINE_DAYS)
      let current = nullCounts()
      let previous = nullCounts()
      let baselineHistory: SeriesHistorySample[] = windows.baseline.map((window) => ({ window, counts: nullCounts() }))
      let missingCountAvailability: DecisionAvailability = 'NO_DATA'

      try {
        current = await readCounts(windows.current)
        previous = await readCounts(windows.previous)
        baselineHistory = await Promise.all(
          windows.baseline.map(async (window) => ({ window, counts: await readCounts(window) })),
        )
      } catch {
        missingCountAvailability = 'UNAVAILABLE'
      }

      const [youtube, gsc, ga4, metaFacebook, metaInstagram, whatsapp] = await Promise.allSettled([
        getYouTubeData({ period: seoPeriod, nowIso }),
        getSearchConsoleSeo({ period: seoPeriod, nowIso }),
        getGa4OrganicSeo({ period: seoPeriod, nowIso }),
        getMetaFacebookStatus(nowIso),
        getMetaInstagramStatus(nowIso),
        getWhatsAppStatus(nowIso),
      ])

      const fallbackSources = unavailableConnectorSources(nowIso)
      const sources: PerformanceSourceSnapshot = {
        youtube: youtube.status === 'fulfilled' ? youtube.value : fallbackSources.youtube,
        gsc: gsc.status === 'fulfilled' ? gsc.value : fallbackSources.gsc,
        ga4: ga4.status === 'fulfilled' ? ga4.value : fallbackSources.ga4,
        metaFacebook: metaFacebook.status === 'fulfilled' ? metaFacebook.value : fallbackSources.metaFacebook,
        metaInstagram: metaInstagram.status === 'fulfilled' ? metaInstagram.value : fallbackSources.metaInstagram,
        whatsapp: whatsapp.status === 'fulfilled' ? whatsapp.value : fallbackSources.whatsapp,
      }

      return buildPerformanceReadModel(
        nowIso,
        current,
        previous,
        baselineHistory,
        sources,
        false,
        missingCountAvailability,
        seoPeriod,
      )
    })

    return NextResponse.json(buildPerformanceSurface(snapshot))
  } catch {
    const fallbackWindows = buildComparableWindows(nowIso, BASELINE_DAYS)
    return NextResponse.json(
      buildPerformanceSurface(
        buildPerformanceReadModel(
          nowIso,
          nullCounts(),
          nullCounts(),
          fallbackWindows.baseline.map((window) => ({ window, counts: nullCounts() })),
          unavailableConnectorSources(nowIso),
          false,
          'UNAVAILABLE',
          seoPeriod,
        ),
      ),
      { status: 200 },
    )
  }
}
