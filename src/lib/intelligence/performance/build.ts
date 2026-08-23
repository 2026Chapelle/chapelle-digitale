/**
 * Construction complète de la surface 5C.
 */

import type { DecisionAvailability, DecisionPeriod } from '../decision/contract'
import type { ChannelStatus } from '../channels/types'
import type { Ga4Data, SearchConsoleData } from '../seo/types'
import type { YouTubeData as YouTubeConnectorData } from '../connectors/youtube/types'
import type { Freshness } from '../types/freshness'
import type {
  PerformanceAlert,
  PerformanceCommandCard,
  PerformanceDomain,
  PerformanceMeasure,
  PerformanceMetric,
  PerformanceSurfacePayload,
  PerformanceWindow,
} from './contract'
import { buildCommandCards, rankAlerts } from './alerts'
import { detectAnomalies } from './anomalies'
import { buildComparableWindows } from './windows'
import { confidenceFromHistory, PERFORMANCE_BASELINE_DAYS } from './thresholds'
import { toPerformanceMetric } from './evolution'
export { toPerformanceMetric } from './evolution'

export interface RangeCounts {
  visits: number
  signups: number
  podcastStarts: number
  progressions: number
}

export interface SeriesHistorySample {
  window: PerformanceWindow
  counts: RangeCounts
}

export interface PerformanceSourceSnapshot {
  youtube: YouTubeConnectorData | null
  gsc: SearchConsoleData | null
  ga4: Ga4Data | null
  metaFacebook: ChannelStatus | null
  metaInstagram: ChannelStatus | null
  whatsapp: ChannelStatus | null
}

export interface PerformanceReadModel {
  period: DecisionPeriod
  currentWindow: PerformanceWindow
  previousWindow: PerformanceWindow
  baselineWindows: PerformanceWindow[]
  current: RangeCounts
  previous: RangeCounts
  baselineHistory: ReadonlyArray<SeriesHistorySample>
  sources: PerformanceSourceSnapshot
  demoMode: boolean
}

export interface MetricDef {
  key: keyof RangeCounts
  label: string
  destination: string
  destinationLabel: string
  freshness: Freshness
  source: string
}

const CITADELLE_METRICS: ReadonlyArray<MetricDef> = [
  {
    key: 'visits',
    label: 'Visites Citadelle',
    destination: '/admin/analytics',
    destinationLabel: 'Ouvrir Analytics',
    freshness: 'NEAR_REALTIME',
    source: 'analytics_events',
  },
  {
    key: 'signups',
    label: 'Inscriptions',
    destination: '/admin/membres',
    destinationLabel: 'Ouvrir Membres',
    freshness: 'SYNCED',
    source: 'profiles',
  },
  {
    key: 'podcastStarts',
    label: 'Écoutes podcast',
    destination: '/admin/podcasts',
    destinationLabel: 'Ouvrir Podcasts',
    freshness: 'NEAR_REALTIME',
    source: 'audio_listening_events',
  },
  {
    key: 'progressions',
    label: 'Progressions parcours',
    destination: '/admin/parcours',
    destinationLabel: 'Ouvrir Parcours',
    freshness: 'SYNCED',
    source: 'module_completions',
  },
]

function metricValue(counts: RangeCounts, key: keyof RangeCounts): number {
  return Number(counts[key] ?? 0)
}

const LIVE_STATES = new Set(['CONNECTED', 'ACTIVE'])

function toWindowFromSeoPeriod(label: string, from: string, to: string, offsetDays: number): PerformanceWindow {
  const sinceIso = `${from}T00:00:00.000Z`
  const untilIso = `${to}T23:59:59.999Z`
  return {
    label,
    sinceIso,
    untilIso,
    spanMs: Math.max(0, Date.parse(untilIso) - Date.parse(sinceIso)),
    offsetDays,
  }
}

function buildCountMetric(
  def: MetricDef,
  counts: RangeCounts,
  previous: RangeCounts,
  baselineHistory: ReadonlyArray<SeriesHistorySample>,
  currentWindow: PerformanceWindow,
  previousWindow: PerformanceWindow,
  baselineWindow: PerformanceWindow,
): PerformanceMetric {
  const baselineValues = baselineHistory.map((sample) => metricValue(sample.counts, def.key))
  const current = {
    value: metricValue(counts, def.key),
    availability: 'REAL' as DecisionAvailability,
  }
  const prev = {
    value: metricValue(previous, def.key),
    availability: 'REAL' as DecisionAvailability,
  }
  return toPerformanceMetric({
    key: def.key,
    label: def.label,
    domain: 'citadelle',
    source: def.source,
    freshness: def.freshness,
    destination: def.destination,
    destinationLabel: def.destinationLabel,
    current,
    previous: prev,
    baselineHistory: baselineValues,
    currentWindow,
    previousWindow,
    baselineWindow,
    note: 'Vérifier la trajectoire sur le module concerné.',
  })
}

