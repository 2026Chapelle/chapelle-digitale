/**
 * Passkeys admin — options d'ENRÔLEMENT (phase 1).
 *
 * Exige : session Supabase NOMINATIVE + rôle admin (revérifié serveur) +
 * réauthentification RÉCENTE vérifiable (last_sign_in_at < 5 min). Le cookie
 * partagé `cier_admin` ne permet PAS d'enrôler (aucune identité).
 * Credentials DÉCOUVRABLES : residentKey/userVerification 'required', attestation 'none'.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminCapable } from '@/lib/admin/admin-access'
import { getNominativeAdmin } from '@/lib/passkeys/identity'
import { isReauthFresh } from '@/lib/passkeys/reauth'
import { RP_ID, RP_NAME } from '@/lib/passkeys/rp'
import { createChallenge, listActiveByUser, purgeExpiredChallenges } from '@/lib/passkeys/store'
import { logSecurity } from '@/lib/passkeys/audit'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = rateLimit(`pk-reg-opt:${ip}`, { limit: 12, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ ok: false, message: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })

  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Indisponible en mode démonstration.' }, { status: 503 })

  const admin = await getNominativeAdmin()
  if (!admin) return NextResponse.json({ ok: false, code: 'no_session', message: 'Connectez-vous avec votre compte administrateur.' }, { status: 401 })
  if (!isAdminCapable(admin.role)) return NextResponse.json({ ok: false, code: 'not_admin', message: "Ce compte n'a pas accès à l'administration." }, { status: 403 })

  const now = Date.now()
  if (!isReauthFresh(admin.lastSignInAtMs, now)) {
    return NextResponse.json({ ok: false, code: 'reauth_required', message: 'Confirmez votre mot de passe pour ajouter une passkey.' }, { status: 401 })
  }

  await purgeExpiredChallenges(now)
  const existing = await listActiveByUser(admin.uid)

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: admin.email || admin.uid,
    userID: new TextEncoder().encode(admin.uid), // userHandle = profiles.id
    userDisplayName: admin.email || 'Administrateur',
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({ id: c.credential_id, transports: (c.transports || undefined) as any })),
    authenticatorSelection: {
      residentKey: 'required',
      requireResidentKey: true,
      userVerification: 'required',
    },
  })

  const challengeId = await createChallenge({ userId: admin.uid, ceremony: 'registration', challenge: options.challenge, nowMs: now })
  await logSecurity('passkey_enroll_start', { userId: admin.uid, ip, userAgent: req.headers.get('user-agent') })

  return NextResponse.json({ ok: true, challengeId, options })
}
