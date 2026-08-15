/**
 * Passkeys admin — LISTE des passkeys de l'administrateur nominatif courant.
 * Gardée par la SESSION SUPABASE nominative + rôle admin (jamais le cookie
 * partagé `cier_admin`, qui n'a pas d'identité). Lecture seule → pas de réauth.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminCapable } from '@/lib/admin/admin-access'
import { getNominativeAdmin } from '@/lib/passkeys/identity'
import { listActiveByUser } from '@/lib/passkeys/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, passkeys: [] })

  const admin = await getNominativeAdmin()
  if (!admin) return NextResponse.json({ ok: false, code: 'no_session', message: 'Connectez-vous avec votre compte administrateur.' }, { status: 401 })
  if (!isAdminCapable(admin.role)) return NextResponse.json({ ok: false, code: 'not_admin', message: "Ce compte n'a pas accès à l'administration." }, { status: 403 })

  const list = await listActiveByUser(admin.uid)
  return NextResponse.json({
    ok: true,
    passkeys: list.map((c) => ({
      id: c.id,
      friendlyName: c.friendly_name || 'Passkey',
      deviceType: c.device_type,
      backedUp: c.backed_up,
      createdAt: c.created_at,
      lastUsedAt: c.last_used_at,
    })),
  })
}
