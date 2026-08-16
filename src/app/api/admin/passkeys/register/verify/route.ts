/**
 * Passkeys admin — VÉRIFICATION d'enrôlement (phase 1).
 * Mêmes gardes que /register/options. Consomme le challenge (usage unique
 * atomique), vérifie la réponse (origin/RP ID stricts, user verification),
 * puis stocke la clé PUBLIQUE COSE + signCount (jamais de biométrie).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminCapable } from '@/lib/admin/admin-access'
import { getNominativeAdmin } from '@/lib/passkeys/identity'
import { isReauthFresh } from '@/lib/passkeys/reauth'
import { RP_ID, RP_ORIGIN } from '@/lib/passkeys/rp'
import { consumeChallenge, insertCredential } from '@/lib/passkeys/store'
import { hashChallenge, bytesToBase64Url } from '@/lib/passkeys/crypto'
import { logSecurity } from '@/lib/passkeys/audit'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = rateLimit(`pk-reg-vrf:${ip}`, { limit: 12, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ ok: false, message: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })

  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Indisponible en mode démonstration.' }, { status: 503 })

  const admin = await getNominativeAdmin()
  if (!admin) return NextResponse.json({ ok: false, code: 'no_session', message: 'Connectez-vous avec votre compte administrateur.' }, { status: 401 })
  if (!isAdminCapable(admin.role)) return NextResponse.json({ ok: false, code: 'not_admin', message: "Ce compte n'a pas accès à l'administration." }, { status: 403 })

  const now = Date.now()
  if (!isReauthFresh(admin.lastSignInAtMs, now)) {
    return NextResponse.json({ ok: false, code: 'reauth_required', message: 'Confirmez votre mot de passe pour ajouter une passkey.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const challengeId = body?.challengeId as string | undefined
  const response = body?.response
  const friendlyName = String(body?.friendlyName || '').trim().slice(0, 60) || 'Passkey'
  if (!challengeId || !response) return NextResponse.json({ ok: false, message: 'Requête invalide.' }, { status: 400 })

  const consumed = await consumeChallenge({ id: challengeId, expectedUserId: admin.uid, expectedCeremony: 'registration', nowMs: now })
  if (!consumed.ok) {
    if (consumed.reason === 'reuse') await logSecurity('passkey_challenge_reuse', { userId: admin.uid, ip, result: 'registration' })
    await logSecurity('passkey_enroll_fail', { userId: admin.uid, ip, result: consumed.reason })
    return NextResponse.json({ ok: false, message: 'Session d’enrôlement expirée. Recommencez.' }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: (challenge) => hashChallenge(challenge) === consumed.challengeHash,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    })
  } catch {
    await logSecurity('passkey_enroll_fail', { userId: admin.uid, ip, result: 'verify_error' })
    return NextResponse.json({ ok: false, message: 'La vérification de la passkey a échoué.' }, { status: 400 })
  }

  if (!verification.verified || !verification.registrationInfo) {
    await logSecurity('passkey_enroll_fail', { userId: admin.uid, ip, result: 'not_verified' })
    return NextResponse.json({ ok: false, message: 'La vérification de la passkey a échoué.' }, { status: 400 })
  }

  const info = verification.registrationInfo
  const cred = info.credential
  const insert = await insertCredential({
    userId: admin.uid,
    credentialId: cred.id,
    publicKey: bytesToBase64Url(cred.publicKey),
    signCount: cred.counter,
    transports: (cred.transports as string[] | undefined) || null,
    deviceType: info.credentialDeviceType || null,
    backedUp: !!info.credentialBackedUp,
    friendlyName,
    aaguid: info.aaguid || null,
  })

  if (!insert.ok) {
    await logSecurity('passkey_enroll_fail', { userId: admin.uid, credentialId: cred.id, ip, result: insert.duplicate ? 'duplicate' : 'insert_error' })
    if (insert.duplicate) return NextResponse.json({ ok: false, message: 'Cette passkey est déjà enregistrée.' }, { status: 409 })
    return NextResponse.json({ ok: false, message: 'Enregistrement impossible.' }, { status: 500 })
  }

  await logSecurity('passkey_enroll_success', { userId: admin.uid, credentialId: cred.id, ip })
  return NextResponse.json({ ok: true, credential: { id: insert.id, friendlyName, deviceType: info.credentialDeviceType } })
}
