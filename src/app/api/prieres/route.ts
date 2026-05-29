import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const statut = searchParams.get('statut') || 'active'
    const urgent = searchParams.get('urgent')

    const offset = (page - 1) * limit

    let query = supabase
      .from('demandes_priere')
      .select('*', { count: 'exact' })
      .eq('visibilite', 'public')
      .range(offset, offset + limit - 1)
      .order('date_creation', { ascending: false })

    if (statut) query = query.eq('statut', statut)
    if (urgent === 'true') query = query.eq('urgent', true)

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_nom, sujet, description, visibilite = 'public', urgent = false } = body

    if (!user_nom || !sujet || !description) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('demandes_priere')
      .insert({ user_nom, sujet, description, visibilite, urgent, statut: 'active' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json<ApiResponse>({ success: true, data }, { status: 201 })
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
