import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { notifyUser } from '@/lib/notify'

/**
 * Rappels membre (lives / programmes) — RÉUTILISE le moteur de notifications
 * existant (notify.ts → app_notifications, délivré en temps réel + cloche).
 *   POST { title, body?, href? } → crée une notification CIBLÉE de confirmation.
 *
 * Aucun nouveau système : insertion via service role (notifyUser) pour éviter le
 * blocage RLS d'un insert navigateur. Le rappel calendaire (.ics) est généré
 * côté client. Authentifié ; best-effort → 200.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, skipped: true })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const title = (body.title || '').toString().slice(0, 200).trim()
  if (!title) return NextResponse.json({ ok: false, message: 'Titre requis.' }, { status: 400 })

  await notifyUser(sp.uid, {
    type: 'live',
    title,
    body: (body.body || '').toString().slice(0, 500) || undefined,
    href: (body.href || '/member/dashboard/lives').toString().slice(0, 200),
  })
  return NextResponse.json({ ok: true })
}
