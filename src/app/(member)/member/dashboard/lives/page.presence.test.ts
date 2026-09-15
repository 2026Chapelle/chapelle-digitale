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

function source(path: string) {
  const absolute = resolve(
    process.cwd(),
    path,
  )

  return existsSync(absolute)
    ? readFileSync(
        absolute,
        'utf8',
      )
    : ''
}

const page = source(
  'src/app/(member)/member/dashboard/lives/page.tsx',
)

describe('LIVE 4B Task 18 — member explicit presence', () => {
  it('mounts the existing presence control for the active member live context only', () => {
    expect(page).toContain(
      "import LivePresenceControls from '@/components/live/LivePresenceControls'",
    )

    expect(page).toContain(
      "tab === 'live' && hasLive && liveYtId && player === null",
    )

    expect(page).toContain(
      '<LivePresenceControls liveVideoId={liveYtId} />',
    )
  })

  it('places presence before shared reactions in Famille Royale', () => {
    const presenceIndex = page.indexOf(
      '<LivePresenceControls liveVideoId={liveYtId} />',
    )

    const providerIndex = page.indexOf(
      '<LiveReactionsProvider',
    )

    expect(presenceIndex).toBeGreaterThan(-1)
    expect(providerIndex).toBeGreaterThan(presenceIndex)
  })

  it('reuses the common presence component instead of creating member-only presence logic', () => {
    expect(page).not.toContain(
      'requestLiveJoin(',
    )

    expect(page).not.toContain(
      'requestLiveHeartbeat(',
    )

    expect(page).not.toContain(
      'requestLivePresenceCount(',
    )
  })
})