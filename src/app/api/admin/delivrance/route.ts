import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { sendEmail, emailLayout, escapeHtml } from '@/lib/email'
import { siteUrl } from '@/lib/site-url'

/**
 * Back-office — Centre de Délivrance & Cure d'Âme (confidentiel).
 *   GET                                   → liste des demandes (équipe pastorale)
 *   PATCH { id, statut?, assigned_to?, notes_internes? } → suivi
 * Garde cookie admin + service role. Données sensibles : accès strictement
 * back-office. Une notification douce est envoyée au membre à la prise en charge.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-auth'
const guard = (req: NextRequest) =>
  !isAdminRequest(req)
    ? NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
    : null

const STATUTS = ['recu', 'en_attente', 'en_traitement', 'suivi', 'cloture']

export async function GET(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const { data, error } = await supabaseAdmin.from('delivrance_demandes')
    .select('id, prenom, email, sujet, description, diagnostic, niveau, parcours_recommande, statut, assigned_to, notes_internes, created_at')
    .order('created_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const d = guard(req); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })

  const patch: Record<string, any> = { updated_at: new Date().toISOString() }
  if (body.statut && STATUTS.includes(body.statut)) patch.statut = body.statut
  if ('assigned_to' in body) patch.assigned_to = body.assigned_to || null
  if ('notes_internes' in body) patch.notes_internes = (body.notes_internes ?? '').toString().slice(0, 8000)

  const { data, error } = await supabaseAdmin.from('delivrance_demandes')
    .update(patch).eq('id', body.id).select('email, prenom, statut').single()
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })

  // Notification douce au membre à la mise en suivi / prise en charge.
  if (patch.statut && ['en_traitement', 'suivi'].includes(patch.statut) && data?.email) {
    try {
      await sendEmail({
        to: data.email,
        subject: 'Votre demande d\'accompagnement est prise en charge',
        html: emailLayout({
          title: 'Nous sommes avec vous',
          body:
            `<p style="margin:0 0 12px">Bonjour ${escapeHtml(data.prenom || '')},</p>` +
            '<p style="margin:0 0 12px">Votre demande d\'accompagnement spirituel a été prise en charge par notre équipe pastorale. Vous serez recontacté(e) avec soin et confidentialité. Vous n\'êtes pas seul(e).</p>',
          cta: { label: 'Mon espace cure d\'âme', href: siteUrl('/member/dashboard/delivrance') },
        }),
      })
    } catch { /* non bloquant */ }
  }
  return NextResponse.json({ ok: true })
}
