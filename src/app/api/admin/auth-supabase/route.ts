import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { ADMIN_SESSION_TOKEN } from '@/lib/admin-auth'
import { getSessionProfile } from '@/lib/member-auth'
import { createRouteClient } from '@/lib/supabase-server'
import { isAdminCapable } from '@/lib/admin/admin-access'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Connexion admin NOMINATIVE (V2.5-C-②-C1) — route ADDITIVE.
 *
 * Prérequis : le client a DÉJÀ établi une session Supabase (signInWithPassword côté navigateur,
 * même mécanisme que le login membre). Ici, côté serveur, on :
 *   1. lit le profil réel via la session Supabase (getSessionProfile → supabaseAdmin) ;
 *   2. vérifie que son rôle a `can_access_admin` (isAdminCapable) — le rôle vient du SERVEUR ;
 *   3. si oui → pose le cookie legacy `cier_admin` (compat middleware) ;
 *   4. si non → refuse ET révoque la session Supabase tout juste créée.
 *
 * NE MODIFIE PAS la route code legacy `/api/admin/auth`. Aucun rôle/scope dans le cookie.
 * Aucun enforcement supplémentaire n'est introduit ici.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Anti-brute-force (mêmes bornes que /api/admin/auth).
  const rl = rateLimit(`admin-auth-supabase:${clientIp(req)}`, { limit: 8, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json({ ok: false, message: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })
  }

  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Connexion nominative indisponible en mode démonstration.' }, { status: 503 })
  if (!ADMIN_SESSION_TOKEN) return NextResponse.json({ ok: false, message: 'Back-office non configuré (ADMIN_SESSION_TOKEN manquant).' }, { status: 503 })

  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Session non établie. Reconnectez-vous.' }, { status: 401 })

  if (!isAdminCapable(sp.role)) {
    // Ne jamais laisser une session admin non autorisée : révoquer la session Supabase créée.
    try { await createRouteClient().auth.signOut() } catch { /* best-effort */ }
    return NextResponse.json({ ok: false, code: 'not_admin', message: "Ce compte n'a pas accès à l'administration." }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('cier_admin', ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 heures (identique au legacy)
  })
  return res
}
