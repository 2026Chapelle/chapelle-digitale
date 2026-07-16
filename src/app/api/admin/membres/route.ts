import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  resolveAdminOrganizationForRequest,
  getActiveMemberUserIdsForOrganization,
  getActiveUserIdsForUnits,
} from '@/lib/erp/admin-profiles-scope'
import {
  resolveAdminActorProfile,
  resolveActorUnitContext,
  listAccessibleUnitIds,
  UnitAccessError,
} from '@/lib/erp/unit-access'

/**
 * Membres (back-office pastoral) — Lot 3 + Lot 5 unit scope.
 * Garde : cookie admin + acteur Supabase + périmètre unités.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLS = 'id, prenom, nom, email, avatar_url, telephone, pays, ville, role, statut, membre_statut, score_engagement, date_inscription, derniere_connexion, archived_at, berger_id'

function mapMembreError(e: any) {
  if (e?.code === 'unit_access_error') {
    return NextResponse.json(
      { ok: false, message: e.message, code: e.errorCode },
      { status: e.status || 403 },
    )
  }
  if (e?.code === 'admin_profile_scope_error' || e?.message?.includes('Autorisation')) {
    return NextResponse.json({ ok: false, message: e.message }, { status: e.status || 403 })
  }
  if (e?.code === 'canonical_organization_error') {
    return NextResponse.json({ ok: false, message: 'Erreur serveur' }, { status: 500 })
  }
  return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
}

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

    const profile = await resolveAdminActorProfile()
    const organizationId = await resolveAdminOrganizationForRequest(true)
    const actor = await resolveActorUnitContext(organizationId, profile.userId)

    let allowedIds: string[]
    if (actor.isWorldScope) {
      allowedIds = await getActiveMemberUserIdsForOrganization(organizationId)
    } else {
      const unitIds = await listAccessibleUnitIds(actor)
      allowedIds = await getActiveUserIdsForUnits(organizationId, unitIds)
    }

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
    return mapMembreError(e)
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

    if (
      'organization_id' in body ||
      'organizationId' in body ||
      'organization_unit_id' in body ||
      'unit_role' in body ||
      'membership_role' in body
    ) {
      return NextResponse.json({ ok: false, message: 'Champs non modifiables.' }, { status: 400 })
    }

    const profile = await resolveAdminActorProfile()
    const organizationId = await resolveAdminOrganizationForRequest(true)
    const actor = await resolveActorUnitContext(organizationId, profile.userId)

    // Unité d'affectation : home primary de l'acteur (pas de unit_id client)
    const targetUnitId = actor.homeUnitIds[0]
    if (!targetUnitId) {
      throw new UnitAccessError('Unité d’affectation introuvable.', 403)
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { prenom, nom },
    })
    if (error || !created?.user) return NextResponse.json({ ok: false, message: error?.message || 'Création impossible.' }, { status: 400 })
    const uid = created.user.id

    await supabaseAdmin.from('profiles').update({
      prenom, nom,
      telephone: (body.telephone || '').toString().slice(0, 40) || null,
      pays: (body.pays || '').toString().slice(0, 80) || null,
      ville: (body.ville || '').toString().slice(0, 80) || null,
      source_inscription: 'admin',
    }).eq('id', uid)

    const { error: memError } = await supabaseAdmin.from('organization_members').insert({
      organization_id: organizationId,
      user_id: uid,
      membership_role: 'member',
      status: 'active',
      is_default: false,
      joined_at: new Date().toISOString(),
    })

    if (memError) {
      try { await supabaseAdmin.auth.admin.deleteUser(uid) } catch {}
      return NextResponse.json({ ok: false, message: 'Création de rattachement impossible.' }, { status: 500 })
    }

    const { error: unitMemError } = await supabaseAdmin.from('organization_unit_members').insert({
      organization_id: organizationId,
      organization_unit_id: targetUnitId,
      user_id: uid,
      unit_role: 'member',
      status: 'active',
      is_primary: true,
    })

    if (unitMemError) {
      try {
        await supabaseAdmin.from('organization_members').delete().eq('user_id', uid).eq('organization_id', organizationId)
        await supabaseAdmin.auth.admin.deleteUser(uid)
      } catch {}
      return NextResponse.json({ ok: false, message: 'Rattachement d’unité impossible.' }, { status: 500 })
    }

    await supabaseAdmin.from('pastoral_actions_log').insert({
      member_id: uid, admin_nom: 'Admin', action: 'create', detail: { email, unit_id: targetUnitId },
    }).then(() => {}, () => {})

    return NextResponse.json({ ok: true, data: { id: uid, organization_unit_id: targetUnitId } })
  } catch (e: any) {
    return mapMembreError(e)
  }
}
