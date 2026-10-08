import type { GoalMetricKey, GoalStatus, IntelligenceGoalRecord } from './trajectory'

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

export function sanitizeGoalForPerformance(
  goal: IntelligenceGoalRecord,
): Omit<IntelligenceGoalRecord, 'createdBy' | 'updatedBy'> {
  const { createdBy: _createdBy, updatedBy: _updatedBy, ...safe } = goal
  return safe
}
