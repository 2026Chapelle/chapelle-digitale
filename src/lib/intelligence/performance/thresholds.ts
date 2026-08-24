/**
 * Seuils 5C conservateurs.
 */

import type { ConfidenceState } from '../decision/contract'
import type { PerformanceAlertSeverity } from './contract'

export const PERFORMANCE_BASELINE_DAYS = 7
export const MIN_HISTORY_FOR_LOW = 3
export const MIN_HISTORY_FOR_MEDIUM = 5
export const MIN_HISTORY_FOR_HIGH = 7
export const MIN_ABSOLUTE_VOLUME_FOR_ANOMALY = 20
export const MIN_ABSOLUTE_DELTA_FOR_ANOMALY = 10
export const MIN_RELATIVE_DELTA_FOR_ANOMALY = 0.25
export const MIN_RELATIVE_DELTA_FOR_HIGH_ANOMALY = 0.4
export const MIN_RELATIVE_DELTA_FOR_ALERT = 0.2
export const MIN_PRIORITY_SAMPLE_SIZE = 20

export const ALERT_SEVERITY_ORDER: Record<PerformanceAlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

export function confidenceFromHistory(historyCount: number, currentVolume: number): ConfidenceState {
  if (historyCount >= MIN_HISTORY_FOR_HIGH && currentVolume >= MIN_PRIORITY_SAMPLE_SIZE) return 'HIGH'
  if (historyCount >= MIN_HISTORY_FOR_MEDIUM && currentVolume >= MIN_PRIORITY_SAMPLE_SIZE) return 'MEDIUM'
  if (historyCount >= MIN_HISTORY_FOR_LOW) return 'LOW'
  return 'INSUFFICIENT_DATA'
}

export function canRaisePriorityAction(confidence: ConfidenceState, currentVolume: number): boolean {
  return confidence === 'HIGH' && currentVolume >= MIN_PRIORITY_SAMPLE_SIZE
}

export function severityFromChange(
  current: number,
  baseline: number,
  historyCount: number,
): PerformanceAlertSeverity | null {
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) return null
  if (historyCount < MIN_HISTORY_FOR_LOW) return null

  const absDelta = Math.abs(current - baseline)
  const relDelta = baseline === 0 ? (current === 0 ? 0 : 1) : absDelta / baseline
  if (absDelta < MIN_ABSOLUTE_DELTA_FOR_ANOMALY && relDelta < MIN_RELATIVE_DELTA_FOR_ANOMALY) {
    return null
  }
  if (historyCount >= MIN_HISTORY_FOR_HIGH && relDelta >= MIN_RELATIVE_DELTA_FOR_HIGH_ANOMALY) {
    return 'high'
  }
  if (historyCount >= MIN_HISTORY_FOR_MEDIUM && relDelta >= MIN_RELATIVE_DELTA_FOR_ANOMALY) {
    return 'medium'
  }
  return 'low'
}
