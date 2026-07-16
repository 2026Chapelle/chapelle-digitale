import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

/**
 * Gestion des membres — RÉSERVÉ AU BACK-OFFICE (cookie admin).
 * Lot 2-B : tenant-scoped via organization_members (status='active').
 * profiles reste identité globale. Aucune organization_id client acceptée.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { isAdminRequest } from '@/lib/admin-auth'
import {
  resolveAdminOrganizationForRequest,
  getActiveMemberUserIdsForOrganization,
  assertProfileBelongsToActiveMembership,
} from '@/lib/erp/admin-profiles-scope'

const denyIfNotAdmin = (req: NextRequest) =>
  !isAdminRequest(req)
    ? NextResponse.json<ApiResponse>({ success: false, error: 'Non autorisé' }, { status: 401 })
    : null

export async function GET(request: NextRequest) {
  const denied = denyIfNotAdmin(request); if (denied) return denied
  try {
    const sp = request.nextUrl.searchParams
    const page = parseInt(sp.get('page') || '1')
    const limit = Math.min(parseInt(sp.get('limit') || '20'), 100)
    const search = sp.get('search') || ''
    const role = sp.get('role') || ''
    const statut = sp.get('statut') || ''
    const plateforme = sp.get('plateforme') || ''
    const offset = (page - 1) * limit

    // Résolution serveur — jamais de organization_id client
    const organizationId = await resolveAdminOrganizationForRequest(true)

    const allowedIds = await getActiveMemberUserIdsForOrganization(organizationId)

    // MVP : si aucun membre actif, retour vide cohérent (pas d'erreur)
    if (allowedIds.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .in('id', allowedIds)
      .range(offset, offset + limit - 1)
      .order('date_inscription', { ascending: false })

    if (search) {
      const s = search.replace(/[,()*%]/g, '')
      query = query.or(`prenom.ilike.%${s}%,nom.ilike.%${s}%,email.ilike.%${s}%`)
    }
    if (role) query = query.eq('role', role)
    if (statut) query = query.eq('statut', statut)
    if (plateforme) query = query.eq('plateforme_principale', plateforme)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json<ApiResponse>({
      success: true, data,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    })
  } catch (e: any) {
    if (e?.code === 'canonical_organization_error' || e?.message?.includes('canonique')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const denied = denyIfNotAdmin(request); if (denied) return denied
  try {
    const body = await request.json()
    const { id, ...rawUpdates } = body
    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'ID requis' }, { status: 400 })
    }

    // Liste blanche stricte des champs modifiables par l'UI admin membres
    const ALLOWED_PATCH_FIELDS = [
      'prenom',
      'nom',
      'telephone',
      'avatar_url',
      'pays',
      'ville',
      'role',
      'statut',
      'membre_statut',
      'plateforme_principale',
      'berger_id',
      'baptise',
      'date_bapteme',
      'integre_via',
      'comment_entendu',
      'langue',
      'notifications_push',
      'notifications_email',
      'newsletter',
      'whatsapp_alerts',
      'score_engagement',
      'parcours_disciple_etape',
      'dons_spirituels',
    ] as const

    const receivedKeys = Object.keys(rawUpdates)
    const allowedSet = new Set(ALLOWED_PATCH_FIELDS as readonly string[])
    const unknownKeys = receivedKeys.filter((k) => !allowedSet.has(k))

    if (unknownKeys.length > 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Champs inconnus ou protégés' }, { status: 400 })
    }

    const updates: Record<string, unknown> = Object.fromEntries(
      (ALLOWED_PATCH_FIELDS as readonly string[])
        .filter((key) => key in rawUpdates)
        .map((key) => [key, (rawUpdates as any)[key]])
    )

    if (Object.keys(updates).length === 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Aucune mise à jour valide' }, { status: 400 })
    }

    const organizationId = await resolveAdminOrganizationForRequest(true)

    // Vérification d'appartenance AVANT toute mutation
    await assertProfileBelongsToActiveMembership(organizationId, id)

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json<ApiResponse>({ success: true, data })
  } catch (e: any) {
    if (e?.message === 'Membre introuvable.' || e?.code === 'admin_profile_scope_error') {
      // 404 uniforme : pas de distinction existence / hors tenant
      return NextResponse.json<ApiResponse>({ success: false, error: 'Membre introuvable.' }, { status: 404 })
    }
    if (e?.code === 'canonical_organization_error') {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
