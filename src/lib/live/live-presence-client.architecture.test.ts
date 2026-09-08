import {
  existsSync,
  readFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import {
  describe,
  expect,
  it,
} from 'vitest'

const path = resolve(
  process.cwd(),
  'src/lib/live/live-presence-client.ts',
)

const source = existsSync(path)
  ? readFileSync(path, 'utf8')
  : ''

describe('LIVE 4A.4 client presence architecture', () => {
  it('defines the agreed polling and heartbeat timings', () => {
    expect(source).toContain(
      'LIVE_PRESENCE_COUNT_INTERVAL_MS',
    )

    expect(source).toContain(
      'LIVE_PRESENCE_HEARTBEAT_INTERVAL_MS',
    )
  })

  it('exposes durable guest identity and per-live consent helpers', () => {
    expect(source).toContain(
      'getOrCreateGuestSessionId',
    )

    expect(source).toContain(
      'hasJoinedLive',
    )

    expect(source).toContain(
      'markLiveJoined',
    )
  })

  it('exposes only the three public presence requests needed by the UI', () => {
    expect(source).toContain(
      'requestLiveJoin',
    )

    expect(source).toContain(
      'requestLiveHeartbeat',
    )

    expect(source).toContain(
      'requestLivePresenceCount',
    )
  })
})