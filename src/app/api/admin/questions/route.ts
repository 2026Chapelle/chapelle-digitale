import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { sendEmail, emailLayout, escapeHtml } from '@/lib/email'
import { siteUrl } from '@/lib/site-url'

/**
 * Back-office — Questions des formations.
 *   GET                          → toutes les questions (récentes d'abord)
 *   PATCH { id, reponse, is_public? } → répond + notifie l'apprenant par email
 *   DELETE { id }
 * Garde cookie admin, service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-auth'
const guard = (req: NextRequest) =>
  !isAdminRequest(req)
    ? NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
    : null

export async function GET(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const { data, error } = await supabaseAdmin
    .from('formation_questions')
    .select('id, question, reponse, statut, is_public, auteur, email, created_at, repondu_le, formations(titre, slug)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })

  const reponse = (body.reponse ?? '').toString().trim()
  const patch: Record<string, any> = {}
  if (reponse) {
    patch.reponse = reponse
    patch.statut = 'repondue'
    patch.repondu_le = new Date().toISOString()
  }
  if (typeof body.is_public === 'boolean') patch.is_public = body.is_public

  const { data, error } = await supabaseAdmin.from('formation_questions')
    .update(patch).eq('id', body.id)
    .select('email, auteur, question, formations(titre)').single()
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })

  // Notifie l'apprenant que sa question a une réponse (best-effort).
  if (reponse && data?.email) {
    try {
      const f: any = Array.isArray(data.formations) ? data.formations[0] : data.formations
      await sendEmail({
        to: data.email,
        subject: 'Réponse à votre question 🎓',
        html: emailLayout({
          title: 'Un formateur vous a répondu',
          body:
            `<p style="margin:0 0 12px">Bonjour ${escapeHtml(data.auteur || '')},</p>` +
            `<p style="margin:0 0 8px">Votre question${f?.titre ? ` sur « ${escapeHtml(f.titre)} »` : ''} :</p>` +
            `<p style="margin:0 0 12px;padding:10px 14px;background:rgba(255,255,255,0.04);border-radius:10px;color:rgba(245,243,238,0.6)">${escapeHtml(data.question || '')}</p>` +
            `<p style="margin:0 0 8px"><strong>Réponse :</strong></p>` +
            `<p style="margin:0 0 12px;padding:10px 14px;background:rgba(212,175,55,0.08);border-radius:10px">${escapeHtml(reponse)}</p>`,
          cta: { label: 'Retour à ma formation', href: siteUrl('/member/dashboard/formations') },
        }),
      })
    } catch { /* non bloquant */ }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
  const { error } = await supabaseAdmin.from('formation_questions').delete().eq('id', body.id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
