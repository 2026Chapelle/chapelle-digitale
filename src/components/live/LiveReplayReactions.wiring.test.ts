import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const publicPage = readFileSync(
  resolve(process.cwd(), 'src/app/(public)/live/page.tsx'),
  'utf8',
)

const memberPage = readFileSync(
  resolve(process.cwd(), 'src/app/(member)/member/dashboard/lives/page.tsx'),
  'utf8',
)

describe('LIVE 4C replay reaction shared wiring', () => {
  it('mounts living replay reactions in the public replay modal', () => {
    expect(publicPage).toContain(
      "import LiveReplayReactions from '@/components/live/LiveReplayReactions'",
    )
    expect(publicPage).toContain(
      '<LiveReplayReactions cmsLiveId={replayPlayer.id} />',
    )
    expect(publicPage).toContain(
      '<LiveReplayReactionCounts cmsLiveId={replayPlayer.id} />',
    )

    const player = publicPage.indexOf('<LiveReplayPlayer')
    const living = publicPage.indexOf('<LiveReplayReactions', player)
    const frozen = publicPage.indexOf('<LiveReplayReactionCounts', living)

    expect(player).toBeGreaterThanOrEqual(0)
    expect(living).toBeGreaterThan(player)
    expect(frozen).toBeGreaterThan(living)
  })

  it('mounts living replay reactions for member replay players with cmsLiveId', () => {
    expect(memberPage).toContain(
      "import LiveReplayReactions from '@/components/live/LiveReplayReactions'",
    )
    expect(memberPage).toContain(
      '<LiveReplayReactions cmsLiveId={player.cmsLiveId} />',
    )
    expect(memberPage).toContain(
      '<LiveReplayReactionCounts cmsLiveId={player.cmsLiveId} />',
    )

    const player = memberPage.indexOf('<LiveReplayPlayer')
    const notebook = memberPage.indexOf('<LiveCultNotebook', player)
    const living = memberPage.indexOf('<LiveReplayReactions', notebook)
    const frozen = memberPage.indexOf('<LiveReplayReactionCounts', living)

    expect(player).toBeGreaterThanOrEqual(0)
    expect(notebook).toBeGreaterThan(player)
    expect(living).toBeGreaterThan(notebook)
    expect(frozen).toBeGreaterThan(living)
  })

  it('keeps member living reactions inside the cmsLiveId guard so playlists do not mount them', () => {
    const guard = memberPage.indexOf('{player.cmsLiveId && (')
    const living = memberPage.indexOf(
      '<LiveReplayReactions cmsLiveId={player.cmsLiveId} />',
      guard,
    )
    const closingFragment = memberPage.indexOf('</>', living)
    const shareSection = memberPage.indexOf('{/* Partage', living)

    expect(guard).toBeGreaterThanOrEqual(0)
    expect(living).toBeGreaterThan(guard)
    expect(closingFragment).toBeGreaterThan(living)
    expect(shareSection).toBeGreaterThan(closingFragment)
  })

  it('preserves the frozen LIVE 4B reaction memory separately in both spaces', () => {
    expect(publicPage).toContain(
      '<LiveReplayReactionCounts cmsLiveId={replayPlayer.id} />',
    )
    expect(memberPage).toContain(
      '<LiveReplayReactionCounts cmsLiveId={player.cmsLiveId} />',
    )

    expect(publicPage.indexOf('<LiveReplayReactionCounts')).not.toBe(
      publicPage.indexOf('<LiveReplayReactions'),
    )
    expect(memberPage.indexOf('<LiveReplayReactionCounts')).not.toBe(
      memberPage.indexOf('<LiveReplayReactions'),
    )
  })
})
