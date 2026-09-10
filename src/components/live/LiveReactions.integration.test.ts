import {
  existsSync,
  readFileSync,
} from 'node:fs'

import {
  resolve,
} from 'node:path'

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

const publicPage = source(
  'src/app/(public)/live/page.tsx',
)

const memberPage = source(
  'src/app/(member)/member/dashboard/lives/page.tsx',
)

const provider = source(
  'src/components/live/LiveReactionsProvider.tsx',
)

const controls = source(
  'src/components/live/LiveReactionControls.tsx',
)

const animationLayer = source(
  'src/components/live/LiveReactionAnimationLayer.tsx',
)

const boundary = source(
  'src/components/live/LiveReactionBoundary.tsx',
)

describe('LIVE shared reaction island integration', () => {
  it('mounts exactly one stable provider on both public and member surfaces', () => {
    expect(
      publicPage.match(
        /<LiveReactionsProvider\b/g,
      ),
    ).toHaveLength(1)

    expect(
      memberPage.match(
        /<LiveReactionsProvider\b/g,
      ),
    ).toHaveLength(1)

    expect(publicPage).toContain(
      'videoId={liveYt}',
    )

    expect(memberPage).toContain(
      'videoId={liveYtId}',
    )
  })

  it('replaces both old local reaction implementations', () => {
    expect(publicPage).not.toContain(
      'const REACTIONS =',
    )

    expect(publicPage).not.toContain(
      'sendReaction',
    )

    expect(publicPage).not.toContain(
      'reactionCount',
    )

    expect(publicPage).not.toContain(
      'Math.random()',
    )

    expect(memberPage).not.toContain(
      'REACTIONS_LIVE',
    )

    expect(memberPage).not.toContain(
      'sendReaction',
    )

    expect(memberPage).not.toContain(
      'reactionCount',
    )

    expect(memberPage).not.toContain(
      'Math.random()',
    )
  })

  it('keeps presence before the shared public reaction controls', () => {
    const presenceIndex =
      publicPage.indexOf(
        '<LivePresenceControls liveVideoId={liveYt} />',
      )

    const reactionsIndex =
      publicPage.indexOf(
        '<LiveReactionControls',
      )

    expect(
      presenceIndex,
    ).toBeGreaterThan(-1)

    expect(
      reactionsIndex,
    ).toBeGreaterThan(
      presenceIndex,
    )
  })

  it('uses exactly one reaction controls island on each surface', () => {
    expect(
      publicPage.match(
        /<LiveReactionControls\b/g,
      ),
    ).toHaveLength(1)

    expect(
      memberPage.match(
        /<LiveReactionControls\b/g,
      ),
    ).toHaveLength(1)
  })

  it('uses the canonical five reaction types and accessible controls', () => {
    expect(controls).toContain(
      'REACTION_TYPES',
    )

    expect(controls).toContain(
      'REACTION_LABELS',
    )

    expect(controls).toContain(
      'REACTION_SYMBOLS',
    )

    expect(controls).toContain(
      'Réagir ensemble',
    )

    expect(controls).toContain(
      'aria-label',
    )

    expect(controls).toContain(
      'type="button"',
    )

    expect(controls).toContain(
      'grid-cols-5',
    )

    expect(controls).toContain(
      'focus-visible:',
    )
  })

  it('shows truthful loading, stale, uncertain and rate-limit states', () => {
    expect(controls).toContain(
      'Réactions momentanément indisponibles',
    )

    expect(controls).toContain(
      'Réaction non confirmée',
    )

    expect(controls).toContain(
      'Données confirmées précédemment',
    )

    expect(controls).toContain(
      'tu pourras réagir à nouveau',
    )
  })

  it('never mutates reaction counters locally', () => {
    expect(controls).not.toMatch(
      /uniqueByType.*\+\s*1/i,
    )

    expect(provider).not.toMatch(
      /uniqueByType.*\+\s*1/i,
    )
  })

  it('keeps shared reaction components independent from presence', () => {
    expect(provider).not.toMatch(
      /LivePresence|live-presence/i,
    )

    expect(controls).not.toMatch(
      /LivePresence|live-presence/i,
    )

    expect(animationLayer).not.toMatch(
      /LivePresence|live-presence/i,
    )

    expect(boundary).not.toMatch(
      /LivePresence|live-presence/i,
    )
  })

  it('renders animation rails outside the player and never blocks clicks', () => {
    expect(publicPage.indexOf(
      '<LiveReactionAnimationLayer',
    )).toBeGreaterThan(
      publicPage.indexOf('<iframe'),
    )

    expect(memberPage.indexOf(
      '<LiveReactionAnimationLayer',
    )).toBeGreaterThan(
      memberPage.indexOf('<iframe'),
    )

    expect(animationLayer).toContain(
      'pointer-events-none',
    )

    expect(animationLayer).toContain(
      'aria-hidden="true"',
    )
  })

  it('keeps the social error boundary below the player', () => {
    expect(publicPage).toContain(
      '<LiveReactionBoundary>',
    )

    expect(memberPage).toContain(
      '<LiveReactionBoundary>',
    )

    expect(publicPage.indexOf(
      '<iframe',
    )).toBeLessThan(
      publicPage.indexOf(
        '<LiveReactionBoundary>',
      ),
    )

    expect(memberPage.indexOf(
      '<iframe',
    )).toBeLessThan(
      memberPage.indexOf(
        '<LiveReactionBoundary>',
      ),
    )
  })

  it('keeps the stable provider outside social error boundaries', () => {
    const publicProvider =
      publicPage.indexOf('<LiveReactionsProvider')

    const publicBoundary =
      publicPage.indexOf('<LiveReactionBoundary>')

    const memberProvider =
      memberPage.indexOf('<LiveReactionsProvider')

    const memberBoundary =
      memberPage.indexOf('<LiveReactionBoundary>')

    expect(publicProvider).toBeGreaterThan(-1)
    expect(memberProvider).toBeGreaterThan(-1)

    expect(publicProvider).toBeLessThan(
      publicBoundary,
    )

    expect(memberProvider).toBeLessThan(
      memberBoundary,
    )

    expect(
      publicPage.match(/<LiveReactionBoundary>/g),
    ).toHaveLength(2)

    expect(
      memberPage.match(/<LiveReactionBoundary>/g),
    ).toHaveLength(2)
  })

  it('enables reactions only for the active member live player context', () => {
    expect(memberPage).toContain(
      "enabled={tab === 'live' && hasLive && Boolean(liveYtId) && player === null}",
    )

    expect(publicPage).toContain(
      "enabled={tab === 'live' && Boolean(liveYt)}",
    )
  })
  it('preserves public sharing and member sharing/reminders', () => {
    expect(publicPage).toContain(
      'navigator.share',
    )

    expect(publicPage).toContain(
      'navigator.clipboard',
    )

    expect(memberPage).toContain(
      'setShare',
    )

    expect(memberPage).toContain(
      'remind(',
    )
  })
})