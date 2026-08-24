import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DECISION_AVAILABILITIES,
  DECISION_FUNNEL_STAGE_ORDER,
  DECISION_NO_VALUE,
  DECISION_SIGNAL_CATEGORIES,
} from '../../decision/contract'
import { buildComparableWindows } from '../windows'
import { buildPerformanceReadModel, buildPerformanceSurface, toPerformanceMetric } from '../build'
import { buildCommandCards } from '../alerts'
import { detectAnomaly } from '../anomalies'
import { buildSeoPeriod } from '../../seo/period'

const NOW = '2026-08-23T12:00:00.000Z'

vi.mock('server-only', () => ({}))

const isAdminRequest = vi.fn((_req: unknown) => true)
vi.mock('@/lib/admin-auth', () => ({
  isAdminRequest: (req: unknown) => isAdminRequest(req),
}))

const from = vi.fn()
vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
  supabaseAdmin: { from: (...args: unknown[]) => from(...args) },
}))

vi.mock('@/lib/cache', () => ({
  cached: async (_key: string, _ttl: number, producer: () => Promise<unknown>) => producer(),
}))

const getYouTubeData = vi.fn()
const getSearchConsoleSeo = vi.fn()
const getGa4OrganicSeo = vi.fn()
const getMetaFacebookStatus = vi.fn()
const getMetaInstagramStatus = vi.fn()
const getWhatsAppStatus = vi.fn()

vi.mock('@/lib/intelligence/connectors/youtube', () => ({
  getYouTubeData: (...args: unknown[]) => getYouTubeData(...args),
}))
vi.mock('@/lib/intelligence/connectors/google-search-console', () => ({
  getSearchConsoleSeo: (...args: unknown[]) => getSearchConsoleSeo(...args),
}))
vi.mock('@/lib/intelligence/connectors/google-analytics', () => ({
  getGa4OrganicSeo: (...args: unknown[]) => getGa4OrganicSeo(...args),
}))
vi.mock('@/lib/intelligence/connectors/meta', () => ({
  getMetaFacebookStatus: (...args: unknown[]) => getMetaFacebookStatus(...args),
  getMetaInstagramStatus: (...args: unknown[]) => getMetaInstagramStatus(...args),
}))
vi.mock('@/lib/intelligence/connectors/whatsapp', () => ({
  getWhatsAppStatus: (...args: unknown[]) => getWhatsAppStatus(...args),
}))

import { GET } from '@/app/api/intelligence/performance/route'
import type { DecisionPeriod } from '../../decision/contract'

function sampleSource() {
  return {
    youtube: {
      status: { channel: 'youtube', displayName: 'YouTube', state: 'CONNECTED', freshness: 'SEO_DELAYED', lastSync: NOW, checkedAt: NOW },
      period: { key: '28d', from: '2026-08-01', to: '2026-08-21', prevFrom: '2026-07-04', prevTo: '2026-07-31' },
      channel: null,
      totals: null,
      previousTotals: null,
      trends: {
        views: { current: 120, previous: 100, trend: 'up', delta: 0.2 },
        watchTimeMinutes: { current: 240, previous: 200, trend: 'up', delta: 0.2 },
        subscribersNet: { current: 4, previous: 3, trend: 'up', delta: 0.333 },
        averageViewDurationSec: { current: 0, previous: 0, trend: 'flat', delta: 0 },
      },
      topVideos: [],
      trafficSources: [],
    } as any,
    gsc: null,
    ga4: null,
    metaFacebook: null,
    metaInstagram: null,
    whatsapp: null,
  }
}

function sampleReadModel() {
  const windows = buildComparableWindows(NOW, 7)
  const current = { visits: 120, signups: 18, podcastStarts: 14, progressions: 11 }
  const previous = { visits: 90, signups: 15, podcastStarts: 12, progressions: 9 }
  const history = windows.baseline.map((window) => ({ window, counts: { visits: 30, signups: 6, podcastStarts: 5, progressions: 4 } }))
  const platformPeriod = buildSeoPeriod('28d', Date.parse(NOW))
  return buildPerformanceReadModel(NOW, current, previous, history, sampleSource(), false, 'NO_DATA', platformPeriod)
}

