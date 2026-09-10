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
  'src/app/(public)/live/page.tsx',
)

const component = source(
  'src/components/live/LivePresenceControls.tsx',
)

const compactComponent =
  component.replace(/\s+/g, ' ')

describe('LIVE 4A.4 Je suis là UI integration', () => {
  it('mounts real presence inside Famille Royale only for a real YouTube live', () => {
    expect(page).toContain(
      "import LivePresenceControls from '@/components/live/LivePresenceControls'",
    )

    expect(page).toContain(
      '{liveYt && (',
    )

    expect(page).toContain(
      '<LivePresenceControls liveVideoId={liveYt} />',
    )

    const presenceIndex =
      page.indexOf(
        '<LivePresenceControls liveVideoId={liveYt} />',
      )

    const reactionIndex =
      page.indexOf(
        '<LiveReactionControls',
      )

    expect(
      presenceIndex,
    ).toBeGreaterThan(-1)

    expect(
      reactionIndex,
    ).toBeGreaterThan(
      presenceIndex,
    )
  })

  it('makes explicit participation visible without inventing a participant count', () => {
    expect(component).toContain(
      '👋 Je suis là',
    )

    expect(component).toContain(
      'Tu es avec nous',
    )

    expect(
      compactComponent,
    ).toContain(
      'activeTotal > 0',
    )

    expect(component).toContain(
      'personnes présentes maintenant',
    )
  })

  it('restores only previously explicit participation for the same live', () => {
    expect(component).toContain(
      'hasJoinedLive',
    )

    expect(component).toContain(
      'markLiveJoined',
    )

    expect(
      compactComponent,
    ).toContain(
      'joinedRef.current = rememberedJoin',
    )

    expect(compactComponent).toMatch(/if\s*\(\s*rememberedJoin\s*&&/)
  })

  it('heartbeats every 30 seconds only while visible and immediately on return', () => {
    expect(component).toContain(
      'LIVE_PRESENCE_HEARTBEAT_INTERVAL_MS',
    )

    expect(
      compactComponent,
    ).toContain(
      "document.visibilityState === 'visible'",
    )

    expect(
      compactComponent,
    ).toContain(
      "document.addEventListener( 'visibilitychange', onVisibilityChange",
    )

    expect(component).toContain(
      'requestLiveHeartbeat',
    )
  })

  it('rejoins only when a remembered participant heartbeat returns active=false', () => {
    expect(
      compactComponent,
    ).toContain(
      'heartbeat.active === false',
    )

    expect(component).toContain(
      'joinedRef.current',
    )

    expect(component).toContain(
      'requestLiveJoin',
    )
  })

  it('polls the real public count every 15 seconds and hides zero', () => {
    expect(component).toContain(
      'LIVE_PRESENCE_COUNT_INTERVAL_MS',
    )

    expect(component).toContain(
      'requestLivePresenceCount',
    )

    expect(
      compactComponent,
    ).toContain(
      'activeTotal > 0',
    )
  })

  it('uses shared confirmed reactions and preserves existing share behaviour', () => {
    expect(page).toContain(
      '<LiveReactionControls',
    )

    expect(
      source(
        'src/components/live/LiveReactionControls.tsx',
      ),
    ).toContain(
      'Réagir ensemble',
    )

    expect(page).toContain(
      'navigator.share',
    )

    expect(page).toContain(
      'navigator.clipboard',
    )
  })

  it('does not use Math.random for presence identity', () => {
    expect(component).not.toContain(
      'Math.random',
    )

    expect(
      source(
        'src/lib/live/live-presence-client.ts',
      ),
    ).not.toContain(
      'Math.random',
    )
  })
})