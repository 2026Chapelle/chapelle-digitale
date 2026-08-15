import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { getMemberDossier } from '@/lib/pastoral/member-360-server'
import {
  resolveAdminOrganizationForRequest,
  assertProfileBelongsToActiveMembership,
  getActiveUserIdsForUnits,
  getActiveMemberUserIdsForOrganization,
} from '@/lib/erp/admin-profiles-scope'
import {
  resolveAdminActorProfile,
  resolveActorUnitContext,
  listAccessibleUnitIds,
} from '@/lib/erp/unit-access'

/**
 * Dossier pastoral 360° d'un membre (Lot 2-B + Lot 5 unit scope).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    const profile = await resolveAdminActorProfile()
    const organizationId = await resolveAdminOrganizationForRequest(true)
    const actor = await resolveActorUnitContext(organizationId, profile.userId)
    await assertProfileBelongsToActiveMembership(organizationId, params.id)

    if (!actor.isWorldScope) {
      const unitIds = await listAccessibleUnitIds(actor)
      const allowed = await getActiveUserIdsForUnits(organizationId, unitIds)
      if (!allowed.includes(params.id)) {
        return NextResponse.json({ ok: false, message: 'Membre introuvable.' }, { status: 404 })
      }
    } else {
      const allowed = await getActiveMemberUserIdsForOrganization(organizationId)
      if (!allowed.includes(params.id)) {
        return NextResponse.json({ ok: false, message: 'Membre introuvable.' }, { status: 404 })
      }
    }

    const dossier = await getMemberDossier(params.id)
    if (!dossier) return NextResponse.json({ ok: false, message: 'Membre introuvable.' }, { status: 404 })
    return NextResponse.json({ ok: true, data: dossier })
  } catch (e: any) {
    if (e?.code === 'unit_access_error') {
      return NextResponse.json({ ok: false, message: e.message, code: e.errorCode }, { status: e.status || 403 })
    }
    if (e?.message === 'Membre introuvable.' || e?.code === 'admin_profile_scope_error') {
      return NextResponse.json({ ok: false, message: 'Membre introuvable.' }, { status: 404 })
    }
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
