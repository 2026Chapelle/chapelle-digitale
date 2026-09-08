export const LIVE_PRESENCE_COUNT_INTERVAL_MS =
  15_000

export const LIVE_PRESENCE_HEARTBEAT_INTERVAL_MS =
  30_000

const GUEST_STORAGE_KEY =
  'citadelle_live_guest_session_id_v1'

const JOINED_STORAGE_PREFIX =
  'citadelle_live_presence_joined_v1:'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const YOUTUBE_VIDEO_ID_RE =
  /^[A-Za-z0-9_-]{11}$/

export type LivePresenceStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type LivePresenceCrypto = {
  randomUUID?: () => string
  getRandomValues(array: Uint8Array): Uint8Array
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export type LiveJoinResponse = {
  ok: true
  participantKind:
    | 'member'
    | 'guest'
}

export type LiveHeartbeatResponse = {
  ok: true
  participantKind:
    | 'member'
    | 'guest'
  active: boolean
}

export type LivePresenceCountResponse = {
  ok: true
  live: boolean
  activeTotal: number
}

function normalizeUuid(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized =
    value.trim().toLowerCase()

  return UUID_RE.test(normalized)
    ? normalized
    : null
}

function createUuidFromCrypto(
  cryptoApi: LivePresenceCrypto,
): string {
  if (
    typeof cryptoApi.randomUUID ===
    'function'
  ) {
    const generated =
      normalizeUuid(
        cryptoApi.randomUUID(),
      )

    if (generated) {
      return generated
    }
  }

  const bytes =
    new Uint8Array(16)

  cryptoApi.getRandomValues(bytes)

  bytes[6] =
    (bytes[6] & 0x0f) | 0x40

  bytes[8] =
    (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes)
    .map(value =>
      value
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

export function getOrCreateGuestSessionId(
  storage: LivePresenceStorage,
  cryptoApi: LivePresenceCrypto,
): string {
  try {
    const existing =
      normalizeUuid(
        storage.getItem(
          GUEST_STORAGE_KEY,
        ),
      )

    if (existing) {
      return existing
    }
  } catch {
    // localStorage peut être indisponible.
  }

  const generated =
    createUuidFromCrypto(
      cryptoApi,
    )

  try {
    storage.setItem(
      GUEST_STORAGE_KEY,
      generated,
    )
  } catch {
    // UUID éphémère pour ce montage.
  }

  return generated
}

function joinedStorageKey(
  videoId: string,
): string | null {
  if (
    !YOUTUBE_VIDEO_ID_RE.test(
      videoId,
    )
  ) {
    return null
  }

  return (
    JOINED_STORAGE_PREFIX +
    videoId
  )
}

export function hasJoinedLive(
  storage: LivePresenceStorage,
  videoId: string,
): boolean {
  const key =
    joinedStorageKey(videoId)

  if (!key) {
    return false
  }

  try {
    return (
      storage.getItem(key) === '1'
    )
  } catch {
    return false
  }
}

export function markLiveJoined(
  storage: LivePresenceStorage,
  videoId: string,
): void {
  const key =
    joinedStorageKey(videoId)

  if (!key) {
    return
  }

  try {
    storage.setItem(
      key,
      '1',
    )
  } catch {
    // Consentement local impossible à persister.
  }
}

async function parseJson(
  response: Response,
): Promise<Record<string, unknown> | null> {
  if (!response.ok) {
    return null
  }

  const payload =
    await response
      .json()
      .catch(() => null)

  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return null
  }

  return payload as Record<
    string,
    unknown
  >
}

function isParticipantKind(
  value: unknown,
): value is 'member' | 'guest' {
  return (
    value === 'member' ||
    value === 'guest'
  )
}

export async function requestLiveJoin(
  guestSessionId: string,
  fetcher: FetchLike = fetch,
): Promise<LiveJoinResponse | null> {
  try {
    const response =
      await fetcher(
        '/api/live/presence/join',
        {
          method: 'POST',
          cache: 'no-store',
          credentials:
            'same-origin',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            guestSessionId,
          }),
        },
      )

    const payload =
      await parseJson(response)

    if (
      payload?.ok !== true ||
      !isParticipantKind(
        payload.participantKind,
      )
    ) {
      return null
    }

    return {
      ok: true,
      participantKind:
        payload.participantKind,
    }
  } catch {
    return null
  }
}

export async function requestLiveHeartbeat(
  guestSessionId: string,
  fetcher: FetchLike = fetch,
): Promise<LiveHeartbeatResponse | null> {
  try {
    const response =
      await fetcher(
        '/api/live/presence/heartbeat',
        {
          method: 'POST',
          cache: 'no-store',
          credentials:
            'same-origin',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            guestSessionId,
          }),
        },
      )

    const payload =
      await parseJson(response)

    if (
      payload?.ok !== true ||
      !isParticipantKind(
        payload.participantKind,
      ) ||
      typeof payload.active !==
        'boolean'
    ) {
      return null
    }

    return {
      ok: true,
      participantKind:
        payload.participantKind,
      active:
        payload.active,
    }
  } catch {
    return null
  }
}

export async function requestLivePresenceCount(
  fetcher: FetchLike = fetch,
): Promise<LivePresenceCountResponse | null> {
  try {
    const response =
      await fetcher(
        '/api/live/presence',
        {
          method: 'GET',
          cache: 'no-store',
          credentials:
            'same-origin',
        },
      )

    const payload =
      await parseJson(response)

    if (
      payload?.ok !== true ||
      typeof payload.live !==
        'boolean' ||
      typeof payload.activeTotal !==
        'number' ||
      !Number.isFinite(
        payload.activeTotal,
      ) ||
      payload.activeTotal < 0
    ) {
      return null
    }

    return {
      ok: true,
      live: payload.live,
      activeTotal:
        Math.trunc(
          payload.activeTotal,
        ),
    }
  } catch {
    return null
  }
}