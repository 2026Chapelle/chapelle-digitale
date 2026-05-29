/**
 * Callback OAuth / confirmation email Supabase.
 *
 * Supabase redirige ici avec un `?code=...` après connexion Google/Facebook
 * ou validation d'email. On échange ce code contre une session (cookies) puis
 * on renvoie l'utilisateur vers son espace membre.
 */
import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-server'
import { IS_DEMO_MODE } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/member/dashboard'

  if (code && !IS_DEMO_MODE) {
    const supabase = createRouteClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
