import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import {
  requireGuardedAdminUnit,
  mapUnitGuardError,
  effectivePermissionsSnapshot,
  listAccessibleUnitIds,
  assignableRolesFor,
} from '@/lib/erp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: true, demo: true, data: { permissions: null } })
  }
  try {
    const unitIds = await listAccessibleUnitIds(guarded.actor)
    const snap = effectivePermissionsSnapshot(guarded.actor)
    return NextResponse.json({
      ok: true,
      data: {
        permissions: {
          ...snap,
          accessibleUnitCount: unitIds.length,
          assignableRoles: assignableRolesFor(guarded.actor),
        },
      },
    })
  } catch (e) {
    return mapUnitGuardError(e)
  }
}
