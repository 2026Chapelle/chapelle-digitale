import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-server'

/** Déconnexion admin : supprime le cookie de session et révoque la session Supabase. */
export const runtime = 'nodejs'

export async function POST() {
  let signOutSuccess = true
  try {
    const supabase = createRouteClient()
    const { error } = await supabase.auth.signOut()
    if (error) signOutSuccess = false
  } catch {
    signOutSuccess = false
  }

  // Cookie toujours effacé, même si la révocation Supabase échoue.
  const res = NextResponse.json(
    { ok: signOutSuccess, sessionRevoked: signOutSuccess },
    { status: signOutSuccess ? 200 : 502 },
  )
  res.cookies.set('cier_admin', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
