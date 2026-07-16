/**
 * Callback OAuth / confirmation email / recovery Supabase (PKCE `?code=`).
 *
 * Échange le code contre une session cookie, puis redirige vers un `next`
 * allowlisté uniquement (anti open-redirect).
 */
import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { SITE_URL } from '@/lib/site-url'
import {
  resolveAuthRedirectOrigin,
  sanitizeAuthNext,
} from '@/lib/auth/safe-redirect'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeAuthNext(searchParams.get('next'), '/member/dashboard')
  const origin = resolveAuthRedirectOrigin(request.url, SITE_URL)

  if (!code) {
    // Recovery / OAuth invalide — pas de détail sensible
    if (next.startsWith('/admin')) {
      return NextResponse.redirect(`${origin}/admin/login?error=recovery`)
    }
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  if (IS_DEMO_MODE) {
    return NextResponse.redirect(`${origin}/login?error=demo`)
  }

  try {
    const supabase = createRouteClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      if (next.startsWith('/admin')) {
        return NextResponse.redirect(`${origin}/admin/login?error=recovery`)
      }
      return NextResponse.redirect(`${origin}/login?error=auth`)
    }
  } catch {
    if (next.startsWith('/admin')) {
      return NextResponse.redirect(`${origin}/admin/login?error=recovery`)
    }
    return NextResponse.redirect(`${origin}/login?error=auth`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
