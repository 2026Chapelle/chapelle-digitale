import 'server-only'

import { supabaseAdmin } from '@/lib/supabase'
import {
  emptyLiveReplayReactionCounts,
  isLiveReplayReaction,
  type LiveReplayReaction,
  type LiveReplayReactionSnapshot,
} from './live-replay-reactions'
import type { ReplayReactionIdentity } from './live-replay-reaction-identity'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ReplayReactionResult =
  | { ok: true; snapshot: LiveReplayReactionSnapshot }
  | { ok: false; reason: 'not_replay' | 'disabled' | 'unavailable' }

type ReplayRow = {
  status: string | null
  youtube_url: string | null
  video_url: string | null
}

type ReactionRow = {
  actor_key: string
  reaction: unknown
}

function replayHasMedia(row: ReplayRow): boolean {
  return Boolean(
    (typeof row.youtube_url === 'string' && row.youtube_url.trim()) ||
    (typeof row.video_url === 'string' && row.video_url.trim()),
  )
}

async function requireReplay(cmsLiveId: string): Promise<'ok' | 'not_replay' | 'unavailable'> {
  if (!UUID_RE.test(cmsLiveId)) return 'not_replay'

  try {
    const db = supabaseAdmin as any
    const { data, error } = await db
      .from('cms_lives')
      .select('status,youtube_url,video_url')
      .eq('id', cmsLiveId)
      .maybeSingle()

    if (error) return 'unavailable'
    if (!data) return 'not_replay'

    const row = data as ReplayRow
    if (row.status !== 'ended' && row.status !== 'published') return 'not_replay'
    if (!replayHasMedia(row)) return 'not_replay'

    return 'ok'
  } catch {
    return 'unavailable'
  }
}

async function reactionsEnabled(cmsLiveId: string): Promise<boolean | null> {
  try {
    const db = supabaseAdmin as any
    const { data, error } = await db
      .from('live_replay_reaction_settings')
      .select('enabled')
      .eq('cms_live_id', cmsLiveId)
      .maybeSingle()

    if (error) return null
    if (!data) return true
    return data.enabled !== false
  } catch {
    return null
  }
}

async function transferGuestReaction(
  cmsLiveId: string,
  identity: ReplayReactionIdentity,
): Promise<boolean> {
  if (
    identity.kind !== 'member' ||
    !identity.guestActorKey ||
    identity.guestActorKey === identity.actorKey
  ) {
    return true
  }

  try {
    const db = supabaseAdmin as any
    const { error } = await db.rpc('live_replay_reaction_transfer', {
      p_cms_live_id: cmsLiveId,
      p_guest_actor_key: identity.guestActorKey,
      p_user_id: identity.userId,
    })
    return !error
  } catch {
    return false
  }
}

async function readSnapshot(
  cmsLiveId: string,
  identity: ReplayReactionIdentity,
  enabled: boolean,
): Promise<ReplayReactionResult> {
  if (!enabled) {
    return {
      ok: true,
      snapshot: {
        enabled: false,
        selectedReaction: null,
        counts: emptyLiveReplayReactionCounts(),
      },
    }
  }

  try {
    const db = supabaseAdmin as any
    const { data, error } = await db
      .from('live_replay_reactions')
      .select('actor_key,reaction')
      .eq('cms_live_id', cmsLiveId)

    if (error) return { ok: false, reason: 'unavailable' }

    const counts = emptyLiveReplayReactionCounts()
    let selectedReaction: LiveReplayReaction | null = null

    for (const raw of (data ?? []) as ReactionRow[]) {
      if (!raw || typeof raw.actor_key !== 'string' || !isLiveReplayReaction(raw.reaction)) {
        return { ok: false, reason: 'unavailable' }
      }
      counts[raw.reaction] += 1
      if (raw.actor_key === identity.actorKey) selectedReaction = raw.reaction
    }

    return {
      ok: true,
      snapshot: { enabled: true, selectedReaction, counts },
    }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

async function prepare(
  cmsLiveId: string,
  identity: ReplayReactionIdentity,
): Promise<
  | { ok: true; enabled: boolean }
  | { ok: false; reason: 'not_replay' | 'unavailable' }
> {
  const replay = await requireReplay(cmsLiveId)
  if (replay !== 'ok') return { ok: false, reason: replay }

  const enabled = await reactionsEnabled(cmsLiveId)
  if (enabled === null) return { ok: false, reason: 'unavailable' }

  if (enabled && !(await transferGuestReaction(cmsLiveId, identity))) {
    return { ok: false, reason: 'unavailable' }
  }

  return { ok: true, enabled }
}

export async function getReplayReactionSnapshot(
  cmsLiveId: string,
  identity: ReplayReactionIdentity,
): Promise<ReplayReactionResult> {
  const ready = await prepare(cmsLiveId, identity)
  if (!ready.ok) return ready
  return readSnapshot(cmsLiveId, identity, ready.enabled)
}

export async function putReplayReaction(
  cmsLiveId: string,
  reaction: LiveReplayReaction,
  identity: ReplayReactionIdentity,
): Promise<ReplayReactionResult> {
  const ready = await prepare(cmsLiveId, identity)
  if (!ready.ok) return ready
  if (!ready.enabled) return { ok: false, reason: 'disabled' }

  try {
    const db = supabaseAdmin as any
    const { error } = await db
      .from('live_replay_reactions')
      .upsert(
        {
          cms_live_id: cmsLiveId,
          actor_key: identity.actorKey,
          user_id: identity.userId,
          reaction,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'cms_live_id,actor_key' },
      )

    if (error) return { ok: false, reason: 'unavailable' }
    return readSnapshot(cmsLiveId, identity, true)
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

export async function deleteReplayReaction(
  cmsLiveId: string,
  identity: ReplayReactionIdentity,
): Promise<ReplayReactionResult> {
  const ready = await prepare(cmsLiveId, identity)
  if (!ready.ok) return ready
  if (!ready.enabled) return { ok: false, reason: 'disabled' }

  try {
    const db = supabaseAdmin as any
    const { error } = await db
      .from('live_replay_reactions')
      .delete()
      .eq('cms_live_id', cmsLiveId)
      .eq('actor_key', identity.actorKey)

    if (error) return { ok: false, reason: 'unavailable' }
    return readSnapshot(cmsLiveId, identity, true)
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
