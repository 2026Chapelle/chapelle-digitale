import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { notifyUser } from '@/lib/notify'
import { prayerAssignedEmail, prayerAnsweredEmail, testimonyValidatedEmail } from '@/lib/email-templates'

const ANSWERED_STATUTS = ['reponse_recue', 'exaucee', 'temoignage_soumis', 'temoignage_valide']

/** Notifications transactionnelles déclenchées par une transition de workflow. */
async function notifyWorkflow(resource: string, id: string, patch: Record<string, any>) {
  try {
    if (resource === 'priere_demandes') {
      // Assignation → email à l'intercesseur.
      if (patch.assigned_to) {
        const { data: prof } = await supabaseAdmin.from('profiles').select('email, prenom').eq('id', patch.assigned_to).maybeSingle()
        const { data: dem } = await supabaseAdmin.from('priere_demandes').select('sujet, reference').eq('id', id).maybeSingle()
        if (prof?.email) {
          const { subject, html } = prayerAssignedEmail(prof.prenom || '', dem?.sujet || '', dem?.reference || undefined)
          await sendEmail({ to: prof.email, subject, html })
        }
      }
      // Réponse / exaucement → email au demandeur (invite au témoignage).
      if (patch.statut && ANSWERED_STATUTS.includes(patch.statut)) {
        const { data: dem } = await supabaseAdmin.from('priere_demandes').select('sujet, email, nom, user_id').eq('id', id).maybeSingle()
        let email = dem?.email as string | null
        let prenom = (dem?.nom as string) || ''
        if (!email && dem?.user_id) {
          const { data: prof } = await supabaseAdmin.from('profiles').select('email, prenom').eq('id', dem.user_id).maybeSingle()
          email = prof?.email ?? null; prenom = prof?.prenom || prenom
        }
        if (email) {
          const { subject, html } = prayerAnsweredEmail(prenom, dem?.sujet || '')
          await sendEmail({ to: email, subject, html })
        }
        // Réponse pastorale IN-APP (cloche + historique) si la demande est liée à un membre.
        if (dem?.user_id) {
          await notifyUser(dem.user_id, {
            type: 'priere',
            title: 'Votre demande de prière a une réponse',
            body: dem?.sujet ? `« ${dem.sujet} » — l’équipe pastorale a avancé sur votre demande.` : 'L’équipe pastorale a répondu à votre demande.',
            href: '/member/dashboard/prieres',
          })
        }
      }
    } else if (resource === 'group_join_requests' && patch.statut === 'accepte') {
      // Demande d'adhésion acceptée → matérialise l'appartenance (service centralisé).
      const { onJoinRequestAccepted } = await import('@/lib/community/groups-server')
      await onJoinRequestAccepted(id)
    } else if (resource === 'temoignages' && patch.statut === 'valide') {
      // Témoignage validé → email au témoin.
      const { data: t } = await supabaseAdmin.from('temoignages').select('titre, auteur, user_id, demande_id').eq('id', id).maybeSingle()
      let email: string | null = null
      if (t?.user_id) {
        const { data: prof } = await supabaseAdmin.from('profiles').select('email').eq('id', t.user_id).maybeSingle()
        email = prof?.email ?? null
      }
      if (!email && t?.demande_id) {
        const { data: dem } = await supabaseAdmin.from('priere_demandes').select('email').eq('id', t.demande_id).maybeSingle()
        email = dem?.email ?? null
      }
      if (email) {
        const { subject, html } = testimonyValidatedEmail(t?.auteur || '', t?.titre || undefined)
        await sendEmail({ to: email, subject, html })
      }
    }
  } catch (e) {
    console.error('[submissions] notification workflow échouée', e)
  }
}

/**
 * Back-office — soumissions des membres/visiteurs (liste blanche de tables).
 *   GET    /api/admin/submissions/<table>          → liste (récent d'abord)
 *   PATCH  /api/admin/submissions/<table> {id,...} → maj (ex. statut)
 *   DELETE /api/admin/submissions/<table> {id}     → suppression
 * Garde : cookie admin. Accès via service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = ['group_join_requests', 'event_registrations', 'priere_demandes', 'temoignages'] as const
import { isAdminRequest } from '@/lib/admin-auth'

function check(req: NextRequest, resource: string) {
  if (!isAdminRequest(req)) return { err: NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 }) }
  if (!(ALLOWED as readonly string[]).includes(resource)) return { err: NextResponse.json({ ok: false, message: 'Ressource inconnue.' }, { status: 404 }) }
  return { err: null as NextResponse | null }
}

export async function GET(req: NextRequest, { params }: { params: { resource: string } }) {
  const { err } = check(req, params.resource); if (err) return err
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const { data, error } = await supabaseAdmin.from(params.resource).select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: { resource: string } }) {
  const { err } = check(req, params.resource); if (err) return err
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
  const patch = { ...body }; delete patch.id
  // Témoignage validé → rendre public + horodater, sinon il reste invisible
  // (la lecture publique exige statut='valide' ET is_public=true).
  if (params.resource === 'temoignages' && patch.statut === 'valide') {
    if (patch.is_public === undefined) patch.is_public = true
    if (patch.valide_le === undefined) patch.valide_le = new Date().toISOString()
  }
  const { error } = await supabaseAdmin.from(params.resource).update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  // Emails transactionnels du workflow (prière / témoignage), best-effort.
  await notifyWorkflow(params.resource, body.id, patch)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { resource: string } }) {
  const { err } = check(req, params.resource); if (err) return err
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
  const { error } = await supabaseAdmin.from(params.resource).delete().eq('id', body.id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
