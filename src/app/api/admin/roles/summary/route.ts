import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { repartition } from '@/lib/pastoral/metrics'

/**
 * Synthèse RBAC : répartition des membres par rôle + derniers changements de rôle.
 *   GET /api/admin/roles/summary
 * Garde : cookie admin. Service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    const { data: profs } = await supabaseAdmin.from('profiles').select('role').range(0, 9999)
    const counts = repartition(profs || [], (p: any) => p.role)

    const { data: recent } = await supabaseAdmin.from('pastoral_actions_log')
      .select('member_id, admin_nom, detail, created_at')
      .eq('action', 'set_role').order('created_at', { ascending: false }).limit(25)

    return NextResponse.json({ ok: true, data: { counts, recent: recent || [] } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
