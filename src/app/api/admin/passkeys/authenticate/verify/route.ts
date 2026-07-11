/**
 * Passkeys admin — VÉRIFICATION d'authentification (parcours découvrable).
 *
 * Étapes : consommer le challenge (usage unique atomique) → retrouver le
 * credential par credential_id → REVÉRIFIER le rôle admin du propriétaire
 * (une preuve WebAuthn ne suffit jamais à accorder le rôle) → vérifier la
 * signature (origin/RP ID stricts, user verification) → contrôle signCount →
 * puis SEULEMENT poser le cookie `cier_admin`.
 *
 * NOTE DE PORTÉE (dette connue) : poser `cier_admin` fait perdre l'identité
 * nominative dans les requêtes admin suivantes (cookie partagé legacy). Cette
 * route ouvre l'accès admin après vérification du rôle ; elle ne prétend pas
 * rendre toute la session admin nominative. Les opérations sensibles de gestion
 * de passkeys reconstruisent, elles, un contexte nominatif (voir identity.ts).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { IS_DEMO_MODE, supabaseAdmin } from '@/lib/supabase'
import { ADMIN_SESSION_TOKEN } from '@/lib/admin-auth'
import { isAdminCapable } from '@/lib/admin/admin-access'
import { RP_ID, RP_ORIGIN } from '@/lib/passkeys/rp'
import { consumeChallenge, getByCredentialId, updateCounter } from '@/lib/passkeys/store'
import { hashChallenge, base64UrlToBytes } from '@/lib/passkeys/crypto'
import { isSignCountRegression, nextSignCount } from '@/lib/passkeys/sign-count'
import { logSecurity } from '@/lib/passkeys/audit'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = rateLimit(`pk-auth-vrf:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ ok: false, message: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })

  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Indisponible en mode démonstration.' }, { status: 503 })
  if (!ADMIN_SESSION_TOKEN) return NextResponse.json({ ok: false, message: 'Back-office non configuré.' }, { status: 503 })

  const body = await req.json().catch(() => null)
  const challengeId = body?.challengeId as string | undefined
  const response = body?.response
  if (!challengeId || !response?.id) return NextResponse.json({ ok: false, message: 'Requête invalide.' }, { status: 400 })

  const now = Date.now()
  const consumed = await consumeChallenge({ id: challengeId, expectedUserId: null, expectedCeremony: 'authentication', nowMs: now })
  if (!consumed.ok) {
    if (consumed.reason === 'reuse') await logSecurity('passkey_challenge_reuse', { ip, result: 'authentication' })
    await logSecurity('passkey_login_denied', { ip, result: consumed.reason })
    return NextResponse.json({ ok: false, message: 'Échec de l’authentification. Réessayez.' }, { status: 401 })
  }

  const credentialId = String(response.id)
  const cred = await getByCredentialId(credentialId)
  if (!cred || cred.revoked_at) {
    await logSecurity('passkey_login_denied', { credentialId, ip, result: cred ? 'revoked' : 'unknown' })
    return NextResponse.json({ ok: false, code: 'revoked_or_unknown', message: cred ? 'Cette passkey a été révoquée.' : 'Passkey inconnue.' }, { status: 401 })
  }

  // Autorisation ≠ preuve : revérifier le rôle admin du propriétaire côté serveur.
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', cred.user_id).single()
  const role = (profile?.role as string) || ''
  if (!isAdminCapable(role)) {
    await logSecurity('passkey_login_denied', { userId: cred.user_id, credentialId, ip, result: 'role_removed' })
    return NextResponse.json({ ok: false, code: 'not_admin', message: "Ce compte n'a plus accès à l'administration." }, { status: 403 })
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: (challenge) => hashChallenge(challenge) === consumed.challengeHash,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
      credential: {
        id: cred.credential_id,
        publicKey: base64UrlToBytes(cred.public_key),
        counter: Number(cred.sign_count) || 0,
        transports: (cred.transports || undefined) as any,
      },
    })
  } catch {
    await logSecurity('passkey_login_denied', { userId: cred.user_id, credentialId, ip, result: 'verify_error' })
    return NextResponse.json({ ok: false, message: 'La vérification a échoué.' }, { status: 401 })
  }

  if (!verification.verified) {
    await logSecurity('passkey_login_denied', { userId: cred.user_id, credentialId, ip, result: 'not_verified' })
    return NextResponse.json({ ok: false, message: 'La vérification a échoué.' }, { status: 401 })
  }

  const newCounter = verification.authenticationInfo.newCounter
  if (isSignCountRegression(Number(cred.sign_count) || 0, newCounter)) {
    await logSecurity('passkey_signcount_regression', { userId: cred.user_id, credentialId, ip, result: `${cred.sign_count}->${newCounter}` })
    return NextResponse.json({ ok: false, code: 'signcount', message: 'Anomalie de sécurité détectée sur cette passkey. Connexion refusée.' }, { status: 401 })
  }

  await updateCounter(cred.id, nextSignCount(Number(cred.sign_count) || 0, newCounter), now)
  await logSecurity('passkey_login_success', { userId: cred.user_id, credentialId, ip })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('cier_admin', ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 h (identique aux autres portes admin)
  })
  return res
}
