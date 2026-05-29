import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const statut = searchParams.get('statut') || ''
    const plateforme = searchParams.get('plateforme') || ''

    const offset = (page - 1) * limit

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('date_inscription', { ascending: false })

    if (search) {
      query = query.or(`prenom.ilike.%${search}%,nom.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (role) query = query.eq('role', role)
    if (statut) query = query.eq('statut', statut)
    if (plateforme) query = query.eq('plateforme_principale', plateforme)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json<ApiResponse>({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ID requis' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json<ApiResponse>({ success: true, data })
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
