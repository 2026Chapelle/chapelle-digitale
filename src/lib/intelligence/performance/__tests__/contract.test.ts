import { describe, expect, it } from 'vitest'
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

const NOW = '2026-08-23T12:00:00.000Z'

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
  return buildPerformanceReadModel(NOW, current, previous, history, sampleSource(), false)
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
    expect([...keys]).not.toEqual(expect.arrayContaining(['userId', 'memberId', 'membre_id', 'firstname', 'lastname', 'pays']))
  })

  it('deterministic ranking returns the same command cards for the same input', () => {
    const payload1 = buildPerformanceSurface(sampleReadModel())
    const payload2 = buildPerformanceSurface(sampleReadModel())
    expect(payload1.commandCards.map((c) => c.id)).toEqual(payload2.commandCards.map((c) => c.id))
    expect(payload1.commandCards.map((c) => c.rank)).toEqual(payload2.commandCards.map((c) => c.rank))
  })
})
