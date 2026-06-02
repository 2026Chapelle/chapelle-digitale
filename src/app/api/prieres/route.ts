import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { ApiResponse } from '@/types'
import { sendEmail } from '@/lib/email'
import { prayerReceivedEmail } from '@/lib/email-templates'

/**
 * Mur de prière public (table canonique `priere_demandes`).
 *
 * NB : table unifiée V2 — l'ancienne `demandes_priere` n'est plus utilisée
 * (mapping : visibilite→is_public, date_creation→created_at, urgent→urgence).
 * La prise en charge (assignation, suivi, témoignage) passe par le Centre de
 * prière (back-office) ; ici on n'expose QUE les demandes publiques.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('priere_demandes')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .neq('statut', 'archivee')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

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
    const {
      user_nom, nom, email, sujet, description,
      categorie = 'autre', is_public, visibilite, urgent = false, anonyme = false,
    } = body

    const displayName = nom || user_nom
    if (!sujet || !description) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('priere_demandes')
      .insert({
        nom: displayName || null,
        email: email || null,
        sujet,
        description,
        categorie,
        anonyme,
        urgence: urgent ? 'urgent' : 'normale',
        is_public: typeof is_public === 'boolean' ? is_public : visibilite === 'public',
        // statut par défaut côté base : 'nouvelle'
      })
      .select()
      .single()

    if (error) throw error

    // Accusé de réception au demandeur (best-effort, non bloquant).
    if (email) {
      try {
        const { subject, html } = prayerReceivedEmail(displayName || '', sujet, (data as any)?.reference)
        await sendEmail({ to: email, subject, html })
      } catch { /* non bloquant */ }
    }

    return NextResponse.json<ApiResponse>({ success: true, data }, { status: 201 })
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