function metricMeasure(
  value: number | null,
  availability: DecisionAvailability,
  reason?: string,
): PerformanceMeasure {
  return { value, availability, ...(reason ? { reason } : {}) }
}

type ConnectorStatusLike = { state: string; reason?: string; checkedAt: string }

function connectorAlert(
  id: string,
  domain: PerformanceDomain,
  label: string,
  status: ConnectorStatusLike | null,
  destination: string,
  destinationLabel: string,
): PerformanceAlert | null {
  if (!status || LIVE_STATES.has(status.state)) return null
  return {
    id,
    domain,
    severity: 'medium',
    title: `${label} indisponible`,
    fact: `État du connecteur : ${status.state}.`,
    whyItMatters: 'La source externe ne produit pas de données fiables pour la lecture de performance.',
    confidence: 'LOW',
    freshness: 'SYNCED',
    destination,
    destinationLabel,
    action: status.reason ?? `Configurer ${label.toLowerCase()} avant de lire cette fenêtre.`,
    evidence: [
      {
        metric: label,
        source: id,
        freshness: 'SYNCED',
        current: metricMeasure(null, 'UNAVAILABLE', status.reason ?? 'connecteur indisponible'),
        currentWindow: {
          label: 'Fenêtre connecteur',
          sinceIso: status.checkedAt,
          untilIso: status.checkedAt,
          spanMs: 0,
          offsetDays: 0,
        },
      },
    ],
    priorityScore: 10,
    isActionable: false,
  }
}

function buildPlatformMetrics(input: PerformanceSourceSnapshot, currentWindow: PerformanceWindow): PerformanceMetric[] {
  const out: PerformanceMetric[] = []

  const yt = input.youtube as YouTubeConnectorData | null
  if (yt) {
    const views = yt.trends?.views
    const current = metricMeasure(
      views?.current ?? null,
      (yt.status.state === 'CONNECTED' && views ? 'REAL' : 'NO_DATA') as DecisionAvailability,
    )
    const previous = metricMeasure(
      views?.previous ?? null,
      (views?.previous === null ? 'NO_DATA' : 'REAL') as DecisionAvailability,
    )
    const baselineWindow = yt.period
      ? toWindowFromSeoPeriod('YouTube 28 derniers jours', yt.period.from, yt.period.to, 0)
      : currentWindow
    out.push(
      toPerformanceMetric({
        key: 'youtube_views',
        label: 'YouTube · vues',
        domain: 'platform',
        source: 'youtube_analytics',
        freshness: 'SEO_DELAYED',
        destination: '/admin/intelligence/performance#platform',
        destinationLabel: 'Relire la vue performance',
        current,
        previous,
        baselineHistory: views && views.previous !== null ? [views.previous] : [],
        currentWindow,
        previousWindow: currentWindow,
        baselineWindow,
        note: 'Les données YouTube restent distinctes des résultats Citadelle.',
      }),
    )
    const watch = yt.trends?.watchTimeMinutes
    if (watch) {
      out.push(
        toPerformanceMetric({
          key: 'youtube_watch_time',
          label: 'YouTube · temps de visionnage',
          domain: 'platform',
          source: 'youtube_analytics',
          freshness: 'SEO_DELAYED',
          destination: '/admin/intelligence/performance#platform',
          destinationLabel: 'Relire la vue performance',
          current: metricMeasure(watch.current, 'REAL'),
          previous: metricMeasure(watch.previous, (watch.previous === null ? 'NO_DATA' : 'REAL') as DecisionAvailability),
          baselineHistory: watch.previous !== null ? [watch.previous] : [],
          currentWindow,
          previousWindow: currentWindow,
          baselineWindow,
        }),
      )
    }
  }

  if (input.gsc) {
    const gsc = input.gsc
    out.push(
      toPerformanceMetric({
        key: 'gsc_clicks',
        label: 'Search Console · clics',
        domain: 'platform',
        source: 'google_search_console',
        freshness: 'SEO_DELAYED',
        destination: '/admin/intelligence/performance#platform',
        destinationLabel: 'Relire la vue performance',
        current: metricMeasure(
          gsc.totals?.clicks ?? null,
          (gsc.status.state === 'PASS' && gsc.totals ? 'REAL' : 'UNAVAILABLE') as DecisionAvailability,
        ),
        baselineHistory: [],
        currentWindow,
        baselineWindow: currentWindow,
        note: 'Le contexte Search Console est suivi à part des résultats Citadelle.',
      }),
    )
    out.push(
      toPerformanceMetric({
        key: 'gsc_impressions',
        label: 'Search Console · impressions',
        domain: 'platform',
        source: 'google_search_console',
        freshness: 'SEO_DELAYED',
        destination: '/admin/intelligence/performance#platform',
        destinationLabel: 'Relire la vue performance',
        current: metricMeasure(
          gsc.totals?.impressions ?? null,
          (gsc.status.state === 'PASS' && gsc.totals ? 'REAL' : 'UNAVAILABLE') as DecisionAvailability,
        ),
        baselineHistory: [],
        currentWindow,
        baselineWindow: currentWindow,
      }),
    )
  }

  if (input.ga4) {
    const ga4 = input.ga4
    out.push(
      toPerformanceMetric({
        key: 'ga4_sessions',
        label: 'GA4 organique · sessions',
        domain: 'platform',
        source: 'google_analytics',
        freshness: 'SYNCED',
        destination: '/admin/intelligence/performance#platform',
        destinationLabel: 'Relire la vue performance',
        current: metricMeasure(
          ga4.organic?.sessions ?? null,
          (ga4.status.state === 'PASS' && ga4.organic ? 'REAL' : 'UNAVAILABLE') as DecisionAvailability,
        ),
        baselineHistory: [],
        currentWindow,
        baselineWindow: currentWindow,
      }),
    )
    out.push(
      toPerformanceMetric({
        key: 'ga4_users',
        label: 'GA4 organique · utilisateurs',
        domain: 'platform',
        source: 'google_analytics',
        freshness: 'SYNCED',
        destination: '/admin/intelligence/performance#platform',
        destinationLabel: 'Relire la vue performance',
        current: metricMeasure(
          ga4.organic?.users ?? null,
          (ga4.status.state === 'PASS' && ga4.organic ? 'REAL' : 'UNAVAILABLE') as DecisionAvailability,
        ),
        baselineHistory: [],
        currentWindow,
        baselineWindow: currentWindow,
      }),
    )
  }

  return out
}

