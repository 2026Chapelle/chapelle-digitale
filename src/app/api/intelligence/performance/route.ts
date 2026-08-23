/**
 * CITADELLE INTELLIGENCE HUB — 5C-1 · Surface Performance & Command.
 * GET /api/intelligence/performance — admin-only, read-only.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { cached } from '@/lib/cache'
import { getYouTubeData } from '@/lib/intelligence/connectors/youtube'
import { getSearchConsoleSeo } from '@/lib/intelligence/connectors/google-search-console'
import { getGa4OrganicSeo } from '@/lib/intelligence/connectors/google-analytics'
import { getMetaFacebookStatus, getMetaInstagramStatus } from '@/lib/intelligence/connectors/meta'
import { getWhatsAppStatus } from '@/lib/intelligence/connectors/whatsapp'
import { buildSeoPeriod, parsePeriodKey } from '@/lib/intelligence/seo/period'
import type { DecisionPeriod } from '@/lib/intelligence/decision/contract'
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

async function countRange(spec: CountSpec, sinceIso: string, untilIso: string): Promise<number> {
  let q: any = supabaseAdmin.from(spec.table).select('*', { count: 'exact', head: true })
  q = applyFilters(q, spec.filters)
  q = q.gte(spec.timeColumn, sinceIso).lt(spec.timeColumn, untilIso)
  const { count, error } = await q
  if (error) throw new Error(error.message)
  return count ?? 0
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

async function safe<T>(producer: () => Promise<T>): Promise<T | null> {
  try {
    return await producer()
  } catch {
    return null
  }
}

function demoModel(nowIso: string) {
  const windows = buildComparableWindows(nowIso, BASELINE_DAYS)
  const zero: RangeCounts = { visits: 0, signups: 0, podcastStarts: 0, progressions: 0 }
  const history: SeriesHistorySample[] = windows.baseline.map((window) => ({ window, counts: zero }))
  const sources: PerformanceSourceSnapshot = {
    youtube: null,
    gsc: null,
    ga4: null,
    metaFacebook: null,
    metaInstagram: null,
    whatsapp: null,
  }
  return buildPerformanceReadModel(nowIso, zero, zero, history, sources, true)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  if (IS_DEMO_MODE) {
    return NextResponse.json(buildPerformanceSurface(demoModel(nowIso)))
  }

  try {
    const snapshot = await cached(`intelligence:performance:${nowIso.slice(0, 13)}`, TTL_MS, async () => {
      const windows = buildComparableWindows(nowIso, BASELINE_DAYS)
      const current = await readCounts(windows.current)
      const previous = await readCounts(windows.previous)
      const baselineHistory = await Promise.all(
        windows.baseline.map(async (window) => ({ window, counts: await readCounts(window) })),
      )

      const seoPeriod = buildSeoPeriod(parsePeriodKey('28d'), Date.now())
      const [youtube, gsc, ga4, metaFacebook, metaInstagram, whatsapp] = await Promise.all([
        safe(() => getYouTubeData({ period: seoPeriod, nowIso })),
        safe(() => getSearchConsoleSeo({ period: seoPeriod, nowIso })),
        safe(() => getGa4OrganicSeo({ period: seoPeriod, nowIso })),
        safe(() => getMetaFacebookStatus(nowIso)),
        safe(() => getMetaInstagramStatus(nowIso)),
        safe(() => getWhatsAppStatus(nowIso)),
      ])

      const sources: PerformanceSourceSnapshot = {
        youtube,
        gsc,
        ga4,
        metaFacebook,
        metaInstagram,
        whatsapp,
      }

      return buildPerformanceReadModel(nowIso, current, previous, baselineHistory, sources, false)
    })

    return NextResponse.json(buildPerformanceSurface(snapshot))
  } catch {
    return NextResponse.json(buildPerformanceSurface(demoModel(nowIso)), { status: 200 })
  }
}
