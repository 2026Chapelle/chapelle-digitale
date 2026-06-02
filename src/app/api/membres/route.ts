import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

/**
 * Gestion des membres — RÉSERVÉ AU BACK-OFFICE (cookie admin).
 * Auparavant ouvert sans auth (fuite d'emails + modification de profil arbitraire).
 * Les membres gèrent leur propre profil via /api/member/profile.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { isAdminRequest } from '@/lib/admin-auth'
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

    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
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
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const denied = denyIfNotAdmin(request); if (denied) return denied
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json<ApiResponse>({ success: false, error: 'ID requis' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('profiles').update(updates).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json<ApiResponse>({ success: true, data })
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