function zeroReadModel() {
  const windows = buildComparableWindows(NOW, 7)
  const current = { visits: 0, signups: 0, podcastStarts: 0, progressions: 0 }
  const previous = { visits: 0, signups: 0, podcastStarts: 0, progressions: 0 }
  const history = windows.baseline.map((window) => ({ window, counts: { visits: 0, signups: 0, podcastStarts: 0, progressions: 0 } }))
  const platformPeriod = buildSeoPeriod('28d', Date.parse(NOW))
  return buildPerformanceReadModel(NOW, current, previous, history, sampleSource(), false, 'NO_DATA', platformPeriod)
}

function unavailableReadModel() {
  const windows = buildComparableWindows(NOW, 7)
  const missing = { visits: null, signups: null, podcastStarts: null, progressions: null }
  const history = windows.baseline.map((window) => ({ window, counts: missing }))
  const platformPeriod = buildSeoPeriod('28d', Date.parse(NOW))
  return buildPerformanceReadModel(NOW, missing, missing, history, sampleSource(), false, 'UNAVAILABLE', platformPeriod)
}

function makeChannelStatus(state: 'CONNECTED' | 'ACTIVE' | 'ERROR' | 'NOT_CONFIGURED') {
  return {
    channel: 'whatsapp',
    displayName: 'WhatsApp',
    state,
    freshness: 'SYNCED',
    lastSync: state === 'CONNECTED' || state === 'ACTIVE' ? NOW : null,
    checkedAt: NOW,
  } as const
}

function makeSearchConsoleStatus(state: 'PASS' | 'ERROR') {
  return {
    status: {
      connector: 'google_search_console',
      state,
      configured: true,
      checkedAt: NOW,
      ...(state === 'PASS' ? { property: 'sc-domain:chapelleduroyaume.org' } : { reason: 'gsc_http_500' }),
    },
    totals: state === 'PASS' ? { clicks: 57, impressions: 900, ctr: 0.0633, position: 3.1, activeQueries: 2, visiblePages: 2 } : null,
    queries: [],
    pages: [],
    indexation: [],
    sitemaps: [],
  }
}

function makeGa4Status(state: 'PASS' | 'ERROR') {
  return {
    status: {
      connector: 'google_analytics',
      state,
      configured: true,
      checkedAt: NOW,
      ...(state === 'PASS' ? { property: 'properties/123' } : { reason: 'ga4_timeout' }),
    },
    organic:
      state === 'PASS'
        ? { sessions: 12, users: 10, engagedSessions: 8, conversions: 3, landingPages: [] }
        : null,
  }
}

function installCountQuery(result: { count: number | null; error: { message: string } | null }) {
  const chain = {
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lt: vi.fn(() => Promise.resolve(result)),
  }
  from.mockReturnValue({
    select: vi.fn(() => chain),
  })
}

function installAdminSuccessSources(overrides: Partial<Record<'youtube' | 'gsc' | 'ga4' | 'metaFacebook' | 'metaInstagram' | 'whatsapp', unknown>> = {}) {
  getYouTubeData.mockResolvedValue(
    overrides.youtube ?? {
      status: { channel: 'youtube', displayName: 'YouTube', state: 'CONNECTED', freshness: 'SEO_DELAYED', lastSync: NOW, checkedAt: NOW },
      period: {
        key: '28d',
        from: '2026-08-01',
        to: '2026-08-21',
        prevFrom: '2026-07-04',
        prevTo: '2026-07-31',
      },
      channel: null,
      totals: null,
      previousTotals: null,
      trends: {
        views: { current: 120, previous: 100, trend: 'up', delta: 0.2 },
        watchTimeMinutes: { current: 240, previous: 200, trend: 'up', delta: 0.2 },
        subscribersNet: { current: 4, previous: 3, trend: 'up', delta: 0.333 },
        averageViewDurationSec: { current: 0, previous: 0, trend: 'flat', delta: 0 },
      },
      topVideos: [],
      trafficSources: [],
    },
  )
  getSearchConsoleSeo.mockResolvedValue(overrides.gsc ?? makeSearchConsoleStatus('PASS'))
  getGa4OrganicSeo.mockResolvedValue(overrides.ga4 ?? makeGa4Status('PASS'))
  getMetaFacebookStatus.mockResolvedValue(overrides.metaFacebook ?? makeChannelStatus('CONNECTED'))
  getMetaInstagramStatus.mockResolvedValue(overrides.metaInstagram ?? makeChannelStatus('CONNECTED'))
  getWhatsAppStatus.mockResolvedValue(overrides.whatsapp ?? makeChannelStatus('ACTIVE'))
}

function installRouteHarness(countResult: { count: number | null; error: { message: string } | null }) {
  installCountQuery(countResult)
  installAdminSuccessSources()
}

