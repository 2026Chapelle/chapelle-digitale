import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { notifyBroadcast } from '@/lib/notify'

/**
 * Demande de prière MEMBRE (espace privé). Écriture SERVEUR via service role :
 * l'insert ne dépend plus de la RLS du client navigateur (cause des « le sujet
 * ne part pas »), et l'équipe pastorale est notifiée (cloche admin) — réutilise
 * le moteur de notifications existant (notify.ts → app_notifications).
 *
 *   POST { sujet, description?, categorie?, urgente?, anonyme?, nom?, email? }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const sujet = (body.sujet || '').toString().slice(0, 200).trim()
    if (!sujet) return NextResponse.json({ ok: false, message: 'Sujet requis.' }, { status: 400 })
    const anonyme = !!body.anonyme
    const row: Record<string, any> = {
      user_id: sp.uid,
      nom: anonyme ? null : ((body.nom || '').toString().slice(0, 160) || null),
      email: anonyme ? null : ((body.email || '').toString().slice(0, 160) || null),
      sujet,
      description: (body.description || '').toString().slice(0, 4000) || null,
      categorie: (body.categorie || 'autre').toString().slice(0, 80),
      urgence: body.urgente ? 'elevee' : 'normale',
      anonyme,
    }
    const { data, error } = await supabaseAdmin.from('priere_demandes').insert(row).select('id').single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })

    // Notifie l'équipe pastorale (cloche back-office) — best-effort, non bloquant.
    await notifyBroadcast('admin', {
      type: 'priere',
      title: 'Nouvelle demande de prière',
      body: sujet,
      href: '/admin/prieres',
    })
    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
