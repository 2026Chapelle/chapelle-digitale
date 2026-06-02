import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  liveDashboard, liveForms, liveMembers, livePlatforms, liveTunnel,
} from '@/lib/chapelle/admin-live'
import type { DateRange } from '@/lib/admin-analytics'

/**
 * Données LIVE du back-office (schéma Supabase `chapelle`).
 *   GET /api/admin/data/dashboard?range=today|7d|30d
 *   GET /api/admin/data/forms | members | platforms | tunnel
 *
 * Réponse : { ok, demo?, data }.
 *   - demo:true  → Supabase non configuré ⇒ le client garde son fallback mock.
 *   - data       → forme identique à celle attendue par l'UI existante.
 *
 * Accès réservé : même cookie de session admin que le reste de /admin.
 */
export const runtime = 'nodejs'

import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { resource: string } },
) {
  // Garde : cookie admin obligatoire
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }

  const { resource } = params
  const range = (req.nextUrl.searchParams.get('range') as DateRange) || '7d'

  let data: unknown = null
  switch (resource) {
    case 'dashboard': data = await liveDashboard(range); break
    case 'forms':     data = await liveForms(); break
    case 'members':   data = await liveMembers(); break
    case 'platforms': data = await livePlatforms(); break
    case 'tunnel':    data = await liveTunnel(); break
    default:
      return NextResponse.json({ ok: false, message: 'Ressource inconnue.' }, { status: 404 })
  }

  // null = mode démo (ou Supabase indisponible) → le client conserve son mock
  if (data === null) return NextResponse.json({ ok: true, demo: true })
  return NextResponse.json({ ok: true, data })
}