function performanceByKey(payload: { citadelle: Array<{ key: string }>; platform: Array<{ key: string }> }, key: string) {
  return payload.citadelle.find((m) => m.key === key) ?? payload.platform.find((m) => m.key === key)
}

describe('5C performance contract', () => {
  it('missing data never becomes zero and NO_DATA stays distinct from UNAVAILABLE', () => {
    const metric = toPerformanceMetric({
      key: 'visits',
      label: 'Visites Citadelle',
      domain: 'citadelle',
      source: 'analytics_events',
      freshness: 'NEAR_REALTIME',
      destination: '/admin/analytics',
      destinationLabel: 'Ouvrir Analytics',
      current: { value: null, availability: 'NO_DATA', reason: 'source connected but empty' },
      baselineHistory: [],
      currentWindow: buildComparableWindows(NOW, 7).current,
      baselineWindow: buildComparableWindows(NOW, 7).baseline[0],
    })

    expect(metric.current.value).toBeNull()
    expect(metric.current.availability).toBe('NO_DATA')
    expect(metric.current.availability).not.toBe('UNAVAILABLE')
    expect(metric.current.value).not.toBe(0)
  })

  it('insufficient history cannot trigger a HIGH-confidence anomaly', () => {
    const metric = toPerformanceMetric({
      key: 'visits',
      label: 'Visites Citadelle',
      domain: 'citadelle',
      source: 'analytics_events',
      freshness: 'NEAR_REALTIME',
      destination: '/admin/analytics',
      destinationLabel: 'Ouvrir Analytics',
      current: { value: 100, availability: 'REAL' },
      previous: { value: 95, availability: 'REAL' },
      baselineHistory: [20, 22],
      currentWindow: buildComparableWindows(NOW, 7).current,
      previousWindow: buildComparableWindows(NOW, 7).previous,
      baselineWindow: buildComparableWindows(NOW, 7).baseline[0],
    })

    const anomaly = detectAnomaly(metric)
    expect(anomaly).toBeNull()
    expect(metric.confidence).toBe('INSUFFICIENT_DATA')
  })

  it('small samples cannot generate priority actions', () => {
    const metric = toPerformanceMetric({
      key: 'signups',
      label: 'Inscriptions',
      domain: 'citadelle',
      source: 'profiles',
      freshness: 'SYNCED',
      destination: '/admin/membres',
      destinationLabel: 'Ouvrir Membres',
      current: { value: 5, availability: 'REAL' },
      previous: { value: 4, availability: 'REAL' },
      baselineHistory: [20, 21, 19, 20, 22, 19, 20],
      currentWindow: buildComparableWindows(NOW, 7).current,
      previousWindow: buildComparableWindows(NOW, 7).previous,
      baselineWindow: buildComparableWindows(NOW, 7).baseline[0],
    })

    const anomaly = detectAnomaly(metric)
    expect(anomaly?.isActionable).toBe(false)
    expect(buildCommandCards(anomaly ? [anomaly] : [])).toHaveLength(0)
  })

  it('anomaly baseline windows are comparable', () => {
    const windows = buildComparableWindows(NOW, 7)
    expect(windows.current.spanMs).toBe(windows.previous.spanMs)
    expect(windows.baseline).toHaveLength(7)
    for (const baseline of windows.baseline) {
      expect(baseline.spanMs).toBe(windows.current.spanMs)
    }
  })

  it('platform metrics stay distinct from Citadelle outcomes', () => {
    const payload = buildPerformanceSurface(sampleReadModel())
    expect(payload.citadelle.every((m) => m.domain === 'citadelle')).toBe(true)
    expect(payload.platform.every((m) => m.domain === 'platform')).toBe(true)
    expect(payload.citadelle.some((m) => m.label.includes('YouTube'))).toBe(false)
    expect(payload.platform.some((m) => m.label.includes('YouTube'))).toBe(true)
  })

  it('real zero remains zero', () => {
    const payload = buildPerformanceSurface(zeroReadModel())
    const visits = payload.citadelle.find((m) => m.key === 'visits')!
    expect(visits.current.availability).toBe('REAL')
    expect(visits.current.value).toBe(0)
  })

  it('platform 28-day period is explicit and separated from the Citadelle daily window', () => {
    const payload = buildPerformanceSurface(sampleReadModel())
    const citadelle = payload.citadelle.find((m) => m.key === 'visits')!
    const platform = payload.platform.find((m) => m.key === 'youtube_views')!
    const citadelleWindow = citadelle.evidence[0].currentWindow
    const platformWindow = platform.evidence[0].currentWindow

    expect(citadelleWindow.label).toBe("Aujourd'hui (UTC)")
    expect(platformWindow.label).not.toBe("Aujourd'hui (UTC)")
    expect(platformWindow.label).toMatch(/28/i)
    expect(platformWindow.spanMs).toBeGreaterThan(citadelleWindow.spanMs)
  })

  it('no regression to frozen 5B contract', () => {
    expect([...DECISION_AVAILABILITIES]).toEqual([
      'REAL',
      'NO_DATA',
      'PARTIAL',
      'UNAVAILABLE',
      'NOT_APPLICABLE',
    ])
    expect([...DECISION_FUNNEL_STAGE_ORDER]).toEqual([
      'CITADELLE_VISIT',
      'SIGNUP',
      'ACTIVATION',
      'ENGAGEMENT',
      'PARCOURS_START',
      'PROGRESSION',
      'CONVERSION',
    ])
    expect(DECISION_SIGNAL_CATEGORIES).toContain('DROP_OFF')
    expect(DECISION_NO_VALUE).toBe('—')
  })

  it('no PII/member-level data survives serialization', () => {
    const payload = buildPerformanceSurface(sampleReadModel())
    const keys = new Set<string>()
    const walk = (value: unknown): void => {
      if (!value || typeof value !== 'object') return
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        keys.add(key)
        walk(nested)
      }
    }
    walk(payload)
    expect(Array.from(keys)).not.toEqual(expect.arrayContaining(['userId', 'memberId', 'membre_id', 'firstname', 'lastname', 'pays']))
  })

  it('deterministic ranking returns the same command cards for the same input', () => {
    const payload1 = buildPerformanceSurface(sampleReadModel())
    const payload2 = buildPerformanceSurface(sampleReadModel())
    expect(payload1.commandCards.map((c) => c.id)).toEqual(payload2.commandCards.map((c) => c.id))
    expect(payload1.commandCards.map((c) => c.rank)).toEqual(payload2.commandCards.map((c) => c.rank))
  })
})

