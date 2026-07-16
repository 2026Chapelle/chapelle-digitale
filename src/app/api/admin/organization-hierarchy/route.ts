import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import {
  listAccessibleUnitIds,
  requireGuardedAdminUnit,
  mapUnitGuardError,
} from '@/lib/erp'
import { UnitAccessError } from '@/lib/erp/unit-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/organization-hierarchy
 * Arbre des unités accessibles à l'acteur courant.
 */
export async function GET(req: NextRequest) {
  const guarded = await requireGuardedAdminUnit(req)
  if (guarded instanceof NextResponse) return guarded
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: true, demo: true, data: { units: [] } })
  }

  try {
    const { actor, organizationId } = guarded
    const allowedIds = await listAccessibleUnitIds(actor)

    if (allowedIds.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          organizationId,
          units: [],
          actor: {
            userId: actor.userId,
            highestRole: actor.highestRole,
            isWorldScope: actor.isWorldScope,
            homeUnitIds: actor.homeUnitIds,
          },
        },
      })
    }

    const { data, error } = await supabaseAdmin
      .from('organization_units')
      .select(
        'id, parent_id, unit_type, name, slug, status, continent_code, country_code, city, depth, materialized_path',
      )
      .eq('organization_id', organizationId)
      .in('id', allowedIds)
      .order('depth', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      data: {
        organizationId,
        units: data || [],
        actor: {
          userId: actor.userId,
          highestRole: actor.highestRole,
          isWorldScope: actor.isWorldScope,
          homeUnitIds: actor.homeUnitIds,
        },
      },
    })
  } catch (e: unknown) {
    if (e instanceof UnitAccessError) return mapUnitGuardError(e)
    return mapUnitGuardError(e)
  }
}
