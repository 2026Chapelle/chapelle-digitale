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
import { SITE_URL } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next') ?? '/member/dashboard'
  // On n'autorise que des chemins internes (anti open-redirect).
  const next = nextParam.startsWith('/') ? nextParam : '/member/dashboard'

  if (code && !IS_DEMO_MODE) {
    const supabase = createRouteClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirection TOUJOURS vers le domaine canonique de la Citadelle —
  // jamais vers le host d'hébergement interne (node76-eu.n0c.com).
  return NextResponse.redirect(`${SITE_URL}${next}`)
}
