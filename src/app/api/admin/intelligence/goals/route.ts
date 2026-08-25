import { NextResponse, type NextRequest } from 'next/server'
import { canManageWorldSettings, mapUnitGuardError, requireGuardedAdminUnit } from '@/lib/erp'
import {
  createGoalForOrganization,
  findDuplicateGoal,
  getGoalForOrganization,
  listGoalsForOrganization,
  patchGoalForOrganization,
  sanitizeGoalForPerformance,
  toGoalRecord,
} from '@/lib/intelligence/goals'
import { SUPPORTED_GOAL_METRICS, type GoalMetricKey, type GoalStatus } from '@/lib/intelligence/goals'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AdminGoalResponse = ReturnType<typeof toGoalResponse>

function isGoalMetricKey(value: unknown): value is GoalMetricKey {
  return typeof value === 'string' && (SUPPORTED_GOAL_METRICS as readonly string[]).includes(value)
}

function isGoalStatus(value: unknown): value is GoalStatus {
  return value === 'ACTIVE' || value === 'ARCHIVED'
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
}

function toGoalResponse(goal: {
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
}) {
  return {
    id: goal.id,
    organizationId: goal.organizationId,
    metricKey: goal.metricKey,
    targetValue: goal.targetValue,
    periodStart: goal.periodStart,
    periodEnd: goal.periodEnd,
    status: goal.status,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    createdBy: goal.createdBy,
    updatedBy: goal.updatedBy,
  }
}

function toPublicGoal(goal: ReturnType<typeof toGoalResponse>) {
  const { createdBy: _createdBy, updatedBy: _updatedBy, ...publicGoal } = goal
  return publicGoal
}

function parseGoalBody(body: unknown): {
  id?: string
  metricKey?: GoalMetricKey
  targetValue?: number
  periodStart?: string
  periodEnd?: string
  status?: GoalStatus
} | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const obj = body as Record<string, unknown>
  const out: {
    id?: string
    metricKey?: GoalMetricKey
    targetValue?: number
    periodStart?: string
    periodEnd?: string
    status?: GoalStatus
  } = {}

  if ('id' in obj) {
    if (typeof obj.id !== 'string' || !obj.id.trim()) return null
    out.id = obj.id.trim()
  }
  if ('metricKey' in obj) {
    if (!isGoalMetricKey(obj.metricKey)) return null
    out.metricKey = obj.metricKey
  }
  if ('targetValue' in obj) {
    if (typeof obj.targetValue !== 'number' || !Number.isInteger(obj.targetValue) || obj.targetValue <= 0) return null
    out.targetValue = obj.targetValue
  }
  if ('periodStart' in obj) {
    if (!isDateString(obj.periodStart)) return null
    out.periodStart = obj.periodStart
  }
  if ('periodEnd' in obj) {
    if (!isDateString(obj.periodEnd)) return null
    out.periodEnd = obj.periodEnd
  }
  if ('status' in obj) {
    if (!isGoalStatus(obj.status)) return null
    out.status = obj.status
  }
  return out
}

function validatePeriod(start: string | undefined, end: string | undefined): boolean {
  if (!start || !end) return false
  return start <= end
}

export async function GET(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (!canManageWorldSettings(guarded.actor)) {
    return NextResponse.json({ ok: false, message: 'Modification mondiale non autorisée.' }, { status: 403 })
  }

  try {
    const goals = await listGoalsForOrganization(guarded.organizationId)
    return NextResponse.json({
      ok: true,
      data: {
        organizationId: guarded.organizationId,
        supportedMetrics: [...SUPPORTED_GOAL_METRICS],
        goals: goals.map((goal) => toPublicGoal(toGoalResponse(goal))),
      },
    })
  } catch (e: unknown) {
    return mapUnitGuardError(e)
  }
}

export async function POST(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (!canManageWorldSettings(guarded.actor)) {
    return NextResponse.json({ ok: false, message: 'Modification mondiale non autorisée.' }, { status: 403 })
  }

  const body = parseGoalBody(await req.json().catch(() => null))
  if (!body || !body.metricKey || !body.targetValue || !body.periodStart || !body.periodEnd) {
    return NextResponse.json({ ok: false, message: 'Payload invalide.' }, { status: 400 })
  }
  if (!validatePeriod(body.periodStart, body.periodEnd)) {
    return NextResponse.json({ ok: false, message: 'Période invalide.' }, { status: 400 })
  }

  try {
    const duplicate = await findDuplicateGoal(
      guarded.organizationId,
      body.metricKey,
      body.periodStart,
      body.periodEnd,
    )
    if (duplicate) {
      return NextResponse.json({ ok: false, message: 'Objectif déjà défini pour cette période.' }, { status: 409 })
    }

    const goal = await createGoalForOrganization({
      organizationId: guarded.organizationId,
      metricKey: body.metricKey,
      targetValue: body.targetValue,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      status: body.status ?? 'ACTIVE',
      createdBy: guarded.userId,
      updatedBy: guarded.userId,
    })

    return NextResponse.json({ ok: true, data: { goal: toPublicGoal(toGoalResponse(goal)) } })
  } catch (e: unknown) {
    return mapUnitGuardError(e)
  }
}

export async function PATCH(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (!canManageWorldSettings(guarded.actor)) {
    return NextResponse.json({ ok: false, message: 'Modification mondiale non autorisée.' }, { status: 403 })
  }

  const body = parseGoalBody(await req.json().catch(() => null))
  if (!body?.id) {
    return NextResponse.json({ ok: false, message: 'Payload invalide.' }, { status: 400 })
  }

  try {
    const current = await getGoalForOrganization(guarded.organizationId, body.id)
    if (!current) {
      return NextResponse.json({ ok: false, message: 'Objectif introuvable.' }, { status: 404 })
    }

    const nextMetricKey = body.metricKey ?? current.metricKey
    const nextTargetValue = body.targetValue ?? current.targetValue
    const nextPeriodStart = body.periodStart ?? current.periodStart
    const nextPeriodEnd = body.periodEnd ?? current.periodEnd
    const nextStatus = body.status ?? current.status

    if (!validatePeriod(nextPeriodStart, nextPeriodEnd) || nextTargetValue <= 0) {
      return NextResponse.json({ ok: false, message: 'Champ(s) invalide(s).' }, { status: 400 })
    }

    const duplicate = await findDuplicateGoal(
      guarded.organizationId,
      nextMetricKey,
      nextPeriodStart,
      nextPeriodEnd,
      current.id,
    )
    if (duplicate) {
      return NextResponse.json({ ok: false, message: 'Objectif déjà défini pour cette période.' }, { status: 409 })
    }

    const updated = await patchGoalForOrganization(
      guarded.organizationId,
      current.id,
      {
        metricKey: body.metricKey,
        targetValue: body.targetValue,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        status: body.status,
      },
      guarded.userId,
    )

    if (!updated) {
      return NextResponse.json({ ok: false, message: 'Objectif introuvable.' }, { status: 404 })
    }

    const responseGoal = toGoalResponse(updated)
    return NextResponse.json({ ok: true, data: { goal: toPublicGoal(responseGoal) } })
  } catch (e: unknown) {
    return mapUnitGuardError(e)
  }
}
