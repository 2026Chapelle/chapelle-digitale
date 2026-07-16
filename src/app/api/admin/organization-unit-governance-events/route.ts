import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import {
  requireGuardedAdminUnit,
  mapUnitGuardError,
  assertUnitAccess,
  listGovernanceEvents,
} from '@/lib/erp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: { events: [] } })
  try {
    const unitId = req.nextUrl.searchParams.get('unitId') || ''
    if (!unitId) return NextResponse.json({ ok: false, message: 'unitId requis.' }, { status: 400 })
    await assertUnitAccess(guarded.actor, unitId)
    const events = await listGovernanceEvents(guarded.organizationId, unitId)
    return NextResponse.json({ ok: true, data: { events } })
  } catch (e) {
    return mapUnitGuardError(e)
  }
}
