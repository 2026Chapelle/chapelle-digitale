/**
 * Passkeys admin — options d'AUTHENTIFICATION (parcours DÉCOUVRABLE).
 *
 * Aucune adresse email demandée au préalable : `allowCredentials` vide → le
 * navigateur propose les passkeys résidentes de l'appareil. Le propriétaire est
 * retrouvé APRÈS la preuve cryptographique (via credential_id), puis son rôle
 * admin est revérifié côté serveur avant d'ouvrir l'accès.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { RP_ID } from '@/lib/passkeys/rp'
import { createChallenge, purgeExpiredChallenges } from '@/lib/passkeys/store'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const rl = rateLimit(`pk-auth-opt:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ ok: false, message: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })

  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Indisponible en mode démonstration.' }, { status: 503 })

  const now = Date.now()
  await purgeExpiredChallenges(now)

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
    allowCredentials: [], // découvrable / usernameless
  })

  const challengeId = await createChallenge({ userId: null, ceremony: 'authentication', challenge: options.challenge, nowMs: now })
  return NextResponse.json({ ok: true, challengeId, options })
}
