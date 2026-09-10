import type {
  ReactionCounts,
} from './live-reactions'

const VIDEO_ID_RE =
  /^[A-Za-z0-9_-]{11}$/

const ALLOWED_HOSTS =
  new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
  ])

export type ReplayReactionSnapshot =
  | {
      ok: true
      state: 'final'
      liveKey: string
      uniqueByType: ReactionCounts
    }
  | {
      ok: false
      reason:
        | 'not_found'
        | 'not_recorded'
        | 'not_final'
        | 'unavailable'
    }

function strictVideoId(
  value: string,
): string | null {
  return VIDEO_ID_RE.test(value)
    ? value
    : null
}

export function parseReactionYouTubeId(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const input = value.trim()

  if (!input) {
    return null
  }

  const raw =
    strictVideoId(input)

  if (raw) {
    return raw
  }

  let url: URL

  try {
    url = new URL(input)
  } catch {
    return null
  }

  if (
    url.protocol !== 'http:' &&
    url.protocol !== 'https:'
  ) {
    return null
  }

  if (
    url.username ||
    url.password ||
    url.port
  ) {
    return null
  }

  if (
    !ALLOWED_HOSTS.has(
      url.hostname.toLowerCase(),
    )
  ) {
    return null
  }

  const host =
    url.hostname.toLowerCase()

  if (host === 'youtu.be') {
    const match =
      url.pathname.match(
        /^\/([A-Za-z0-9_-]{11})$/,
      )

    return match
      ? match[1]
      : null
  }

  if (
    url.pathname === '/watch'
  ) {
    const values =
      url.searchParams.getAll('v')

    if (
      values.length !== 1
    ) {
      return null
    }

    return strictVideoId(
      values[0],
    )
  }

  const pathMatch =
    url.pathname.match(
      /^\/(?:embed|live|shorts)\/([A-Za-z0-9_-]{11})\/?$/,
    )

  return pathMatch
    ? pathMatch[1]
    : null
}