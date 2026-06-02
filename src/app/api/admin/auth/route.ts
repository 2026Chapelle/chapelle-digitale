import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Authentification back-office (porte d'entrée /admin).
 *
 * Stratégie actuelle (mock-friendly, sécurisée pour un MVP) :
 *   - POST { code } → comparé à ADMIN_ACCESS_CODE (côté serveur uniquement).
 *   - Succès → pose un cookie httpOnly `cier_admin` = ADMIN_SESSION_TOKEN.
 *   - Le middleware vérifie ce cookie sur toutes les routes /admin/*.
 *
 * Évolution Supabase : remplacer la comparaison de code par une vérification
 * du rôle de l'utilisateur connecté (profiles.role === 'admin') via la session
 * Supabase, puis poser le même cookie. Les composants UI ne changent pas.
 *
 * Variables d'env REQUISES en production (PlanetHoster) :
 *   ADMIN_ACCESS_CODE      code d'accès admin
 *   ADMIN_SESSION_TOKEN    jeton de session opaque
 */
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { ADMIN_SESSION_TOKEN } from '@/lib/admin-auth'

export const runtime = 'nodejs'

const IS_PROD = process.env.NODE_ENV === 'production'
// En production, AUCUN repli sur une valeur connue : si la var manque, l'accès est refusé.
const ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || (IS_PROD ? null : 'royaume-admin')
const SESSION_TOKEN = ADMIN_SESSION_TOKEN

export async function POST(req: NextRequest) {
  // Anti-brute-force : 8 tentatives / 10 min / IP.
  const rl = rateLimit(`admin-auth:${clientIp(req)}`, { limit: 8, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  if (!ACCESS_CODE || !SESSION_TOKEN) {
    return NextResponse.json({ ok: false, message: 'Back-office non configuré (ADMIN_ACCESS_CODE / ADMIN_SESSION_TOKEN manquant).' }, { status: 503 })
  }

  let code = ''
  try {
    const body = await req.json()
    code = (body?.code ?? '').toString()
  } catch {
    return NextResponse.json({ ok: false, message: 'Requête invalide.' }, { status: 400 })
  }

  if (code !== ACCESS_CODE) {
    return NextResponse.json({ ok: false, message: "Code d'accès incorrect." }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true, message: 'Connexion réussie.' })
  res.cookies.set('cier_admin', SESSION_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 heures
  })
  return res
}
