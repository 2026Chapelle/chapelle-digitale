import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

/**
 * Inscription / désinscription d'un membre à un événement — écriture SERVEUR
 * (service role) : fiable (pas de blocage RLS), gère l'anti-doublon ET la
 * désinscription (DELETE), et renvoie le COMPTEUR réel d'inscrits à jour.
 *
 *   POST { event_id, event_titre?, type?: 'inscription'|'rappel', action?: 'add'|'remove' }
 *        → { ok, count }   (count = nb d'inscriptions pour cet événement)
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function inscritsCount(eventId: string): Promise<number> {
  const { count } = await supabaseAdmin.from('event_registrations')
    .select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('type', 'inscription')
  return count || 0
}

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const eventId = (body.event_id || '').toString()
    if (!eventId) return NextResponse.json({ ok: false, message: 'event_id requis.' }, { status: 400 })
    const type = body.type === 'rappel' ? 'rappel' : 'inscription'
    const action = body.action === 'remove' ? 'remove' : 'add'

    if (action === 'add') {
      const { data: existing } = await supabaseAdmin.from('event_registrations')
        .select('id').eq('event_id', eventId).eq('user_id', sp.uid).eq('type', type).maybeSingle()
      if (!existing) {
        const p = sp.profile || {}
        const { error } = await supabaseAdmin.from('event_registrations').insert({
          event_id: eventId,
          event_titre: (body.event_titre || '').toString().slice(0, 200) || null,
          user_id: sp.uid,
          user_nom: `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || p.email || null,
          user_email: p.email ?? null,
          type,
        })
        if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
      }
    } else {
      const { error } = await supabaseAdmin.from('event_registrations')
        .delete().eq('event_id', eventId).eq('user_id', sp.uid).eq('type', type)
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, count: await inscritsCount(eventId) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
