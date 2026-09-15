import {
  LIVE_REPLAY_SAVE_THROTTLE_MS,
  formatReplayPosition,
  shouldOfferReplayResume,
  type LiveReplayProgress,
} from './live-replay-progress'

export type ReplayOpening = {
  showReturnChoice: boolean
  savedPositionSeconds: number
  savedPositionLabel: string | null
}

export type ReplayStartChoice =
  | 'resume'
  | 'restart'

export function resolveReplayOpening(
  progress:
    | LiveReplayProgress
    | null
    | undefined,
): ReplayOpening {
  if (
    !progress ||
    !shouldOfferReplayResume(
      progress,
    )
  ) {
    return {
      showReturnChoice: false,
      savedPositionSeconds: 0,
      savedPositionLabel: null,
    }
  }

  const savedPositionSeconds =
    Math.max(
      0,
      Math.round(
        Number(
          progress.lastPositionSeconds,
        ) || 0,
      ),
    )

  return {
    showReturnChoice: true,
    savedPositionSeconds,
    savedPositionLabel:
      formatReplayPosition(
        savedPositionSeconds,
      ),
  }
}

export function replayStartForChoice(
  choice: ReplayStartChoice,
  savedPositionSeconds: number,
): number {
  if (choice === 'restart') {
    return 0
  }

  return Math.max(
    0,
    Math.round(
      Number(
        savedPositionSeconds,
      ) || 0,
    ),
  )
}

export function shouldPersistReplaySample(
  lastSavedAtMs: number,
  nowMs: number,
  force: boolean,
): boolean {
  if (force) {
    return true
  }

  if (
    !Number.isFinite(
      lastSavedAtMs,
    ) ||
    lastSavedAtMs <= 0
  ) {
    return true
  }

  if (
    !Number.isFinite(
      nowMs,
    )
  ) {
    return false
  }

  return (
    nowMs -
      lastSavedAtMs >=
    LIVE_REPLAY_SAVE_THROTTLE_MS
  )
}