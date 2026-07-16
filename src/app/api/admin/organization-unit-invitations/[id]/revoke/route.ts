import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import {
  requireGuardedAdminUnit,
  mapUnitGuardError,
  assertUnitAccess,
  revokeInvitation,
  UnitAccessError,
} from '@/lib/erp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const { data: inv } = await supabaseAdmin
      .from('organization_unit_invitations')
      .select('id, organization_unit_id, organization_id')
      .eq('id', ctx.params.id)
      .eq('organization_id', guarded.organizationId)
      .maybeSingle()
    if (!inv) return NextResponse.json({ ok: false, message: 'Invitation introuvable.' }, { status: 404 })
    await assertUnitAccess(guarded.actor, inv.organization_unit_id as string, { write: true })
    await revokeInvitation({
      orgId: guarded.organizationId,
      invitationId: ctx.params.id,
      actorId: guarded.userId,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'Erreur' },
      { status: 400 },
    )
  }
}
