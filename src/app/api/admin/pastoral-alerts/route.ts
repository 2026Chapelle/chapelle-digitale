import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'

/**
 * Suivi des alertes pastorales.
 *   GET   /api/admin/pastoral-alerts?status=&member_id=  → liste
 *   PATCH /api/admin/pastoral-alerts  { id, action: 'prise_en_charge' | 'resolue' }
 * Garde : cookie admin. Service role. Journalisé (pastoral_actions_log).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  try {
    const sp = req.nextUrl.searchParams
    let q = supabaseAdmin.from('pastoral_alerts')
      .select('id, member_id, responsable_id, type, level, status, escalation_level, detail, created_at, taken_at, resolved_at')
      .order('created_at', { ascending: false }).limit(200)
    const status = sp.get('status'); if (status) q = q.eq('status', status)
    const member = sp.get('member_id'); if (member) q = q.eq('member_id', member)
    const { data, error } = await q
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const { id, action } = await req.json().catch(() => ({}))
    if (!id || !['prise_en_charge', 'resolue'].includes(action)) return NextResponse.json({ ok: false, message: 'Paramètres invalides.' }, { status: 400 })
    const nowIso = new Date().toISOString()
    const patch = action === 'resolue'
      ? { status: 'resolue', resolved_at: nowIso }
      : { status: 'prise_en_charge', taken_at: nowIso }
    const { data: alert, error } = await supabaseAdmin.from('pastoral_alerts').update(patch).eq('id', id).select('member_id, type').single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    try {
      await supabaseAdmin.from('pastoral_actions_log').insert({
        member_id: alert?.member_id ?? null, admin_nom: 'Admin', action: `alerte_${action}`, detail: { type: alert?.type, alert_id: id },
      })
    } catch { /* */ }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
