import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import {
  requireGuardedAdminUnit,
  mapUnitGuardError,
  assertUnitAccess,
  canAssignRoleOnUnit,
  getMembershipById,
  rpcTransfer,
  UnitAccessError,
} from '@/lib/erp'
import { isOrganizationUnitRole, type OrganizationUnitRole } from '@/core/erp/unit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    const toUnitId = typeof body.to_unit_id === 'string' ? body.to_unit_id : ''
    if (!toUnitId) {
      return NextResponse.json({ ok: false, message: 'to_unit_id requis.' }, { status: 400 })
    }
    const mem = await getMembershipById(guarded.organizationId, ctx.params.id)
    if (!mem) return NextResponse.json({ ok: false, message: 'Affectation introuvable.' }, { status: 404 })
    await assertUnitAccess(guarded.actor, mem.organization_unit_id as string, { write: true })
    const toUnit = await assertUnitAccess(guarded.actor, toUnitId, { write: true })
    let role: string | null = null
    if (body.unit_role != null) {
      if (!isOrganizationUnitRole(body.unit_role)) {
        return NextResponse.json({ ok: false, message: 'Rôle invalide.' }, { status: 400 })
      }
      if (!canAssignRoleOnUnit(guarded.actor, body.unit_role as OrganizationUnitRole, toUnit.unit_type as any)) {
        return NextResponse.json({ ok: false, message: 'Rôle non attribuable.' }, { status: 403 })
      }
      role = body.unit_role
    }
    const { id, error } = await rpcTransfer({
      membershipId: ctx.params.id,
      toUnitId,
      actorId: guarded.userId,
      role,
    })
    if (error || !id) {
      return NextResponse.json({ ok: false, message: error || 'Transfert impossible.' }, { status: 400 })
    }
    return NextResponse.json({ ok: true, data: { id } })
  } catch (e) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
    return mapUnitGuardError(e)
  }
}
