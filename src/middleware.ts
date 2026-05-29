import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

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
  if (DEMO_MODE) return NextResponse.next()

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl
  const isProtected = pathname.startsWith('/member') || pathname.startsWith('/admin')

  if (isProtected && !session) {
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
