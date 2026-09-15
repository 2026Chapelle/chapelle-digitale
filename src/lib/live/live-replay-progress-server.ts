import 'server-only'

import {
  getVerifiedRouteProfile,
} from '@/lib/member-auth'

import {
  supabaseAdmin,
} from '@/lib/supabase'

import {
  applyReplayProgressSample,
  type LiveReplayProgress,
  type LiveReplayProgressWrite,
} from './live-replay-progress'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type FailureReason =
  | 'identity_required'
  | 'invalid_request'
  | 'not_replay'
  | 'unavailable'

export type ReplayProgressServerResult =
  | {
      ok: true
      progress: LiveReplayProgress | null
    }
  | {
      ok: false
      reason: FailureReason
    }

type ReplayRow = {
  status: string | null
  youtube_url: string | null
  video_url: string | null
}

type ProgressRow = {
  last_position_seconds: number | null
  duration_seconds: number | null
  percent_complete: number | null
  completed_at: string | null
  view_count: number | null
  last_session_key: string | null
  first_watched_at: string | null
  last_watched_at: string | null
  updated_at: string | null
}

function toProgress(
  cmsLiveId: string,
  row: ProgressRow | null | undefined,
): LiveReplayProgress | null {
  if (!row) return null

  return {
    cmsLiveId,
    lastPositionSeconds:
      Math.max(
        0,
        Number(row.last_position_seconds) || 0,
      ),
    durationSeconds:
      Number(row.duration_seconds) > 0
        ? Number(row.duration_seconds)
        : null,
    percentComplete:
      Math.max(
        0,
        Math.min(
          100,
          Number(row.percent_complete) || 0,
        ),
      ),
    completedAt:
      row.completed_at ?? null,
    viewCount:
      Math.max(
        1,
        Number(row.view_count) || 1,
      ),
    lastSessionKey:
      row.last_session_key ?? null,
    firstWatchedAt:
      row.first_watched_at ?? null,
    lastWatchedAt:
      row.last_watched_at ?? null,
    updatedAt:
      row.updated_at ?? null,
  }
}

async function replayExists(
  cmsLiveId: string,
): Promise<boolean | null> {
  const db =
    supabaseAdmin as any

  const {
    data,
    error,
  } =
    await db
      .from('cms_lives')
      .select(
        'status,youtube_url,video_url',
      )
      .eq('id', cmsLiveId)
      .maybeSingle()

  if (error) return null

  const row =
    data as ReplayRow | null

  if (!row) return false

  return (
    (
      row.status === 'ended' ||
      row.status === 'published'
    ) &&
    Boolean(
      row.youtube_url ||
      row.video_url,
    )
  )
}

async function memberIdentity():
  Promise<
    | {
        userId: string
        actorKey: string
      }
    | null
  > {
  const profile =
    await getVerifiedRouteProfile()

  if (!profile?.uid) return null

  return {
    userId: profile.uid,
    actorKey: `member:${profile.uid}`,
  }
}

export function validReplayProgressId(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    UUID_RE.test(value)
  )
}

export function validReplaySessionKey(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 8 &&
    value.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  )
}

export async function getReplayProgress(
  cmsLiveId: string,
): Promise<ReplayProgressServerResult> {
  try {
    if (
      !validReplayProgressId(cmsLiveId)
    ) {
      return {
        ok: false,
        reason: 'invalid_request',
      }
    }

    const identity =
      await memberIdentity()

    if (!identity) {
      return {
        ok: false,
        reason: 'identity_required',
      }
    }

    const eligible =
      await replayExists(cmsLiveId)

    if (eligible === null) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    if (!eligible) {
      return {
        ok: false,
        reason: 'not_replay',
      }
    }

    const db =
      supabaseAdmin as any

    const {
      data,
      error,
    } =
      await db
        .from('live_replay_progress')
        .select(
          [
            'last_position_seconds',
            'duration_seconds',
            'percent_complete',
            'completed_at',
            'view_count',
            'last_session_key',
            'first_watched_at',
            'last_watched_at',
            'updated_at',
          ].join(','),
        )
        .eq(
          'cms_live_id',
          cmsLiveId,
        )
        .eq(
          'actor_key',
          identity.actorKey,
        )
        .maybeSingle()

    if (error) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      progress:
        toProgress(
          cmsLiveId,
          data as ProgressRow | null,
        ),
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}

export async function saveReplayProgress(
  input: LiveReplayProgressWrite,
): Promise<ReplayProgressServerResult> {
  try {
    if (
      !validReplayProgressId(
        input.cmsLiveId,
      ) ||
      !validReplaySessionKey(
        input.sessionKey,
      )
    ) {
      return {
        ok: false,
        reason: 'invalid_request',
      }
    }

    const identity =
      await memberIdentity()

    if (!identity) {
      return {
        ok: false,
        reason: 'identity_required',
      }
    }

    const eligible =
      await replayExists(
        input.cmsLiveId,
      )

    if (eligible === null) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    if (!eligible) {
      return {
        ok: false,
        reason: 'not_replay',
      }
    }

    const db =
      supabaseAdmin as any

    const {
      data: currentRow,
      error: currentError,
    } =
      await db
        .from('live_replay_progress')
        .select(
          [
            'last_position_seconds',
            'duration_seconds',
            'percent_complete',
            'completed_at',
            'view_count',
            'last_session_key',
            'first_watched_at',
            'last_watched_at',
            'updated_at',
          ].join(','),
        )
        .eq(
          'cms_live_id',
          input.cmsLiveId,
        )
        .eq(
          'actor_key',
          identity.actorKey,
        )
        .maybeSingle()

    if (currentError) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    const current =
      toProgress(
        input.cmsLiveId,
        currentRow as ProgressRow | null,
      )

    const now =
      new Date().toISOString()

    const next =
      applyReplayProgressSample(
        current,
        input,
        now,
      )

    const payload = {
      cms_live_id: input.cmsLiveId,
      actor_key: identity.actorKey,
      user_id: identity.userId,
      last_position_seconds:
        next.lastPositionSeconds,
      duration_seconds:
        next.durationSeconds,
      percent_complete:
        next.percentComplete,
      completed_at:
        next.completedAt,
      view_count:
        next.viewCount,
      last_session_key:
        next.lastSessionKey,
      last_watched_at:
        next.lastWatchedAt,
    }

    const {
      data,
      error,
    } =
      await db
        .from('live_replay_progress')
        .upsert(
          payload,
          {
            onConflict:
              'cms_live_id,actor_key',
          },
        )
        .select(
          [
            'last_position_seconds',
            'duration_seconds',
            'percent_complete',
            'completed_at',
            'view_count',
            'last_session_key',
            'first_watched_at',
            'last_watched_at',
            'updated_at',
          ].join(','),
        )
        .single()

    if (error) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      progress:
        toProgress(
          input.cmsLiveId,
          data as ProgressRow,
        ),
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}