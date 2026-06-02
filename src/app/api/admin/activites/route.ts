import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Back-office — Journal d'activité (traçabilité des actions membres réelles).
 *   GET /api/admin/activites?q=&action=&source=&type=&pays=&from=&to=&montant=
 * Garde cookie admin, lecture service role. Données sensibles (prière/cure d'âme)
 * NON présentes dans cette table par conception.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [], totaux: null })

  const sp = req.nextUrl.searchParams
  const clean = (s: string | null) => (s || '').replace(/[,()*%]/g, '').trim()

  try {
    let q = supabaseAdmin.from('activity_logs')
      .select('id, nom, email, action_type, resource_type, resource_id, resource_title, amount, currency, source, pays, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    const search = clean(sp.get('q'))
    if (search) q = q.or(`nom.ilike.%${search}%,email.ilike.%${search}%`)
    if (sp.get('action')) q = q.eq('action_type', sp.get('action'))
    if (sp.get('source')) q = q.eq('source', sp.get('source'))
    if (sp.get('type')) q = q.eq('resource_type', sp.get('type'))
    const pays = clean(sp.get('pays'))
    if (pays) q = q.ilike('pays', `%${pays}%`)
    if (sp.get('from')) q = q.gte('created_at', sp.get('from'))
    if (sp.get('to')) q = q.lte('created_at', sp.get('to'))
    const montant = Number(sp.get('montant'))
    if (montant > 0) q = q.gte('amount', montant)

    const { data, error } = await q
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })

    const rows = data ?? []
    const totaux = {
      total: rows.length,
      dons: rows.filter((r) => r.action_type === 'don').length,
      montant_dons: rows.filter((r) => r.action_type === 'don').reduce((s, r) => s + (Number(r.amount) || 0), 0),
      live_views: rows.filter((r) => r.action_type === 'live_view').length,
      video_views: rows.filter((r) => r.action_type === 'video_view').length,
      pdf_downloads: rows.filter((r) => r.action_type === 'pdf_download').length,
    }
    return NextResponse.json({ ok: true, data: rows, totaux })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
