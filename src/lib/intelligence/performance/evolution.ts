/**
 * Construction pure des séries de performance.
 */

import type { ConfidenceState, DecisionAvailability } from '../decision/contract'
import type { Freshness } from '../types/freshness'
import type {
  PerformanceDomain,
  PerformanceEvidence,
  PerformanceMeasure,
  PerformanceMetric,
  PerformanceTrend,
  PerformanceWindow,
} from './contract'
import { confidenceFromHistory } from './thresholds'

export interface PerformancePointInput {
  value: number | null
  availability: DecisionAvailability
  reason?: string
}

export interface PerformanceSeriesInput {
  key: string
  label: string
  domain: PerformanceDomain
  source: string
  freshness: Freshness
  destination: string
  destinationLabel: string
  current: PerformancePointInput
  previous?: PerformancePointInput
  baselineHistory: ReadonlyArray<number>
  currentWindow: PerformanceWindow
  previousWindow?: PerformanceWindow
  baselineWindow: PerformanceWindow
  note?: string
}

export interface MetricSeriesSummary {
  current: PerformanceMeasure
  previous?: PerformanceMeasure
  baseline?: PerformanceMeasure
  deltaAbs: number | null
  deltaPct: number | null
  trend: PerformanceTrend
  confidence: ConfidenceState
  evidence: PerformanceEvidence[]
  availability: DecisionAvailability
  historyCount: number
}

function makeMeasure(input: PerformancePointInput): PerformanceMeasure {
  return { value: input.value, availability: input.availability, ...(input.reason ? { reason: input.reason } : {}) }
}

function median(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function trendFromDelta(deltaAbs: number | null, deltaPct: number | null): PerformanceTrend {
  if (deltaAbs === null || deltaPct === null) return 'unknown'
  if (deltaAbs === 0) return 'flat'
  return deltaAbs > 0 ? 'up' : 'down'
}

export function summarizePerformanceSeries(input: PerformanceSeriesInput): MetricSeriesSummary {
  const current = makeMeasure(input.current)
  const previous = input.previous ? makeMeasure(input.previous) : undefined
  const historyCount = input.baselineHistory.length
  const baselineValue = historyCount > 0 ? median(input.baselineHistory) : null
  const baseline: PerformanceMeasure | undefined =
    baselineValue === null ? undefined : { value: baselineValue, availability: 'REAL' }

  const currentValue = current.availability === 'REAL' ? current.value : null
  const baselineNumeric = baseline?.value ?? null
  const deltaAbs =
    currentValue !== null && baselineNumeric !== null ? Number((currentValue - baselineNumeric).toFixed(2)) : null
  const deltaPct =
    currentValue !== null && baselineNumeric !== null && baselineNumeric !== 0
      ? Number((((currentValue - baselineNumeric) / baselineNumeric) * 100).toFixed(2))
      : baselineNumeric === 0 && currentValue !== null && currentValue !== 0
        ? 100
        : null

  const trend = trendFromDelta(deltaAbs, deltaPct)
  const confidence = confidenceFromHistory(historyCount, currentValue ?? 0)
  const evidence: PerformanceEvidence[] = [
    {
      metric: input.label,
      source: input.source,
      freshness: input.freshness,
      current,
      ...(previous ? { previous } : {}),
      ...(baseline ? { baseline } : {}),
      currentWindow: input.currentWindow,
      ...(input.previousWindow ? { previousWindow: input.previousWindow } : {}),
      baselineWindow: input.baselineWindow,
    },
  ]

  return {
    current,
    ...(previous ? { previous } : {}),
    ...(baseline ? { baseline } : {}),
    deltaAbs,
    deltaPct,
    trend,
    confidence,
    evidence,
    availability: current.availability,
    historyCount,
  }
}

export function toPerformanceMetric(
  input: PerformanceSeriesInput,
): PerformanceMetric {
  const summary = summarizePerformanceSeries(input)
  return {
    key: input.key,
    label: input.label,
    domain: input.domain,
    source: input.source,
    freshness: input.freshness,
    availability: summary.availability,
    historyCount: summary.historyCount,
    current: summary.current,
    ...(summary.previous ? { previous: summary.previous } : {}),
    ...(summary.baseline ? { baseline: summary.baseline } : {}),
    deltaAbs: summary.deltaAbs,
    deltaPct: summary.deltaPct,
    trend: summary.trend,
    confidence: summary.confidence,
    evidence: summary.evidence,
    destination: input.destination,
    destinationLabel: input.destinationLabel,
    note: input.note,
  }
}
