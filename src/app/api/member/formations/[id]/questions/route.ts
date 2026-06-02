import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { sendEmail, emailLayout } from '@/lib/email'
import { APP_EMAIL } from '@/lib/constants'
import { siteUrl } from '@/lib/site-url'

/**
 * Q&A d'une formation (table formation_questions).
 *   GET  → questions visibles par le membre (les siennes + publiques répondues)
 *   POST { question, module_id?, auteur?, email? } → pose une question
 *          + notifie l'équipe par email (best-effort).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, questions: [] })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const cols = 'id, question, reponse, statut, is_public, auteur, created_at, repondu_le, user_id'
    // Deux requêtes claires (évite toute ambiguïté de syntaxe .or imbriquée) :
    //  (1) mes propres questions  (2) questions publiques déjà répondues.
    const [mine, publiques] = await Promise.all([
      supabaseAdmin.from('formation_questions').select(cols)
        .eq('formation_id', params.id).eq('user_id', sp.uid),
      supabaseAdmin.from('formation_questions').select(cols)
        .eq('formation_id', params.id).eq('is_public', true).eq('statut', 'repondue'),
    ])
    const byId: Record<string, any> = {}
    for (const q of [...(mine.data || []), ...(publiques.data || [])]) byId[q.id] = q
    const questions = Object.values(byId)
      .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 50)
    return NextResponse.json({ ok: true, questions })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const question = (body.question ?? '').toString().trim()
    if (!question) return NextResponse.json({ ok: false, message: 'Question vide.' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('formation_questions').insert({
      formation_id: params.id,
      module_id: body.module_id || null,
      user_id: sp.uid,
      auteur: (body.auteur || '').toString().slice(0, 120) || null,
      email: (body.email || '').toString().slice(0, 160) || null,
      question,
    }).select('id').single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })

    // Notification interne (best-effort).
    try {
      const { data: f } = await supabaseAdmin.from('formations').select('titre').eq('id', params.id).maybeSingle()
      await sendEmail({
        to: process.env.ADMIN_NOTIFY_EMAIL || APP_EMAIL,
        subject: `Nouvelle question — ${f?.titre || 'Formation'}`,
        html: emailLayout({
          title: 'Nouvelle question d\'un apprenant',
          body: `<p style="margin:0 0 12px"><strong>${(body.auteur || 'Un membre')}</strong> a posé une question sur « ${f?.titre || 'une formation'} » :</p><p style="margin:0 0 12px;padding:12px 16px;background:rgba(255,255,255,0.05);border-radius:10px">${question.replace(/</g, '&lt;')}</p>`,
          cta: { label: 'Répondre dans le back-office', href: siteUrl('/admin/questions-formations') },
        }),
      })
    } catch { /* non bloquant */ }

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
