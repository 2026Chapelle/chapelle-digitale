import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { getNewcomerAdminStats, computeNewcomerStats } from '@/lib/pastoral/newcomer-intakes-server'
import {
  getNewcomerOrgLookupClient,
  resolveNewcomerAdminOrganizationId,
} from '@/lib/pastoral/newcomer-admin-client'
import { NewcomerTenantScopeError } from '@/lib/pastoral/newcomer-tenant-scope'

/**
 * Stats « Nouveau Venu » pour le cockpit pastoral (V2.2-A + Lot 2-A) — lecture seule.
 *   GET /api/admin/pastoral/newcomer-stats → agrégats de public.newcomer_intakes (tenant-scoped)
 *
 * Garde : cookie admin (isAdminRequest). Scope cier_admin → organisation canonique (temporaire).
 * N'écrit rien. Distinct de /api/admin/newcomer-intakes (qui liste/patch les lignes).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  // En mode démo (Supabase non configuré) : renvoyer des stats vides propres (zéros).
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: computeNewcomerStats([]) })
  try {
    const organizationId = await resolveNewcomerAdminOrganizationId(getNewcomerOrgLookupClient(), {
      adminCookieOk: true,
    })
    const data = await getNewcomerAdminStats(organizationId)
    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    if (e instanceof NewcomerTenantScopeError) {
      return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
    }
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
