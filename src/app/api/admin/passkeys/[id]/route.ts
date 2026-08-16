/**
 * Passkeys admin — RENOMMER (PATCH) / RÉVOQUER (DELETE) une passkey.
 *
 * Gardées par la SESSION SUPABASE nominative + rôle admin. La révocation (action
 * sensible) exige en plus une réauthentification RÉCENTE et applique l'invariant
 * anti-verrouillage. Révocation LOGIQUE (revoked_at), jamais de suppression dure.
 * Le cookie partagé `cier_admin` ne peut ni renommer ni révoquer.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminCapable } from '@/lib/admin/admin-access'
import { getNominativeAdmin } from '@/lib/passkeys/identity'
import { isReauthFresh } from '@/lib/passkeys/reauth'
import { canRevokePasskey } from '@/lib/passkeys/lockout'
import { countActiveByUser, renameCredential, revokeCredential } from '@/lib/passkeys/store'
import { logSecurity } from '@/lib/passkeys/audit'
import { clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Indisponible en mode démonstration.' }, { status: 503 })

  const admin = await getNominativeAdmin()
  if (!admin) return NextResponse.json({ ok: false, code: 'no_session', message: 'Connectez-vous avec votre compte administrateur.' }, { status: 401 })
  if (!isAdminCapable(admin.role)) return NextResponse.json({ ok: false, code: 'not_admin', message: "Ce compte n'a pas accès à l'administration." }, { status: 403 })

  const body = await req.json().catch(() => null)
  const name = String(body?.name || '').trim().slice(0, 60)
  if (!name) return NextResponse.json({ ok: false, message: 'Nom requis.' }, { status: 400 })

  const ok = await renameCredential(params.id, admin.uid, name)
  if (!ok) return NextResponse.json({ ok: false, message: 'Passkey introuvable.' }, { status: 404 })

  await logSecurity('passkey_rename', { userId: admin.uid, ip: clientIp(req) })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Indisponible en mode démonstration.' }, { status: 503 })

  const admin = await getNominativeAdmin()
  if (!admin) return NextResponse.json({ ok: false, code: 'no_session', message: 'Connectez-vous avec votre compte administrateur.' }, { status: 401 })
  if (!isAdminCapable(admin.role)) return NextResponse.json({ ok: false, code: 'not_admin', message: "Ce compte n'a pas accès à l'administration." }, { status: 403 })

  const now = Date.now()
  if (!isReauthFresh(admin.lastSignInAtMs, now)) {
    return NextResponse.json({ ok: false, code: 'reauth_required', message: 'Confirmez votre mot de passe pour révoquer une passkey.' }, { status: 401 })
  }

  // Invariant anti-verrouillage. Pendant le pilote, le mot de passe Supabase
  // nominatif reste un secours actif → hasPasswordFallback = true.
  const active = await countActiveByUser(admin.uid)
  if (!canRevokePasskey({ hasPasswordFallback: true, activePasskeysAfterRevoke: Math.max(0, active - 1) })) {
    return NextResponse.json({ ok: false, code: 'lockout', message: 'Impossible : ce serait la dernière méthode de connexion.' }, { status: 409 })
  }

  const ok = await revokeCredential(params.id, admin.uid, now)
  if (!ok) return NextResponse.json({ ok: false, message: 'Passkey introuvable.' }, { status: 404 })

  await logSecurity('passkey_revoke', { userId: admin.uid, ip: clientIp(req) })
  return NextResponse.json({ ok: true })
}
