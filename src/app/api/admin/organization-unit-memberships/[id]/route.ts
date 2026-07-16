import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import {
  requireGuardedAdminUnit,
  mapUnitGuardError,
  assertUnitAccess,
  canAssignRoleOnUnit,
  getMembershipById,
  rpcSetStatus,
  rpcChangeRole,
  UnitAccessError,
} from '@/lib/erp'
import { isOrganizationUnitRole, type OrganizationUnitRole } from '@/core/erp/unit'
import { isUuid } from '@/lib/erp/unit-governance-rules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    if (!isUuid(ctx.params.id)) {
      return NextResponse.json({ ok: false, message: 'Identifiant invalide.' }, { status: 400 })
    }
    const body = await req.json().catch(() => ({}))
    if ('organization_id' in body || 'user_id' in body || 'organization_unit_id' in body) {
      return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
    }
    const mem = await getMembershipById(guarded.organizationId, ctx.params.id)
    if (!mem) return NextResponse.json({ ok: false, message: 'Affectation introuvable.' }, { status: 404 })
    await assertUnitAccess(guarded.actor, mem.organization_unit_id as string, { write: true })

    if ('status' in body) {
      const status = body.status
      if (!['active', 'suspended', 'removed'].includes(status)) {
        return NextResponse.json({ ok: false, message: 'Statut invalide.' }, { status: 400 })
      }
      const { id, error } = await rpcSetStatus({
        membershipId: ctx.params.id,
        status,
        actorId: guarded.userId,
        notes: typeof body.notes === 'string' ? body.notes : null,
      })
      if (error || !id) {
        return NextResponse.json({ ok: false, message: error || 'Mise à jour impossible.' }, { status: 400 })
      }
      return NextResponse.json({ ok: true, data: { id } })
    }

    if ('unit_role' in body) {
      if (!isOrganizationUnitRole(body.unit_role)) {
        return NextResponse.json({ ok: false, message: 'Rôle invalide.' }, { status: 400 })
      }
      const unit = await assertUnitAccess(guarded.actor, mem.organization_unit_id as string, {
        write: true,
      })
      if (!canAssignRoleOnUnit(guarded.actor, body.unit_role as OrganizationUnitRole, unit.unit_type as any)) {
        return NextResponse.json({ ok: false, message: 'Rôle non attribuable.' }, { status: 403 })
      }
      const { id, error } = await rpcChangeRole({
        membershipId: ctx.params.id,
        newRole: body.unit_role,
        actorId: guarded.userId,
      })
      if (error || !id) {
        return NextResponse.json({ ok: false, message: error || 'Changement de rôle impossible.' }, { status: 400 })
      }
      return NextResponse.json({ ok: true, data: { id } })
    }

    return NextResponse.json({ ok: false, message: 'Payload vide.' }, { status: 400 })
  } catch (e) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
    return mapUnitGuardError(e)
  }
}
