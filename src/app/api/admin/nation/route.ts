import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { nationStats, listNations } from '@/lib/nation-stats'

/**
 * Back-office super_admin — dashboard par nation (toutes nations + filtre ?pays=).
 * Gardé par le cookie admin. Accès sensible journalisé.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  const scopePays = req.nextUrl.searchParams.get('pays') || null
  try {
    await supabaseAdmin.from('sensitive_access_logs').insert({
      role: 'super_admin', scope_pays: scopePays ?? 'TOUTES', action: 'nation_dashboard_view_admin',
    })
  } catch { /* */ }

  const stats = await nationStats(scopePays)
  const nations = await listNations()
  return NextResponse.json({ ok: true, isSuper: true, scope: scopePays || 'Toutes les nations', nations, stats })
}
