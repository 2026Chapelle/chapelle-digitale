/**
 * Détection conservatrice d'anomalies.
 */

import type { ConfidenceState } from '../decision/contract'
import type { PerformanceAlert, PerformanceMetric } from './contract'
import { ALERT_SEVERITY_ORDER, canRaisePriorityAction, severityFromChange } from './thresholds'

function confidenceWeight(confidence: ConfidenceState): number {
  return { HIGH: 0, MEDIUM: 1, LOW: 2, INSUFFICIENT_DATA: 3 }[confidence]
}

function severityWeight(severity: PerformanceAlert['severity']): number {
  return ALERT_SEVERITY_ORDER[severity]
}

function num(n: number | null | undefined): string {
  return Number((n ?? 0).toFixed(2)).toLocaleString('fr-FR')
}

function buildFact(metric: PerformanceMetric, baseline: number): string {
  const current = metric.current.value ?? 0
  const diff = current - baseline
  const pct = baseline === 0 ? null : (diff / baseline) * 100
  const sign = diff >= 0 ? '+' : ''
  return `Courant ${num(current)} vs baseline ${num(baseline)} ; écart ${sign}${num(diff)}${pct !== null ? ` (${sign}${num(pct)} %)` : ''}.`
}

export function detectAnomaly(metric: PerformanceMetric): PerformanceAlert | null {
  const current = metric.current.value
  const baseline = metric.baseline?.value ?? null
  if (metric.current.availability !== 'REAL' || current === null || baseline === null) return null

  const severity = severityFromChange(current, baseline, metric.historyCount)
  if (!severity) return null

  const diff = current - baseline
  const pct = baseline === 0 ? null : (diff / baseline) * 100
  const direction = diff >= 0 ? 'hausse' : 'baisse'
  const confidence = metric.confidence
  const actionable = canRaisePriorityAction(confidence, current)

  return {
    id: `${metric.key}:anomaly`,
    domain: metric.domain,
    severity,
    title: `${metric.label} : ${direction} anormale`,
    fact: buildFact(metric, baseline),
    whyItMatters:
      'La fenêtre courante s\'écarte suffisamment de la baseline mobile comparable pour justifier une vérification.',
    confidence,
    freshness: metric.freshness,
    destination: metric.destination,
    destinationLabel: metric.destinationLabel,
    action: actionable ? metric.note ?? `Inspecter ${metric.label.toLowerCase()} sur la fenêtre courante.` : null,
    evidence: metric.evidence,
    priorityScore:
      (5 - severityWeight(severity)) * 100 + (4 - confidenceWeight(confidence)) * 10 + Math.abs(metric.deltaAbs ?? 0),
    isActionable: actionable,
  }
}

export function detectAnomalies(metrics: ReadonlyArray<PerformanceMetric>): PerformanceAlert[] {
  return metrics.map(detectAnomaly).filter((a): a is PerformanceAlert => Boolean(a))
}
