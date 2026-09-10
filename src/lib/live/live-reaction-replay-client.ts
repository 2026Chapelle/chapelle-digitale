import {
  parseReactionCounts,
} from './live-reactions'

import type {
  ReplayReactionSnapshot,
} from './live-reaction-replay'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const LIVE_KEY_RE =
  /^youtube:[A-Za-z0-9_-]{11}$/

const REQUEST_TIMEOUT_MS =
  2_000

const REASONS =
  new Set([
    'not_found',
    'not_recorded',
    'not_final',
    'unavailable',
  ])

function unavailable():
  ReplayReactionSnapshot {
  return {
    ok: false,
    reason: 'unavailable',
  }
}

function parseReplaySnapshot(
  value: unknown,
): ReplayReactionSnapshot {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return unavailable()
  }

  const record =
    value as Record<
      string,
      unknown
    >

  if (record.ok === true) {
    const counts =
      parseReactionCounts(
        record.uniqueByType,
      )

    if (
      record.state !== 'final' ||
      typeof record.liveKey !==
        'string' ||
      !LIVE_KEY_RE.test(
        record.liveKey,
      ) ||
      !counts ||
      Object.keys(record).length !== 4 ||
      !Object.hasOwn(
        record,
        'ok',
      ) ||
      !Object.hasOwn(
        record,
        'state',
      ) ||
      !Object.hasOwn(
        record,
        'liveKey',
      ) ||
      !Object.hasOwn(
        record,
        'uniqueByType',
      )
    ) {
      return unavailable()
    }

    return {
      ok: true,
      state: 'final',
      liveKey:
        record.liveKey,
      uniqueByType:
        counts,
    }
  }

  if (
    record.ok === false &&
    typeof record.reason ===
      'string' &&
    REASONS.has(
      record.reason,
    ) &&
    Object.keys(record).length === 2
  ) {
    return {
      ok: false,
      reason:
        record.reason as
          | 'not_found'
          | 'not_recorded'
          | 'not_final'
          | 'unavailable',
    }
  }

  return unavailable()
}

export async function requestReplayReactionSnapshot(
  cmsLiveId: string,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<ReplayReactionSnapshot> {
  if (
    typeof cmsLiveId !==
      'string' ||
    !UUID_RE.test(
      cmsLiveId,
    )
  ) {
    return unavailable()
  }

  const controller =
    new AbortController()

  let timer:
    | ReturnType<typeof setTimeout>
    | undefined

  const forwardAbort = () => {
    controller.abort()
  }

  if (signal?.aborted) {
    controller.abort()
  } else {
    signal?.addEventListener(
      'abort',
      forwardAbort,
      {
        once: true,
      },
    )
  }

  try {
    timer =
      setTimeout(
        () => {
          controller.abort()
        },
        REQUEST_TIMEOUT_MS,
      )

    const response =
      await fetcher(
        `/api/live/reactions/replay?cmsLiveId=${encodeURIComponent(cmsLiveId)}`,
        {
          method: 'GET',
          cache: 'no-store',
          credentials:
            'same-origin',
          signal:
            controller.signal,
        },
      )

    let payload: unknown

    try {
      payload =
        await response.json()
    } catch {
      return unavailable()
    }

    return parseReplaySnapshot(
      payload,
    )
  } catch {
    return unavailable()
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }

    signal?.removeEventListener(
      'abort',
      forwardAbort,
    )
  }
}