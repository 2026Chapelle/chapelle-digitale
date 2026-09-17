import type {
  LiveReplayReaction,
  LiveReplayReactionSnapshot,
} from './live-replay-reactions'

export const LIVE_REPLAY_REACTION_POLL_MS = 15_000

type ReplayApiSuccess = LiveReplayReactionSnapshot & { ok: true }

async function readSuccess(response: Response): Promise<LiveReplayReactionSnapshot> {
  const body = await response.json() as Partial<ReplayApiSuccess>

  if (
    !response.ok ||
    body.ok !== true ||
    typeof body.enabled !== 'boolean' ||
    !body.counts ||
    typeof body.counts !== 'object'
  ) {
    throw new Error('replay_reaction_unavailable')
  }

  return {
    enabled: body.enabled,
    selectedReaction: body.selectedReaction ?? null,
    counts: body.counts as LiveReplayReactionSnapshot['counts'],
  }
}

export async function fetchReplayReactionSnapshot(
  cmsLiveId: string,
  fetcher: typeof fetch = fetch,
): Promise<LiveReplayReactionSnapshot> {
  const response = await fetcher(
    `/api/live/replay/reactions?cmsLiveId=${encodeURIComponent(cmsLiveId)}`,
    { method: 'GET', cache: 'no-store' },
  )

  return readSuccess(response)
}

export async function sendReplayReactionIntent(
  cmsLiveId: string,
  reaction: LiveReplayReaction | null,
  fetcher: typeof fetch = fetch,
): Promise<LiveReplayReactionSnapshot> {
  const response = await fetcher('/api/live/replay/reactions', {
    method: reaction === null ? 'DELETE' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      reaction === null
        ? { cmsLiveId }
        : { cmsLiveId, reaction },
    ),
    cache: 'no-store',
  })

  return readSuccess(response)
}

export type ReplayReactionIntentQueue<T = unknown> = {
  push(value: LiveReplayReaction | null): void
  idle(): Promise<void>
  isBusy(): boolean
  dispose(): void
}

export function createReplayReactionIntentQueue<T>(
  send: (value: LiveReplayReaction | null) => Promise<T>,
  confirm: (value: T) => void,
  rollback: () => void,
): ReplayReactionIntentQueue<T> {
  let disposed = false
  let running = false
  let pending: { value: LiveReplayReaction | null; version: number } | null = null
  let version = 0
  let idleResolvers: Array<() => void> = []

  const resolveIdle = () => {
    if (running || pending) return
    const resolvers = idleResolvers
    idleResolvers = []
    resolvers.forEach(resolve => resolve())
  }

  const drain = async (current: { value: LiveReplayReaction | null; version: number }) => {
    running = true

    try {
      const result = await send(current.value)

      if (!disposed) {
        confirm(result)
      }
    } catch {
      if (!disposed && current.version === version && pending === null) {
        rollback()
      }
    } finally {
      const next = pending
      pending = null

      if (next && !disposed) {
        await drain(next)
        return
      }

      running = false
      resolveIdle()
    }
  }

  return {
    push(value) {
      if (disposed) return

      const intent = { value, version: ++version }

      if (running) {
        pending = intent
        return
      }

      void drain(intent)
    },

    idle() {
      if (!running && pending === null) return Promise.resolve()

      return new Promise<void>(resolve => {
        idleResolvers.push(resolve)
      })
    },

    isBusy() {
      return running || pending !== null
    },

    dispose() {
      disposed = true
      pending = null
    },
  }
}
