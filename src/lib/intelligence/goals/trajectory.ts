import type { DecisionAvailability } from '../decision/contract'
import type { Freshness } from '../types/freshness'

export const SUPPORTED_GOAL_METRICS = ['visits', 'signups', 'podcastStarts', 'progressions'] as const

export type GoalMetricKey = (typeof SUPPORTED_GOAL_METRICS)[number]

export const GOAL_TRAJECTORY_STATES = [
  'NOT_STARTED',
  'ON_TRACK',
  'OFF_TRACK',
  'ACHIEVED',
  'MISSED',
  'NO_GOAL',
  'INSUFFICIENT_DATA',
  'UNAVAILABLE',
] as const

export type GoalTrajectoryState = (typeof GOAL_TRAJECTORY_STATES)[number]

export type GoalStatus = 'ACTIVE' | 'ARCHIVED'

export interface IntelligenceGoalRecord {
  id: string
  organizationId: string
  metricKey: GoalMetricKey
  targetValue: number
  periodStart: string
  periodEnd: string
  status: GoalStatus
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export interface GoalWindow {
  sinceIso: string | null
  untilIso: string | null
}

export interface GoalObservedMeasure {
  value: number | null
  availability: DecisionAvailability
  freshness: Freshness
  source: string
}

export interface GoalTrajectoryEvidence {
  metric: string
  source: string
  freshness: Freshness
  availability: DecisionAvailability
  current: GoalObservedMeasure
  targetValue: number | null
  remainingGap: number | null
  elapsedRatio: number | null
  progressRatio: number | null
  paceRequired: number | null
  goalPeriod: GoalWindow
  observedPeriod: GoalWindow
  trajectoryState: GoalTrajectoryState
}

export interface GoalTrajectory {
  goalId: string | null
  organizationId: string | null
  metricKey: GoalMetricKey
  goalStatus: GoalStatus | null
  state: GoalTrajectoryState
  targetValue: number | null
  periodStart: string | null
  periodEnd: string | null
  goalPeriod: GoalWindow
  observedPeriod: GoalWindow
  observedValue: number | null
  observedAvailability: DecisionAvailability
  availability: DecisionAvailability
  freshness: Freshness
  source: string
  remainingGap: number | null
  elapsedRatio: number | null
  progressRatio: number | null
  paceRequired: number | null
  evidence: GoalTrajectoryEvidence[]
}

type GoalMetricSpec = {
  source: string
  freshness: Freshness
  label: string
}

export const GOAL_METRIC_SPECS: Record<GoalMetricKey, GoalMetricSpec> = {
  visits: { source: 'analytics_events', freshness: 'NEAR_REALTIME', label: 'Visites Citadelle' },
  signups: { source: 'profiles', freshness: 'SYNCED', label: 'Inscriptions' },
  podcastStarts: {
    source: 'audio_listening_events',
    freshness: 'NEAR_REALTIME',
    label: 'Écoutes podcast',
  },
  progressions: {
    source: 'module_completions',
    freshness: 'SYNCED',
    label: 'Progressions parcours',
  },
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function goalStartIso(date: string): string {
  return `${date}T00:00:00.000Z`
}

function goalEndExclusiveIso(date: string): string {
  const d = new Date(goalStartIso(date))
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString()
}

function clampIso(nowIso: string, lowerIso: string, upperIso: string): string {
  const now = Date.parse(nowIso)
  const lower = Date.parse(lowerIso)
  const upper = Date.parse(upperIso)
  if (now <= lower) return lowerIso
  if (now >= upper) return upperIso
  return nowIso
}

function elapsedRatio(nowIso: string, startIso: string, endExclusiveIso: string): number {
  const now = Date.parse(nowIso)
  const start = Date.parse(startIso)
  const end = Date.parse(endExclusiveIso)
  if (!Number.isFinite(now) || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  if (now <= start) return 0
  if (now >= end) return 1
  return (now - start) / (end - start)
}

function remainingDays(nowIso: string, endExclusiveIso: string): number {
  const now = Date.parse(nowIso)
  const end = Date.parse(endExclusiveIso)
  if (!Number.isFinite(now) || !Number.isFinite(end)) return 0
  if (now >= end) return 0
  return (end - now) / MS_PER_DAY
}

function buildEmptyTrajectory(metricKey: GoalMetricKey, nowIso: string): GoalTrajectory {
  const spec = GOAL_METRIC_SPECS[metricKey]
  return {
    goalId: null,
    organizationId: null,
    metricKey,
    goalStatus: null,
    state: 'NO_GOAL',
    targetValue: null,
    periodStart: null,
    periodEnd: null,
    goalPeriod: { sinceIso: null, untilIso: null },
    observedPeriod: { sinceIso: null, untilIso: null },
    observedValue: null,
    observedAvailability: 'NOT_APPLICABLE',
    availability: 'NOT_APPLICABLE',
    freshness: spec.freshness,
    source: spec.source,
    remainingGap: null,
    elapsedRatio: null,
    progressRatio: null,
    paceRequired: null,
    evidence: [
      {
        metric: spec.label,
        source: spec.source,
        freshness: spec.freshness,
        availability: 'NOT_APPLICABLE',
        current: { value: null, availability: 'NOT_APPLICABLE', freshness: spec.freshness, source: spec.source },
        targetValue: null,
        remainingGap: null,
        elapsedRatio: null,
        progressRatio: null,
        paceRequired: null,
        goalPeriod: { sinceIso: null, untilIso: null },
        observedPeriod: { sinceIso: null, untilIso: null },
        trajectoryState: 'NO_GOAL',
      },
    ],
  }
}

export function evaluateGoalTrajectory(input: {
  nowIso: string
  goal: IntelligenceGoalRecord | null
  observed: GoalObservedMeasure | null
  metricKey?: GoalMetricKey
}): GoalTrajectory {
  const metricKey = input.metricKey ?? input.goal?.metricKey ?? 'visits'
  const spec = GOAL_METRIC_SPECS[metricKey]
  if (!input.goal) {
    return buildEmptyTrajectory(metricKey, input.nowIso)
  }

  const goalStart = goalStartIso(input.goal.periodStart)
  const goalEndExclusive = goalEndExclusiveIso(input.goal.periodEnd)
  const observedPeriodUntil = clampIso(input.nowIso, goalStart, goalEndExclusive)
  const isBeforeStart = Date.parse(input.nowIso) < Date.parse(goalStart)
  const isExpired = Date.parse(input.nowIso) >= Date.parse(goalEndExclusive)

  const observedValue = input.observed?.value ?? null
  const observedAvailability = input.observed?.availability ?? 'NO_DATA'
  const freshness = input.observed?.freshness ?? spec.freshness
  const source = input.observed?.source ?? spec.source

  if (observedAvailability === 'UNAVAILABLE') {
    return {
      goalId: input.goal.id,
      organizationId: input.goal.organizationId,
      metricKey,
      goalStatus: input.goal.status,
      state: 'UNAVAILABLE',
      targetValue: input.goal.targetValue,
      periodStart: input.goal.periodStart,
      periodEnd: input.goal.periodEnd,
      goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
      observedPeriod: { sinceIso: goalStart, untilIso: observedPeriodUntil },
      observedValue: null,
      observedAvailability,
      availability: observedAvailability,
      freshness,
      source,
      remainingGap: null,
      elapsedRatio: isBeforeStart ? 0 : isExpired ? 1 : elapsedRatio(input.nowIso, goalStart, goalEndExclusive),
      progressRatio: null,
      paceRequired: null,
      evidence: [
        {
          metric: spec.label,
          source,
          freshness,
          availability: observedAvailability,
          current: { value: null, availability: observedAvailability, freshness, source },
          targetValue: input.goal.targetValue,
          remainingGap: null,
          elapsedRatio: isBeforeStart ? 0 : isExpired ? 1 : elapsedRatio(input.nowIso, goalStart, goalEndExclusive),
          progressRatio: null,
          paceRequired: null,
          goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
          observedPeriod: { sinceIso: goalStart, untilIso: observedPeriodUntil },
          trajectoryState: 'UNAVAILABLE',
        },
      ],
    }
  }

  if (isBeforeStart) {
    const remainingGap = observedValue === null ? null : Math.max(input.goal.targetValue - observedValue, 0)
    const ratio = observedValue === null ? null : observedValue / input.goal.targetValue
    return {
      goalId: input.goal.id,
      organizationId: input.goal.organizationId,
      metricKey,
      goalStatus: input.goal.status,
      state: 'NOT_STARTED',
      targetValue: input.goal.targetValue,
      periodStart: input.goal.periodStart,
      periodEnd: input.goal.periodEnd,
      goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
      observedPeriod: { sinceIso: goalStart, untilIso: observedPeriodUntil },
      observedValue,
      observedAvailability,
      availability: observedAvailability,
      freshness,
      source,
      remainingGap,
      elapsedRatio: 0,
      progressRatio: ratio,
      paceRequired: null,
      evidence: [
        {
          metric: spec.label,
          source,
          freshness,
          availability: observedAvailability,
          current: { value: observedValue, availability: observedAvailability, freshness, source },
          targetValue: input.goal.targetValue,
          remainingGap,
          elapsedRatio: 0,
          progressRatio: ratio,
          paceRequired: null,
          goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
          observedPeriod: { sinceIso: goalStart, untilIso: observedPeriodUntil },
          trajectoryState: 'NOT_STARTED',
        },
      ],
    }
  }

  if (observedValue === null) {
    return {
      goalId: input.goal.id,
      organizationId: input.goal.organizationId,
      metricKey,
      goalStatus: input.goal.status,
      state: 'INSUFFICIENT_DATA',
      targetValue: input.goal.targetValue,
      periodStart: input.goal.periodStart,
      periodEnd: input.goal.periodEnd,
      goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
      observedPeriod: { sinceIso: goalStart, untilIso: observedPeriodUntil },
      observedValue: null,
      observedAvailability,
      availability: observedAvailability,
      freshness,
      source,
      remainingGap: null,
      elapsedRatio: elapsedRatio(input.nowIso, goalStart, goalEndExclusive),
      progressRatio: null,
      paceRequired: null,
      evidence: [
        {
          metric: spec.label,
          source,
          freshness,
          availability: observedAvailability,
          current: { value: null, availability: observedAvailability, freshness, source },
          targetValue: input.goal.targetValue,
          remainingGap: null,
          elapsedRatio: elapsedRatio(input.nowIso, goalStart, goalEndExclusive),
          progressRatio: null,
          paceRequired: null,
          goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
          observedPeriod: { sinceIso: goalStart, untilIso: observedPeriodUntil },
          trajectoryState: 'INSUFFICIENT_DATA',
        },
      ],
    }
  }

  const currentElapsedRatio = elapsedRatio(input.nowIso, goalStart, goalEndExclusive)
  const progress = observedValue / input.goal.targetValue
  const remainingGap = Math.max(input.goal.targetValue - observedValue, 0)
  const pace = currentElapsedRatio >= 1 ? null : remainingDays(input.nowIso, goalEndExclusive) > 0 ? remainingGap / remainingDays(input.nowIso, goalEndExclusive) : null
  if (observedValue >= input.goal.targetValue) {
    return {
      goalId: input.goal.id,
      organizationId: input.goal.organizationId,
      metricKey,
      goalStatus: input.goal.status,
      state: 'ACHIEVED',
      targetValue: input.goal.targetValue,
      periodStart: input.goal.periodStart,
      periodEnd: input.goal.periodEnd,
      goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
      observedPeriod: { sinceIso: goalStart, untilIso: observedPeriodUntil },
      observedValue,
      observedAvailability,
      availability: observedAvailability,
      freshness,
      source,
      remainingGap: 0,
      elapsedRatio: currentElapsedRatio,
      progressRatio: progress,
      paceRequired: 0,
      evidence: [
        {
          metric: spec.label,
          source,
          freshness,
          availability: observedAvailability,
          current: { value: observedValue, availability: observedAvailability, freshness, source },
          targetValue: input.goal.targetValue,
          remainingGap: 0,
          elapsedRatio: currentElapsedRatio,
          progressRatio: progress,
          paceRequired: 0,
          goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
          observedPeriod: { sinceIso: goalStart, untilIso: observedPeriodUntil },
          trajectoryState: 'ACHIEVED',
        },
      ],
    }
  }

  if (isExpired) {
    const state = observedValue >= input.goal.targetValue ? 'ACHIEVED' : 'MISSED'
    return {
      goalId: input.goal.id,
      organizationId: input.goal.organizationId,
      metricKey,
      goalStatus: input.goal.status,
      state,
      targetValue: input.goal.targetValue,
      periodStart: input.goal.periodStart,
      periodEnd: input.goal.periodEnd,
      goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
      observedPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
      observedValue,
      observedAvailability,
      availability: observedAvailability,
      freshness,
      source,
      remainingGap,
      elapsedRatio: 1,
      progressRatio: progress,
      paceRequired: state === 'ACHIEVED' ? 0 : null,
      evidence: [
        {
          metric: spec.label,
          source,
          freshness,
          availability: observedAvailability,
          current: { value: observedValue, availability: observedAvailability, freshness, source },
          targetValue: input.goal.targetValue,
          remainingGap,
          elapsedRatio: 1,
          progressRatio: progress,
          paceRequired: state === 'ACHIEVED' ? 0 : null,
          goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
          observedPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
          trajectoryState: state,
        },
      ],
    }
  }

  const state = progress >= currentElapsedRatio ? 'ON_TRACK' : 'OFF_TRACK'
  return {
    goalId: input.goal.id,
    organizationId: input.goal.organizationId,
    metricKey,
    goalStatus: input.goal.status,
    state,
    targetValue: input.goal.targetValue,
    periodStart: input.goal.periodStart,
    periodEnd: input.goal.periodEnd,
    goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
    observedPeriod: { sinceIso: goalStart, untilIso: observedPeriodUntil },
    observedValue,
    observedAvailability,
    availability: observedAvailability,
    freshness,
    source,
    remainingGap,
    elapsedRatio: currentElapsedRatio,
    progressRatio: progress,
    paceRequired: pace,
    evidence: [
      {
        metric: spec.label,
        source,
        freshness,
        availability: observedAvailability,
        current: { value: observedValue, availability: observedAvailability, freshness, source },
        targetValue: input.goal.targetValue,
        remainingGap,
        elapsedRatio: currentElapsedRatio,
        progressRatio: progress,
        paceRequired: pace,
        goalPeriod: { sinceIso: goalStart, untilIso: goalEndExclusive },
        observedPeriod: { sinceIso: goalStart, untilIso: observedPeriodUntil },
        trajectoryState: state,
      },
    ],
  }
}
