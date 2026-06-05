import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { notifyUser } from '@/lib/notify'

/**
 * Messagerie côté back-office (depuis la fiche membre).
 *   GET  ?member=<id>  → conversation du membre (tous ses messages)
 *   POST { recipient_id, body, sender_id? } → envoie au membre.
 * L'expéditeur est résolu : sender_id fourni → responsable du membre → un super_admin.
 * Garde : cookie admin. Service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const member = req.nextUrl.searchParams.get('member')
  if (!member) return NextResponse.json({ ok: false, message: 'member requis.' }, { status: 400 })
  try {
    const { data } = await supabaseAdmin.from('messages')
      .select('id, sender_id, recipient_id, body, read_at, created_at')
      .or(`sender_id.eq.${member},recipient_id.eq.${member}`)
      .order('created_at', { ascending: true }).limit(200)
    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const { recipient_id, body, sender_id } = await req.json().catch(() => ({}))
    const text = (body || '').toString().trim()
    if (!recipient_id || !text) return NextResponse.json({ ok: false, message: 'Destinataire et message requis.' }, { status: 400 })

    // Résolution de l'expéditeur (le cookie admin n'est pas un profil).
    let sender = sender_id || null
    if (!sender) {
      const { data: m } = await supabaseAdmin.from('profiles').select('berger_id').eq('id', recipient_id).maybeSingle()
      sender = m?.berger_id || null
    }
    if (!sender) {
      const { data: sa } = await supabaseAdmin.from('profiles').select('id').in('role', ['super_admin', 'admin']).limit(1).maybeSingle()
      sender = sa?.id || null
    }
    if (!sender) return NextResponse.json({ ok: false, message: 'Aucun expéditeur pastoral disponible (assignez un responsable).' }, { status: 400 })

    const { error } = await supabaseAdmin.from('messages').insert({ sender_id: sender, recipient_id, body: text.slice(0, 4000) })
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    try { await notifyUser(recipient_id, { type: 'membre', title: 'Message de l\'équipe pastorale', body: text.slice(0, 120), href: '/member/dashboard/messages' }) } catch { /* */ }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
