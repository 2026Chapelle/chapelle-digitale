import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { getCanonicalLiveDiagnostics } from '@/lib/live/canonical-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Diagnostic du direct (ADMIN uniquement) : source retenue, code d'erreur YouTube non sensible,
 * état du cache du détecteur, politique d'expiration. Aucune valeur de secret n'est renvoyée
 * (seuls des booléens « configuré / non configuré »).
 */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }

  try {
    const diagnostics = await getCanonicalLiveDiagnostics()
    return NextResponse.json({ ok: true, ...diagnostics }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false, message: 'Diagnostic indisponible.' }, { status: 500 })
  }
}
