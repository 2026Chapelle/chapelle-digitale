/**
 * CITADELLE INTELLIGENCE — 5C-1 · Performance & Command.
 *
 * Contrat purement local au chantier 5C. Il réutilise les conventions 5A/5B
 * sans toucher au contrat gelé 5B.
 */

import type { ConfidenceState, DecisionAvailability, DecisionPeriod } from '../decision/contract'
import type { Freshness } from '../types/freshness'

export type PerformanceDomain = 'citadelle' | 'platform'

export type PerformanceTrend = 'up' | 'down' | 'flat' | 'unknown'

export type PerformanceAlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface PerformanceWindow {
  label: string
  sinceIso: string
  untilIso: string
  spanMs: number
  offsetDays: number
}

export interface PerformanceMeasure {
  value: number | null
  availability: DecisionAvailability
  reason?: string
}

export interface PerformanceEvidence {
  metric: string
  source: string
  freshness: Freshness
  current: PerformanceMeasure
  previous?: PerformanceMeasure
  baseline?: PerformanceMeasure
  currentWindow: PerformanceWindow
  previousWindow?: PerformanceWindow
  baselineWindow?: PerformanceWindow
}

export interface PerformanceMetric {
  key: string
  label: string
  domain: PerformanceDomain
  source: string
  freshness: Freshness
  availability: DecisionAvailability
  historyCount: number
  current: PerformanceMeasure
  previous?: PerformanceMeasure
  baseline?: PerformanceMeasure
  deltaAbs?: number | null
  deltaPct?: number | null
  trend: PerformanceTrend
  confidence: ConfidenceState
  evidence: PerformanceEvidence[]
  destination: string
  destinationLabel: string
  note?: string
}

export interface PerformanceAlert {
  id: string
  domain: PerformanceDomain
  severity: PerformanceAlertSeverity
  title: string
  fact: string
  whyItMatters: string
  confidence: ConfidenceState
  freshness: Freshness
  destination: string
  destinationLabel: string
  action: string | null
  evidence: PerformanceEvidence[]
  priorityScore: number
  isActionable: boolean
}

export interface PerformanceCommandCard {
  id: string
  rank: number
  title: string
  summary: string
  domain: PerformanceDomain
  confidence: ConfidenceState
  freshness: Freshness
  destination: string
  destinationLabel: string
  action: string
  evidence: PerformanceEvidence[]
}

export interface PerformanceSurfacePayload {
  generatedAt: string
  period: DecisionPeriod
  baselineWindow: { label: string; sampleDays: number }
  demoMode: boolean
  citadelle: PerformanceMetric[]
  platform: PerformanceMetric[]
  alerts: PerformanceAlert[]
  commandCards: PerformanceCommandCard[]
  error?: string
}