describe('5C performance API regressions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW))
    vi.clearAllMocks()
    isAdminRequest.mockReturnValue(true)
    installAdminSuccessSources()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function req() {
    return new NextRequest('http://localhost/api/intelligence/performance', { method: 'GET' })
  }

  it('DB/read failure does not fall back to demo zeros', async () => {
    installCountQuery({ count: null, error: { message: 'db read failed' } })
    const res = await GET(req())
    expect(res.status).toBe(200)
    const payload = (await res.json()) as { demoMode: boolean; citadelle: Array<{ current: { value: number | null; availability: string } }> }
    expect(payload.demoMode).toBe(false)
    for (const metric of payload.citadelle) {
      expect(metric.current.value).toBeNull()
      expect(metric.current.availability).toBe('UNAVAILABLE')
    }
    expect(JSON.stringify(payload)).not.toContain('"value":0')
  })

  it('connector failure surfaces UNAVAILABLE instead of null demo data', async () => {
    getGa4OrganicSeo.mockRejectedValueOnce(new Error('ga4 exploded'))
    const res = await GET(req())
    expect(res.status).toBe(200)
    const payload = (await res.json()) as {
      demoMode: boolean
      platform: Array<{ key: string; current: { value: number | null; availability: string } }>
    }
    expect(payload.demoMode).toBe(false)
    const ga4 = payload.platform.find((m) => m.key === 'ga4_sessions')
    expect(ga4).toBeDefined()
    expect(ga4?.current.value).toBeNull()
    expect(ga4?.current.availability).toBe('UNAVAILABLE')
  })

  it('missing metric stays unavailable and does not become zero', async () => {
    const metric = toPerformanceMetric({
      key: 'visits',
      label: 'Visites Citadelle',
      domain: 'citadelle',
      source: 'analytics_events',
      freshness: 'NEAR_REALTIME',
      destination: '/admin/analytics',
      destinationLabel: 'Ouvrir Analytics',
      current: { value: null, availability: 'NO_DATA' },
      baselineHistory: [],
      currentWindow: buildComparableWindows(NOW, 7).current,
      baselineWindow: buildComparableWindows(NOW, 7).baseline[0],
    })

    expect(metric.current.value).toBeNull()
    expect(metric.current.availability).toBe('NO_DATA')
    expect(metric.current.value).not.toBe(0)
  })
})
