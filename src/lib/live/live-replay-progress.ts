export const LIVE_REPLAY_COMPLETE_PERCENT = 90
export const LIVE_REPLAY_RESUME_MIN_SECONDS = 15
export const LIVE_REPLAY_SAVE_THROTTLE_MS = 8_000
export const LIVE_REPLAY_SAMPLE_INTERVAL_MS = 3_000

export type LiveReplayProgress = {
  cmsLiveId: string
  lastPositionSeconds: number
  durationSeconds: number | null
  percentComplete: number
  completedAt: string | null
  viewCount: number
  lastSessionKey: string | null
  firstWatchedAt: string | null
  lastWatchedAt: string | null
  updatedAt: string | null
}

export type LiveReplayProgressWrite = {
  cmsLiveId: string
  positionSeconds: number
  durationSeconds: number
  sessionKey: string
  ended?: boolean
}

export function clampReplaySeconds(
  value: unknown,
  max?: number | null,
): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  const rounded = Math.round(parsed)

  if (
    typeof max === 'number' &&
    Number.isFinite(max) &&
    max > 0
  ) {
    return Math.min(
      rounded,
      Math.round(max),
    )
  }

  return rounded
}

export function computeReplayPercent(
  positionSeconds: unknown,
  durationSeconds: unknown,
): number {
  const duration = Number(durationSeconds)

  if (!Number.isFinite(duration) || duration <= 0) {
    return 0
  }

  const position =
    clampReplaySeconds(
      positionSeconds,
      duration,
    )

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (position / duration) * 10_000,
      ) / 100,
    ),
  )
}

export function isReplayComplete(
  percent: unknown,
): boolean {
  const value = Number(percent)

  return (
    Number.isFinite(value) &&
    value >= LIVE_REPLAY_COMPLETE_PERCENT
  )
}

export function shouldOfferReplayResume(
  progress:
    | Pick<
        LiveReplayProgress,
        'lastPositionSeconds' |
        'percentComplete' |
        'completedAt'
      >
    | null
    | undefined,
): boolean {
  if (!progress) return false
  if (progress.completedAt) return false

  if (
    Number(progress.percentComplete) >=
    LIVE_REPLAY_COMPLETE_PERCENT
  ) {
    return false
  }

  return (
    Number(progress.lastPositionSeconds) >=
    LIVE_REPLAY_RESUME_MIN_SECONDS
  )
}

export function formatReplayPosition(
  totalSeconds: unknown,
): string {
  const seconds =
    clampReplaySeconds(totalSeconds)

  const hours =
    Math.floor(seconds / 3600)

  const minutes =
    Math.floor(
      (seconds % 3600) / 60,
    )

  const remaining =
    seconds % 60

  if (hours > 0) {
    return [
      hours,
      minutes,
      remaining,
    ]
      .map(
        (part, index) =>
          index === 0
            ? String(part)
            : String(part)
                .padStart(2, '0'),
      )
      .join(':')
  }

  return [
    minutes,
    remaining,
  ]
    .map(part =>
      String(part)
        .padStart(2, '0'),
    )
    .join(':')
}

function validDateString(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(
      Date.parse(value),
    )
  )
}

export function normalizeReplayProgress(
  cmsLiveId: string,
  value: unknown,
): LiveReplayProgress | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null
  }

  const row =
    value as Record<string, unknown>

  const durationRaw =
    Number(row.durationSeconds)

  const durationSeconds =
    Number.isFinite(durationRaw) &&
    durationRaw > 0
      ? Math.round(durationRaw)
      : null

  const lastPositionSeconds =
    clampReplaySeconds(
      row.lastPositionSeconds,
      durationSeconds,
    )

  const percentRaw =
    Number(row.percentComplete)

  const percentComplete =
    Number.isFinite(percentRaw)
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              percentRaw * 100,
            ) / 100,
          ),
        )
      : computeReplayPercent(
          lastPositionSeconds,
          durationSeconds,
        )

  return {
    cmsLiveId,
    lastPositionSeconds,
    durationSeconds,
    percentComplete,
    completedAt:
      validDateString(row.completedAt)
        ? row.completedAt
        : null,
    viewCount:
      Math.max(
        1,
        Math.round(
          Number(row.viewCount) || 1,
        ),
      ),
    lastSessionKey:
      typeof row.lastSessionKey === 'string'
        ? row.lastSessionKey
        : null,
    firstWatchedAt:
      validDateString(row.firstWatchedAt)
        ? row.firstWatchedAt
        : null,
    lastWatchedAt:
      validDateString(row.lastWatchedAt)
        ? row.lastWatchedAt
        : null,
    updatedAt:
      validDateString(row.updatedAt)
        ? row.updatedAt
        : null,
  }
}

export function applyReplayProgressSample(
  existing:
    | LiveReplayProgress
    | null
    | undefined,
  input: LiveReplayProgressWrite,
  nowIso = new Date().toISOString(),
): LiveReplayProgress {
  const incomingDuration =
    Math.max(
      0,
      Math.round(
        Number(input.durationSeconds) || 0,
      ),
    )

  const durationSeconds =
    incomingDuration > 0
      ? incomingDuration
      : existing?.durationSeconds ?? null

  const lastPositionSeconds =
    clampReplaySeconds(
      input.positionSeconds,
      durationSeconds,
    )

  const incomingPercent =
    computeReplayPercent(
      lastPositionSeconds,
      durationSeconds,
    )

  const previousPercent =
    Math.max(
      0,
      Number(existing?.percentComplete) || 0,
    )

  const percentComplete =
    Math.max(
      previousPercent,
      incomingPercent,
    )

  const completedAt =
    existing?.completedAt ??
    (
      input.ended === true ||
      isReplayComplete(percentComplete)
        ? nowIso
        : null
    )

  const sessionChanged =
    Boolean(existing) &&
    existing?.lastSessionKey !==
      input.sessionKey

  const viewCount =
    existing
      ? Math.max(
          1,
          Number(existing.viewCount) || 1,
        ) +
        (sessionChanged ? 1 : 0)
      : 1

  return {
    cmsLiveId: input.cmsLiveId,
    lastPositionSeconds,
    durationSeconds,
    percentComplete,
    completedAt,
    viewCount,
    lastSessionKey: input.sessionKey,
    firstWatchedAt:
      existing?.firstWatchedAt ?? nowIso,
    lastWatchedAt: nowIso,
    updatedAt: nowIso,
  }
}