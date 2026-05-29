import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const statut = searchParams.get('statut')
    const limit = parseInt(searchParams.get('limit') || '10')

    let query = supabase
      .from('live_streams')
      .select('*')
      .limit(limit)
      .order('date_programmee', { ascending: false })

    if (statut) query = query.eq('statut', statut)

    const { data, error } = await query
    if (error) throw error

    const activeLive = data?.find((l: { statut: string }) => l.statut === 'en_direct') || null

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { lives: data, active_live: activeLive, is_live: !!activeLive },
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
    const { data, error } = await supabase
      .from('live_streams')
      .insert(body)
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    const { data, error } = await supabase
      .from('live_streams')
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
