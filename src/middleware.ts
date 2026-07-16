import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { isValidAdminToken } from '@/lib/admin-auth'

/**
 * Middleware d'authentification.
 *
 * - Mode démo (Supabase non configuré) : laisse TOUT passer (données fictives,
 *   aucune redirection) — l'expérience de démonstration reste intacte.
 * - Mode réel : rafraîchit la session (cookies) et protège /member & /admin.
 */
const DEMO_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function middleware(req: NextRequest) {
  const { pathname: adminPath } = req.nextUrl

  // ── Porte du back-office : protège /admin/* ──
  // Exceptions sans cookie `cier_admin` :
  //   - /admin/login
  //   - /admin/forgot-password (demande de reset)
  //   - /admin/update-password (session recovery Supabase uniquement)
  // Fonctionne en mode démo ET réel.
  const adminPublic =
    adminPath === '/admin/login' ||
    adminPath === '/admin/forgot-password' ||
    adminPath === '/admin/update-password'
  if (adminPath.startsWith('/admin') && !adminPublic) {
    const token = req.cookies.get('cier_admin')?.value
    if (!isValidAdminToken(token)) {
      const url = req.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirect', adminPath)
      return NextResponse.redirect(url)
    }
  }

  if (DEMO_MODE) return NextResponse.next()

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // L'espace /admin est entièrement gardé par le cookie `cier_admin` ci-dessus
  // (code ADMIN_ACCESS_CODE → /api/admin/auth). On ne le passe JAMAIS par la
  // session Supabase membre : sinon /admin/login serait renvoyé vers /login.
  // Ici, seul l'espace membre est protégé par la session Supabase.
  const isMemberProtected = pathname.startsWith('/member')

  if (isMemberProtected && !session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return res
}

// Ne s'exécute que sur les espaces protégés + le callback auth — jamais sur les pages publiques.
export const config = {
  matcher: ['/member/:path*', '/admin/:path*', '/auth/:path*'],
}
