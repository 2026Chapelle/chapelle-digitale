import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { notifyUser } from '@/lib/notify'

/**
 * Messagerie interne 1:1 du membre.
 *   GET                 → fils (interlocuteurs + dernier message + non-lus)
 *   GET ?with=<uid>     → conversation (marque les reçus comme lus)
 *   POST { recipient_id, body }  → envoie (destinataire = responsable ou staff)
 * Sécurité : RLS + getSessionProfile. Destinataire validé serveur.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STAFF = new Set(['formateur', 'responsable_integration', 'responsable_national', 'pasteur_national', 'admin', 'super_admin', 'berger', 'pasteur', 'leader'])

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  const withId = req.nextUrl.searchParams.get('with')

  try {
    if (withId) {
      const { data } = await supabaseAdmin.from('messages')
        .select('id, sender_id, recipient_id, body, read_at, created_at')
        .or(`and(sender_id.eq.${sp.uid},recipient_id.eq.${withId}),and(sender_id.eq.${withId},recipient_id.eq.${sp.uid})`)
        .order('created_at', { ascending: true }).limit(200)
      // Marque comme lus les messages reçus de cet interlocuteur.
      await supabaseAdmin.from('messages').update({ read_at: new Date().toISOString() })
        .eq('recipient_id', sp.uid).eq('sender_id', withId).is('read_at', null)
      const { data: who } = await supabaseAdmin.from('profiles').select('id, prenom, nom, role').eq('id', withId).maybeSingle()
      return NextResponse.json({ ok: true, data: data || [], interlocuteur: who || null })
    }

    const { data } = await supabaseAdmin.from('messages')
      .select('id, sender_id, recipient_id, body, read_at, created_at')
      .or(`sender_id.eq.${sp.uid},recipient_id.eq.${sp.uid}`)
      .order('created_at', { ascending: false }).limit(300)
    const threads = new Map<string, { with: string; last: string; date: string; unread: number }>()
    for (const m of data || []) {
      const other = m.sender_id === sp.uid ? m.recipient_id : m.sender_id
      const t = threads.get(other) || { with: other, last: '', date: '', unread: 0 }
      if (!t.date) { t.last = m.body; t.date = m.created_at }
      if (m.recipient_id === sp.uid && !m.read_at) t.unread++
      threads.set(other, t)
    }
    const ids = Array.from(threads.keys())
    const profs: Record<string, any> = {}
    if (ids.length) {
      const { data: pp } = await supabaseAdmin.from('profiles').select('id, prenom, nom, role').in('id', ids)
      for (const p of pp || []) profs[p.id] = p
    }
    const list = Array.from(threads.values()).map((t) => ({ ...t, profile: profs[t.with] || null }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    let responsable: any = null
    const { data: me } = await supabaseAdmin.from('profiles').select('berger_id').eq('id', sp.uid).maybeSingle()
    if (me?.berger_id) { const { data } = await supabaseAdmin.from('profiles').select('id, prenom, nom, role').eq('id', me.berger_id).maybeSingle(); responsable = data || null }
    return NextResponse.json({ ok: true, data: list, responsable })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { recipient_id, body } = await req.json().catch(() => ({}))
    const text = (body || '').toString().trim()
    if (!recipient_id || !text) return NextResponse.json({ ok: false, message: 'Destinataire et message requis.' }, { status: 400 })
    if (recipient_id === sp.uid) return NextResponse.json({ ok: false, message: 'Destinataire invalide.' }, { status: 400 })

    // Destinataire autorisé : responsable du membre, ou un staff, ou un fil déjà ouvert.
    const { data: me } = await supabaseAdmin.from('profiles').select('berger_id, prenom, nom').eq('id', sp.uid).maybeSingle()
    const { data: rec } = await supabaseAdmin.from('profiles').select('id, role').eq('id', recipient_id).maybeSingle()
    if (!rec) return NextResponse.json({ ok: false, message: 'Destinataire introuvable.' }, { status: 404 })
    let allowed = me?.berger_id === recipient_id || STAFF.has(String(rec.role))
    if (!allowed) {
      const { data: prior } = await supabaseAdmin.from('messages').select('id')
        .eq('sender_id', recipient_id).eq('recipient_id', sp.uid).limit(1).maybeSingle()
      allowed = !!prior
    }
    if (!allowed) return NextResponse.json({ ok: false, message: 'Vous ne pouvez écrire qu\'à votre responsable ou à l\'équipe.' }, { status: 403 })

    const { error } = await supabaseAdmin.from('messages').insert({ sender_id: sp.uid, recipient_id, body: text.slice(0, 4000) })
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })

    const auteur = `${me?.prenom ?? ''} ${me?.nom ?? ''}`.trim() || 'Un membre'
    try { await notifyUser(recipient_id, { type: 'membre', title: `Message de ${auteur}`, body: text.slice(0, 120), href: '/member/dashboard/messages' }) } catch { /* */ }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
