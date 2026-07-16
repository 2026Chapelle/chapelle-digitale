import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  resolveAdminOrganizationForRequest,
  getActiveMemberUserIdsForOrganization,
  requireActiveOwnerOrAdmin,
} from '@/lib/erp/admin-profiles-scope'

/**
 * Membres (back-office pastoral).
 *   GET  /api/admin/membres?q=&role=&statut=&pays=&page=&pageSize=  → liste réelle
 *   POST /api/admin/membres  { email, prenom, nom, telephone?, pays?, ville?, password? }
 *        → crée un membre (Supabase Auth + profil).
 * Garde : cookie admin. Service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLS = 'id, prenom, nom, email, avatar_url, telephone, pays, ville, role, statut, membre_statut, score_engagement, date_inscription, derniere_connexion, archived_at, berger_id'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: { members: [], total: 0, page: 1, pageSize: 25 } })
  try {
    const sp = req.nextUrl.searchParams
    const q = (sp.get('q') || '').replace(/[%,()]/g, ' ').trim()
    const role = sp.get('role') || ''
    const statut = sp.get('statut') || ''
    const pays = sp.get('pays') || ''
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '25', 10) || 25))
    const from = (page - 1) * pageSize

    const organizationId = await resolveAdminOrganizationForRequest(true)
    await requireActiveOwnerOrAdmin(organizationId)

    const allowedIds = await getActiveMemberUserIdsForOrganization(organizationId)

    if (allowedIds.length === 0) {
      return NextResponse.json({ ok: true, data: { members: [], total: 0, page, pageSize } })
    }

    let query = supabaseAdmin.from('profiles').select(COLS, { count: 'exact' })
      .in('id', allowedIds)
    if (q) query = query.or(`prenom.ilike.%${q}%,nom.ilike.%${q}%,email.ilike.%${q}%`)
    if (role) query = query.eq('role', role)
    if (statut) query = query.eq('statut', statut)
    if (pays) query = query.eq('pays', pays)
    query = query.order('date_inscription', { ascending: false }).range(from, from + pageSize - 1)

    const { data, count, error } = await query
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data: { members: data || [], total: count ?? 0, page, pageSize } })
  } catch (e: any) {
    if (e?.code === 'admin_profile_scope_error' || e?.message?.includes('Autorisation')) {
      return NextResponse.json({ ok: false, message: e.message }, { status: e.status || 403 })
    }
    if (e?.code === 'canonical_organization_error') {
      return NextResponse.json({ ok: false, message: 'Erreur serveur' }, { status: 500 })
    }
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    const email = (body.email || '').toString().trim().toLowerCase()
    if (!email || !email.includes('@')) return NextResponse.json({ ok: false, message: 'Email valide requis.' }, { status: 400 })
    const prenom = (body.prenom || '').toString().slice(0, 80)
    const nom = (body.nom || '').toString().slice(0, 80)
    const password = (body.password || '').toString() || randomUUID()

    // Rejeter organization_id client et champs inconnus/protégés
    if ('organization_id' in body || 'organizationId' in body) {
      return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
    }

    const organizationId = await resolveAdminOrganizationForRequest(true)
    await requireActiveOwnerOrAdmin(organizationId)

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { prenom, nom },
    })
    if (error || !created?.user) return NextResponse.json({ ok: false, message: error?.message || 'Création impossible.' }, { status: 400 })
    const uid = created.user.id

    // Le trigger handle_new_user crée le profil ; on complète les champs additionnels.
    await supabaseAdmin.from('profiles').update({
      prenom, nom,
      telephone: (body.telephone || '').toString().slice(0, 40) || null,
      pays: (body.pays || '').toString().slice(0, 80) || null,
      ville: (body.ville || '').toString().slice(0, 80) || null,
      source_inscription: 'admin',
    }).eq('id', uid)

    // Rattacher uniquement à l'organisation canonique avec rôle member
    const { error: memError } = await supabaseAdmin.from('organization_members').insert({
      organization_id: organizationId,
      user_id: uid,
      membership_role: 'member',
      status: 'active',
      is_default: false,
      joined_at: new Date().toISOString(),
    })

    if (memError) {
      // Compensation limitée au nouvel utilisateur créé par cette requête
      try {
        await supabaseAdmin.auth.admin.deleteUser(uid)
      } catch {}
      return NextResponse.json({ ok: false, message: 'Création de rattachement impossible.' }, { status: 500 })
    }

    await supabaseAdmin.from('pastoral_actions_log').insert({
      member_id: uid, admin_nom: 'Admin', action: 'create', detail: { email },
    }).then(() => {}, () => {})

    return NextResponse.json({ ok: true, data: { id: uid } })
  } catch (e: any) {
    if (e?.code === 'admin_profile_scope_error' || e?.message?.includes('Autorisation')) {
      return NextResponse.json({ ok: false, message: e.message }, { status: e.status || 403 })
    }
    if (e?.code === 'canonical_organization_error') {
      return NextResponse.json({ ok: false, message: 'Erreur serveur' }, { status: 500 })
    }
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}
