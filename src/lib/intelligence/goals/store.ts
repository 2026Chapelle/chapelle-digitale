import { supabaseAdmin } from '@/lib/supabase'
import { CITADELLE_COUNT_SPECS, countRange, type RangeCounts } from '../performance/count-sources'
import {
  evaluateGoalTrajectory,
  GOAL_METRIC_SPECS,
  SUPPORTED_GOAL_METRICS,
  type GoalMetricKey,
  type GoalObservedMeasure,
  type GoalStatus,
  type GoalTrajectory,
  type IntelligenceGoalRecord,
} from './trajectory'

export type IntelligenceGoalRow = {
  id: string
  organization_id: string
  metric_key: GoalMetricKey
  target_value: number
  period_start: string
  period_end: string
  status: GoalStatus
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export type GoalInsertInput = {
  organizationId: string
  metricKey: GoalMetricKey
  targetValue: number
  periodStart: string
  periodEnd: string
  status?: GoalStatus
  createdBy: string
  updatedBy: string
}

export type GoalPatchInput = Partial<{
  metricKey: GoalMetricKey
  targetValue: number
  periodStart: string
  periodEnd: string
  status: GoalStatus
}>

const GOAL_COLS =
  'id, organization_id, metric_key, target_value, period_start, period_end, status, created_at, updated_at, created_by, updated_by'

export function toGoalRecord(row: IntelligenceGoalRow): IntelligenceGoalRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    metricKey: row.metric_key,
    targetValue: row.target_value,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  }
}

function goalWindow(date: string): string {
  return `${date}T00:00:00.000Z`
}

function nextDayIso(date: string): string {
  const d = new Date(goalWindow(date))
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

async function fetchGoalRows(organizationId: string, status?: GoalStatus): Promise<IntelligenceGoalRecord[]> {
  let q: any = supabaseAdmin
    .from('intelligence_goals')
    .select(GOAL_COLS)
    .eq('organization_id', organizationId)
  if (status) {
    q = q.eq('status', status)
  }
  const { data, error } = await q.order('period_start', { ascending: true }).order('metric_key', { ascending: true })
  if (error) {
    throw new Error(error.message)
  }
  return (Array.isArray(data) ? data : []).map((row) => toGoalRecord(row as IntelligenceGoalRow))
}

export async function listGoalsForOrganization(organizationId: string): Promise<IntelligenceGoalRecord[]> {
  return fetchGoalRows(organizationId)
}

export async function listActiveGoalsForOrganization(organizationId: string): Promise<IntelligenceGoalRecord[]> {
  return fetchGoalRows(organizationId, 'ACTIVE')
}

export async function getGoalForOrganization(organizationId: string, id: string): Promise<IntelligenceGoalRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('intelligence_goals')
    .select(GOAL_COLS)
    .eq('organization_id', organizationId)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data ? toGoalRecord(data as IntelligenceGoalRow) : null
}

export async function createGoalForOrganization(input: GoalInsertInput): Promise<IntelligenceGoalRecord> {
  const { data, error } = await supabaseAdmin
    .from('intelligence_goals')
    .insert({
      organization_id: input.organizationId,
      metric_key: input.metricKey,
      target_value: input.targetValue,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      status: input.status ?? 'ACTIVE',
      created_by: input.createdBy,
      updated_by: input.updatedBy,
    })
    .select(GOAL_COLS)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('Goal insert returned no row.')
  }
  return toGoalRecord(data as IntelligenceGoalRow)
}

export async function patchGoalForOrganization(
  organizationId: string,
  id: string,
  patch: GoalPatchInput,
  updatedBy: string,
): Promise<IntelligenceGoalRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('intelligence_goals')
    .update({ ...patch, updated_by: updatedBy })
    .eq('organization_id', organizationId)
    .eq('id', id)
    .select(GOAL_COLS)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data ? toGoalRecord(data as IntelligenceGoalRow) : null
}

export async function findDuplicateGoal(
  organizationId: string,
  metricKey: GoalMetricKey,
  periodStart: string,
  periodEnd: string,
  excludeId?: string,
): Promise<IntelligenceGoalRecord | null> {
  let q: any = supabaseAdmin
    .from('intelligence_goals')
    .select(GOAL_COLS)
    .eq('organization_id', organizationId)
    .eq('metric_key', metricKey)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)
  if (excludeId) {
    q = q.neq('id', excludeId)
  }
  const { data, error } = await q.limit(1)
  if (error) {
    throw new Error(error.message)
  }
  const rows = Array.isArray(data) ? data : []
  return rows[0] ? toGoalRecord(rows[0] as IntelligenceGoalRow) : null
}

function goalObservedWindow(goal: IntelligenceGoalRecord, nowIso: string): { sinceIso: string; untilIso: string } {
  const sinceIso = goalWindow(goal.periodStart)
  const untilIso = clampIso(nowIso, sinceIso, nextDayIso(goal.periodEnd))
  return { sinceIso, untilIso }
}

function observedMeasureFromCount(
  value: number | null,
  freshness = GOAL_METRIC_SPECS.visits.freshness,
  source = GOAL_METRIC_SPECS.visits.source,
): GoalObservedMeasure {
  return { value, availability: value === null ? 'NO_DATA' : 'REAL', freshness, source }
}

export async function buildGoalTrajectoriesForOrganization(
  organizationId: string,
  nowIso: string,
): Promise<GoalTrajectory[]> {
  const activeGoals = await listActiveGoalsForOrganization(organizationId)
  const byMetric = new Map<GoalMetricKey, IntelligenceGoalRecord[]>()
  for (const goal of activeGoals) {
    const list = byMetric.get(goal.metricKey) ?? []
    list.push(goal)
    byMetric.set(goal.metricKey, list)
  }

  const out: GoalTrajectory[] = []
  for (const metricKey of SUPPORTED_GOAL_METRICS) {
    const goals = byMetric.get(metricKey) ?? []
    if (goals.length === 0) {
      out.push(evaluateGoalTrajectory({ nowIso, goal: null, observed: null, metricKey }))
      continue
    }

    for (const goal of goals) {
      const spec = GOAL_METRIC_SPECS[metricKey]
      const window = goalObservedWindow(goal, nowIso)
      let observedValue: number | null = null
      try {
        observedValue = await countRange(supabaseAdmin, CITADELLE_COUNT_SPECS[metricKey], window.sinceIso, window.untilIso)
      } catch {
        out.push(
          evaluateGoalTrajectory({
            nowIso,
            goal,
            observed: {
              value: null,
              availability: 'UNAVAILABLE',
              freshness: spec.freshness,
              source: spec.source,
            },
            metricKey,
          }),
        )
        continue
      }

      out.push(
        evaluateGoalTrajectory({
          nowIso,
          goal,
          observed: observedMeasureFromCount(observedValue, spec.freshness, spec.source),
          metricKey,
        }),
      )
    }
  }

  return out
}

export function sanitizeGoalForPerformance(goal: IntelligenceGoalRecord): Omit<IntelligenceGoalRecord, 'createdBy' | 'updatedBy'> {
  const { createdBy: _createdBy, updatedBy: _updatedBy, ...safe } = goal
  return safe
}
