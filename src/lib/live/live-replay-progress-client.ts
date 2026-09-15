import {
  applyReplayProgressSample,
  normalizeReplayProgress,
  type LiveReplayProgress,
  type LiveReplayProgressWrite,
} from './live-replay-progress'

const API_PATH =
  '/api/live/replay/progress'

const LOCAL_PREFIX =
  'citadelle_live_replay_progress_v1:'

export type ReplayProgressServerResult =
  | {
      ok: true
      progress: LiveReplayProgress | null
    }
  | {
      ok: false
      reason:
        | 'identity_required'
        | 'unavailable'
    }

function storageKey(
  cmsLiveId: string,
): string {
  return `${LOCAL_PREFIX}${cmsLiveId}`
}

export function createReplaySessionKey():
  string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto
      .randomUUID()
      .toLowerCase()
  }

  return [
    Date.now().toString(16),
    Math.random().toString(16).slice(2),
    Math.random().toString(16).slice(2),
  ]
    .join('-')
    .slice(0, 128)
}

export function readLocalReplayProgress(
  cmsLiveId: string,
): LiveReplayProgress | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw =
      window.localStorage.getItem(
        storageKey(cmsLiveId),
      )

    if (!raw) return null

    return normalizeReplayProgress(
      cmsLiveId,
      JSON.parse(raw),
    )
  } catch {
    return null
  }
}

export function writeLocalReplayProgress(
  progress: LiveReplayProgress,
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      storageKey(progress.cmsLiveId),
      JSON.stringify(progress),
    )
  } catch {
    // Best-effort local memory.
  }
}

export function saveLocalReplayProgress(
  input: LiveReplayProgressWrite,
  nowIso = new Date().toISOString(),
): LiveReplayProgress {
  const current =
    readLocalReplayProgress(
      input.cmsLiveId,
    )

  const next =
    applyReplayProgressSample(
      current,
      input,
      nowIso,
    )

  writeLocalReplayProgress(next)

  return next
}

function timestamp(
  value:
    | string
    | null
    | undefined,
): number {
  if (!value) return 0

  const parsed =
    Date.parse(value)

  return Number.isFinite(parsed)
    ? parsed
    : 0
}

export function chooseNewestReplayProgress(
  local: LiveReplayProgress | null,
  server: LiveReplayProgress | null,
): LiveReplayProgress | null {
  if (!local) return server
  if (!server) return local

  return (
    timestamp(local.updatedAt) >
    timestamp(server.updatedAt)
      ? local
      : server
  )
}

export async function getServerReplayProgress(
  cmsLiveId: string,
): Promise<ReplayProgressServerResult> {
  try {
    const params =
      new URLSearchParams({
        cmsLiveId,
      })

    const response =
      await fetch(
        `${API_PATH}?${params}`,
        {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        },
      )

    if (response.status === 401) {
      return {
        ok: false,
        reason: 'identity_required',
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    const body =
      await response
        .json()
        .catch(() => null)

    if (!body?.ok) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      progress:
        body.progress
          ? normalizeReplayProgress(
              cmsLiveId,
              body.progress,
            )
          : null,
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}

export async function saveServerReplayProgress(
  input: LiveReplayProgressWrite,
): Promise<ReplayProgressServerResult> {
  try {
    const response =
      await fetch(
        API_PATH,
        {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        },
      )

    if (response.status === 401) {
      return {
        ok: false,
        reason: 'identity_required',
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    const body =
      await response
        .json()
        .catch(() => null)

    if (
      !body?.ok ||
      !body.progress
    ) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      progress:
        normalizeReplayProgress(
          input.cmsLiveId,
          body.progress,
        ),
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}