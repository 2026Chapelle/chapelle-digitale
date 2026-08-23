/**
 * Alertes et cartes de commande 5C.
 */

import type { PerformanceAlert, PerformanceCommandCard } from './contract'
import { ALERT_SEVERITY_ORDER, MIN_PRIORITY_SAMPLE_SIZE } from './thresholds'

function confidenceWeight(confidence: PerformanceAlert['confidence']): number {
  return { HIGH: 0, MEDIUM: 1, LOW: 2, INSUFFICIENT_DATA: 3 }[confidence]
}

function severityWeight(severity: PerformanceAlert['severity']): number {
  return ALERT_SEVERITY_ORDER[severity]
}

export function rankAlerts(alerts: ReadonlyArray<PerformanceAlert>): PerformanceAlert[] {
  return [...alerts].sort((a, b) => {
    const sev = severityWeight(a.severity) - severityWeight(b.severity)
    if (sev !== 0) return sev
    const conf = confidenceWeight(a.confidence) - confidenceWeight(b.confidence)
    if (conf !== 0) return conf
    const pri = b.priorityScore - a.priorityScore
    if (pri !== 0) return pri
    return a.id.localeCompare(b.id)
  })
}

export function buildCommandCards(alerts: ReadonlyArray<PerformanceAlert>): PerformanceCommandCard[] {
  const ranked = rankAlerts(alerts).filter((a) => a.isActionable)
  return ranked
    .filter((a) => (a.evidence[0]?.current.value ?? 0) >= MIN_PRIORITY_SAMPLE_SIZE)
    .map((a, index) => ({
      id: a.id,
      rank: index + 1,
      title: a.title,
      summary: a.fact,
      domain: a.domain,
      confidence: a.confidence,
      freshness: a.freshness,
      destination: a.destination,
      destinationLabel: a.destinationLabel,
      action: a.action ?? 'Vérifier la fenêtre courante et les ruptures d\'instrumentation.',
      evidence: a.evidence,
    }))
}
