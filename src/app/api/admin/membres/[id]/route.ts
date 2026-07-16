import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { getMemberDossier } from '@/lib/pastoral/member-360-server'
import {
  resolveAdminOrganizationForRequest,
  assertProfileBelongsToActiveMembership,
} from '@/lib/erp/admin-profiles-scope'

/**
 * Dossier pastoral 360° d'un membre (Lot 2-B).
 * Garde d'entrée tenant via organization_members avant getMemberDossier.
 * Le dossier interne n'est pas re-scopé dans ce lot.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    const organizationId = await resolveAdminOrganizationForRequest(true)
    await assertProfileBelongsToActiveMembership(organizationId, params.id)

    const dossier = await getMemberDossier(params.id)
    if (!dossier) return NextResponse.json({ ok: false, message: 'Membre introuvable.' }, { status: 404 })
    return NextResponse.json({ ok: true, data: dossier })
  } catch (e: any) {
    if (e?.message === 'Membre introuvable.' || e?.code === 'admin_profile_scope_error') {
      return NextResponse.json({ ok: false, message: 'Membre introuvable.' }, { status: 404 })
    }
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
