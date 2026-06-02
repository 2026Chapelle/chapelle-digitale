import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { nationStats, listNations } from '@/lib/nation-stats'

/**
 * Dashboard pastoral PAR NATION — portée imposée CÔTÉ SERVEUR.
 *   GET /api/member/nation?pays=  (le param pays n'est honoré que pour super_admin)
 *
 * - super_admin       → toutes les nations, ou filtre ?pays=
 * - nation_pastor     → STRICTEMENT son pays (param client ignoré)
 * - autre             → 403
 * Cure d'âme : COMPTAGE uniquement (jamais de contenu). Accès journalisé.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPER_ROLES = new Set(['super_admin', 'admin', 'pasteur'])

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })

  const { data: prof } = await supabaseAdmin.from('profiles').select('role, email').eq('id', sp.uid).maybeSingle()
  const { data: assigns } = await supabaseAdmin.from('nation_responsables').select('pays, actif').eq('user_id', sp.uid).eq('actif', true)
  const role = prof?.role || 'visiteur'
  const isSuper = SUPER_ROLES.has(role)
  const myPays = (assigns || []).map((a: any) => a.pays)

  let scopePays: string | null = null
  if (isSuper) {
    scopePays = req.nextUrl.searchParams.get('pays') || null
  } else if (myPays.length > 0) {
    scopePays = myPays[0] // portée IMPOSÉE : param client ignoré
  } else {
    return NextResponse.json({ ok: false, message: 'Accès réservé aux responsables de nation.' }, { status: 403 })
  }

  // Journalisation de l'accès sensible (best-effort).
  try {
    await supabaseAdmin.from('sensitive_access_logs').insert({
      user_id: sp.uid, email: prof?.email ?? null, role, scope_pays: scopePays ?? 'TOUTES', action: 'nation_dashboard_view',
    })
  } catch { /* */ }

  const stats = await nationStats(scopePays)
  const nations = isSuper ? await listNations() : []

  return NextResponse.json({ ok: true, role, isSuper, scope: scopePays || 'Toutes les nations', nations, stats })
}
