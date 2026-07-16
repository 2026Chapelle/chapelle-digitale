import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { sendEmail, emailLayout } from '@/lib/email'
import { siteUrl } from '@/lib/site-url'
import { canModifyRole, wouldRemoveLastSuperAdmin } from '@/lib/permissions'
import { notifyResponsableAssigned, notifyStatusReached } from '@/lib/notifications/events'
import {
  resolveAdminOrganizationForRequest,
  assertProfileBelongsToActiveMembership,
} from '@/lib/erp/admin-profiles-scope'

const ASSIGNABLE = new Set(['visiteur', 'membre', 'disciple', 'leader', 'berger', 'pasteur', 'formateur', 'responsable_integration', 'responsable_national', 'pasteur_national', 'admin', 'super_admin'])

/**
 * Actions administratives sur un membre (journalisées).
 *   POST /api/admin/membres/<id>/action  { action, ... }
 * Actions : set_statut | set_responsable | add_note | suspend | reactivate |
 *           archive (suppression douce) | reset_password | hard_delete (définitif).
 * Garde : cookie admin. Service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function logAction(memberId: string | null, action: string, detail: Record<string, unknown>) {
  try { await supabaseAdmin.from('pastoral_actions_log').insert({ member_id: memberId, admin_nom: 'Admin', action, detail }) } catch { /* non bloquant */ }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const id = params.id

  try {
    // Garde tenant AVANT toute lecture ou mutation sur le profil cible (Lot 2-B)
    const organizationId = await resolveAdminOrganizationForRequest(true)
    await assertProfileBelongsToActiveMembership(organizationId, id)

    const body = await req.json().catch(() => ({}))
    const action = (body.action || '').toString()

    const { data: prof } = await supabaseAdmin.from('profiles')
      .select('email, prenom, nom, membre_statut, statut, role').eq('id', id).maybeSingle()
    if (!prof && action !== 'hard_delete') return NextResponse.json({ ok: false, message: 'Membre introuvable.' }, { status: 404 })

    switch (action) {
      case 'set_statut': {
        const patch: Record<string, unknown> = {}
        if (body.membre_statut) patch.membre_statut = body.membre_statut
        if (body.statut) patch.statut = body.statut
        if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, message: 'Aucun statut fourni.' }, { status: 400 })
        const { error } = await supabaseAdmin.from('profiles').update(patch).eq('id', id)
        if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        if (body.membre_statut && body.membre_statut !== prof?.membre_statut) {
          await supabaseAdmin.from('membre_statut_history').insert({
            user_id: id, ancien_statut: prof?.membre_statut ?? null, nouveau_statut: body.membre_statut, source: 'admin',
          }).then(() => {}, () => {})
          try { await notifyStatusReached(id, { statut: body.membre_statut }) } catch { /* */ }
        }
        await logAction(id, 'set_statut', patch)
        return NextResponse.json({ ok: true })
      }

      case 'set_role': {
        const newRole = (body.role || '').toString()
        if (!ASSIGNABLE.has(newRole)) return NextResponse.json({ ok: false, message: 'Rôle invalide.' }, { status: 400 })
        const current = prof?.role || 'membre'
        // Le back-office (cookie admin) agit en super_admin.
        if (!canModifyRole(true, current, newRole)) return NextResponse.json({ ok: false, message: 'Action réservée au super admin.' }, { status: 403 })
        // Invariant : conserver au moins un super_admin actif.
        if (current === 'super_admin' && newRole !== 'super_admin') {
          const { count } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })
            .eq('role', 'super_admin').is('archived_at', null)
          if (wouldRemoveLastSuperAdmin(current, newRole, count ?? 0)) {
            return NextResponse.json({ ok: false, message: 'Impossible de retirer le dernier super admin actif.' }, { status: 409 })
          }
        }
        const { error } = await supabaseAdmin.from('profiles').update({ role: newRole }).eq('id', id)
        if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        await logAction(id, 'set_role', { ancien_role: current, nouveau_role: newRole, motif: (body.motif || '').toString().slice(0, 300) || null })
        return NextResponse.json({ ok: true })
      }

      case 'set_responsable': {
        let berger_id = body.berger_id || null
        if (!berger_id && body.berger_email) {
          const { data: b } = await supabaseAdmin.from('profiles').select('id').eq('email', String(body.berger_email).toLowerCase().trim()).maybeSingle()
          if (!b?.id) return NextResponse.json({ ok: false, message: 'Responsable introuvable (email).' }, { status: 404 })
          berger_id = b.id
        }
        const { error } = await supabaseAdmin.from('profiles').update({ berger_id }).eq('id', id)
        if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        await logAction(id, 'set_responsable', { berger_id })
        if (berger_id) {
          try {
            const { data: resp } = await supabaseAdmin.from('profiles').select('prenom, nom').eq('id', berger_id).maybeSingle()
            await notifyResponsableAssigned(id, { responsableNom: resp ? `${resp.prenom ?? ''} ${resp.nom ?? ''}`.trim() : undefined })
          } catch { /* */ }
        }
        return NextResponse.json({ ok: true })
      }

      case 'add_note': {
        const note = (body.note || '').toString().trim()
        if (!note) return NextResponse.json({ ok: false, message: 'Note vide.' }, { status: 400 })
        const type = ['note', 'suivi', 'alerte'].includes(body.type) ? body.type : 'note'
        const { error } = await supabaseAdmin.from('pastoral_notes').insert({ member_id: id, author_nom: 'Admin', note, type })
        if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        await logAction(id, 'add_note', { type })
        return NextResponse.json({ ok: true })
      }

      case 'suspend': {
        const { error } = await supabaseAdmin.from('profiles').update({ statut: 'suspendu' }).eq('id', id)
        if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        await logAction(id, 'suspend', {})
        return NextResponse.json({ ok: true })
      }

      case 'reactivate': {
        const { error } = await supabaseAdmin.from('profiles').update({ statut: 'actif', archived_at: null }).eq('id', id)
        if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        await logAction(id, 'reactivate', {})
        return NextResponse.json({ ok: true })
      }

      case 'archive': {
        // Suppression DOUCE, réversible : on suspend + on horodate l'archivage.
        const { error } = await supabaseAdmin.from('profiles')
          .update({ statut: 'suspendu', archived_at: new Date().toISOString() }).eq('id', id)
        if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        await logAction(id, 'archive', {})
        return NextResponse.json({ ok: true })
      }

      case 'reset_password': {
        if (!prof?.email) return NextResponse.json({ ok: false, message: 'Email manquant.' }, { status: 400 })
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email: prof.email })
        if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        const link = (data as any)?.properties?.action_link || siteUrl('/login')
        await sendEmail({
          to: prof.email,
          subject: 'Réinitialisation de votre mot de passe — Citadelle',
          html: emailLayout({
            title: 'Réinitialisation du mot de passe',
            body: `<p style="margin:0 0 12px">Bonjour ${prof.prenom || ''}, une réinitialisation de votre mot de passe a été initiée par l'équipe pastorale.</p>`,
            cta: { label: 'Réinitialiser mon mot de passe', href: link },
          }),
        }).then(() => {}, () => {})
        await logAction(id, 'reset_password', {})
        return NextResponse.json({ ok: true })
      }

      case 'hard_delete': {
        // Suppression DÉFINITIVE (irréversible) — protégée par double confirmation côté UI.
        await logAction(id, 'hard_delete', { email: prof?.email })
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
        if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ ok: false, message: 'Action inconnue.' }, { status: 400 })
    }
  } catch (e: any) {
    if (e?.message === 'Membre introuvable.' || e?.code === 'admin_profile_scope_error') {
      return NextResponse.json({ ok: false, message: 'Membre introuvable.' }, { status: 404 })
    }
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