export function buildPerformanceSurface(input: PerformanceReadModel): PerformanceSurfacePayload {
  const baselineWindow = input.baselineWindows[0] ?? input.previousWindow
  const citadelle = CITADELLE_METRICS.map((def) =>
    buildCountMetric(
      def,
      input.current,
      input.previous,
      input.baselineHistory,
      input.currentWindow,
      input.previousWindow,
      baselineWindow,
    ),
  )

  const platform = buildPlatformMetrics(input.sources, input.currentWindow)
  const connectorAlerts = [
    connectorAlert(
      'connector:youtube',
      'platform',
      'YouTube',
      input.sources.youtube?.status ?? null,
      '/admin/intelligence/performance#platform',
      'Relire la vue performance',
    ),
    connectorAlert(
      'connector:gsc',
      'platform',
      'Search Console',
      input.sources.gsc?.status ?? null,
      '/admin/intelligence/performance#platform',
      'Relire la vue performance',
    ),
    connectorAlert(
      'connector:ga4',
      'platform',
      'GA4',
      input.sources.ga4?.status ?? null,
      '/admin/intelligence/performance#platform',
      'Relire la vue performance',
    ),
  ].filter((a): a is PerformanceAlert => Boolean(a))

  const alerts = rankAlerts([...detectAnomalies(citadelle), ...detectAnomalies(platform), ...connectorAlerts])
  const commandCards = buildCommandCards(alerts)

  return {
    generatedAt: input.period.untilIso,
    period: input.period,
    baselineWindow: { label: `Médiane mobile ${PERFORMANCE_BASELINE_DAYS} j`, sampleDays: PERFORMANCE_BASELINE_DAYS },
    demoMode: input.demoMode,
    citadelle,
    platform,
    alerts,
    commandCards,
  }
}

export function buildPerformanceReadModel(
  nowIso: string,
  counts: RangeCounts,
  previous: RangeCounts,
  history: ReadonlyArray<SeriesHistorySample>,
  sources: PerformanceSourceSnapshot,
  demoMode: boolean,
): PerformanceReadModel {
  const windows = buildComparableWindows(nowIso, PERFORMANCE_BASELINE_DAYS)
  return {
    period: {
      label: "Aujourd'hui (UTC)",
      sinceIso: windows.current.sinceIso,
      untilIso: windows.current.untilIso,
    },
    currentWindow: windows.current,
    previousWindow: windows.previous,
    baselineWindows: windows.baseline,
    current: counts,
    previous,
    baselineHistory: history,
    sources,
    demoMode,
  }
}
