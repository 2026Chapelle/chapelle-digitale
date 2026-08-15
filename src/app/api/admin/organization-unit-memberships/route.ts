import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import {
  requireGuardedAdminUnit,
  mapUnitGuardError,
  assertUnitAccess,
  canAssignRoleOnUnit,
  listMembershipsForUnit,
  rpcNominate,
  UnitAccessError,
} from '@/lib/erp'
import { isOrganizationUnitRole, type OrganizationUnitRole } from '@/core/erp/unit'
import { isSelfPromotion, isUuid } from '@/lib/erp/unit-governance-rules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: { memberships: [] } })
  try {
    const unitId = req.nextUrl.searchParams.get('unitId') || ''
    if (!unitId) return NextResponse.json({ ok: false, message: 'unitId requis.' }, { status: 400 })
    if (!isUuid(unitId)) {
      return NextResponse.json({ ok: false, message: 'Identifiant invalide.' }, { status: 400 })
    }
    await assertUnitAccess(guarded.actor, unitId)
    const memberships = await listMembershipsForUnit(guarded.organizationId, unitId)
    return NextResponse.json({ ok: true, data: { memberships } })
  } catch (e) {
    return mapUnitGuardError(e)
  }
}

export async function POST(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    if ('organization_id' in body || 'organizationId' in body || 'actor_user_id' in body) {
      return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
    }
    const unitId = typeof body.organization_unit_id === 'string' ? body.organization_unit_id : ''
    const userId = typeof body.user_id === 'string' ? body.user_id : ''
    const role = body.unit_role
    const notes = typeof body.notes === 'string' ? body.notes : null
    if (!unitId || !userId || !isOrganizationUnitRole(role)) {
      return NextResponse.json({ ok: false, message: 'Payload invalide.' }, { status: 400 })
    }
    if (!isUuid(unitId) || !isUuid(userId)) {
      return NextResponse.json({ ok: false, message: 'Identifiant invalide.' }, { status: 400 })
    }
    const unit = await assertUnitAccess(guarded.actor, unitId, { write: true })
    if (!canAssignRoleOnUnit(guarded.actor, role as OrganizationUnitRole, unit.unit_type as any)) {
      return NextResponse.json({ ok: false, message: 'Rôle non attribuable.' }, { status: 403 })
    }
    if (isSelfPromotion(guarded.userId, userId, guarded.actor.highestRole, role)) {
      return NextResponse.json({ ok: false, message: 'Auto-promotion interdite.' }, { status: 403 })
    }
    const { id, error } = await rpcNominate({
      orgId: guarded.organizationId,
      unitId,
      userId,
      role,
      actorId: guarded.userId,
      notes,
    })
    if (error || !id) {
      return NextResponse.json({ ok: false, message: error || 'Nomination impossible.' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, data: { id } })
  } catch (e) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
    return mapUnitGuardError(e)
  }
}
