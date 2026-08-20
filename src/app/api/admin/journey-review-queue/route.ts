import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { listReviewQueue } from '@/lib/canonical/canonical-server'

/**
 * FILE DE REVUE PASTORALE (Phase 3C) — membres dont un axe canonique est en 'requires_review'.
 *   GET /api/admin/journey-review-queue  → { items: [...], pendingCount }
 *
 * Écran ADMIN (garde cookie admin, lu via service_role). Recommande une revue humaine ;
 * ne décide rien. La validation elle-même passe par /api/admin/journey-validation.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: { items: [], pendingCount: 0 } })
  try {
    const { items, pendingCount } = await listReviewQueue()
    return NextResponse.json({ ok: true, data: { items, pendingCount } })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
