import 'server-only'
import { cookies, headers } from 'next/headers'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import { createRouteClient } from '@/lib/supabase-server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { hashGuestSessionId, normalizeGuestSessionId } from './live-participation-server'
export type LiveReactionActorResult = { ok: true; actorKey: string } | { ok: false; reason: 'identity_required' | 'unavailable' }
function hasPresentedAuth(): boolean { return Boolean(headers().get('authorization')) || cookies().getAll().some(({ name }) => /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/i.test(name) || name === 'supabase-auth-token') }
export async function resolveLiveReactionActor(guestSessionId?: unknown): Promise<LiveReactionActorResult> {
  if (IS_DEMO_MODE) return { ok: false, reason: 'unavailable' }
  let presented: boolean
  try { presented = hasPresentedAuth(); const { data: { user }, error } = await createRouteClient().auth.getUser(); if (error) { /* LIVE_4B9A_GUEST_IDENTITY_FIX */ const authError = error as { status?: number; name?: string }; const missingSession = authError.name === 'AuthSessionMissingError'; if (!(missingSession && !presented)) { const status = authError.status; return { ok: false, reason: status === 400 || status === 401 || status === 403 ? 'identity_required' : 'unavailable' } } }; if (user?.id) { const profile = await getVerifiedRouteProfile(); return profile?.uid === user.id ? { ok: true, actorKey: `member:${user.id}` } : { ok: false, reason: 'unavailable' } }; if (presented) return { ok: false, reason: 'identity_required' } } catch { return { ok: false, reason: 'unavailable' } }
  const guest = normalizeGuestSessionId(guestSessionId)
  return guest ? { ok: true, actorKey: `guest:${hashGuestSessionId(guest)}` } : { ok: false, reason: 'identity_required' }
}
