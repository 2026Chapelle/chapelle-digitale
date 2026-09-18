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
  it('keeps only living LIVE 4C reactions inside the public replay modal', () => {
    expect(publicPage).toContain(
      "import LiveReplayReactions from '@/components/live/LiveReplayReactions'",
    )
    expect(publicPage).toContain(
      '<LiveReplayReactions cmsLiveId={replayPlayer.id} />',
    )

    const modalStart = publicPage.indexOf('{replayPlayer && (')
    const modalEnd = publicPage.indexOf("{tab === 'replays' && (", modalStart)
    const modal = publicPage.slice(modalStart, modalEnd)

    expect(modalStart).toBeGreaterThanOrEqual(0)
    expect(modalEnd).toBeGreaterThan(modalStart)
    expect(modal).toContain(
      '<LiveReplayReactions cmsLiveId={replayPlayer.id} />',
    )
    expect(modal).not.toContain(
      '<LiveReplayReactionCounts cmsLiveId={replayPlayer.id} />',
    )
  })

  it('keeps only living LIVE 4C reactions inside the member replay modal', () => {
    expect(memberPage).toContain(
      "import LiveReplayReactions from '@/components/live/LiveReplayReactions'",
    )
    expect(memberPage).toContain(
      '<LiveReplayReactions cmsLiveId={player.cmsLiveId} />',
    )

    const guard = memberPage.indexOf('{player.cmsLiveId && (')
    const shareSection = memberPage.indexOf('{/* Partage', guard)
    const replayExtras = memberPage.slice(guard, shareSection)

    expect(guard).toBeGreaterThanOrEqual(0)
    expect(shareSection).toBeGreaterThan(guard)
    expect(replayExtras).toContain(
      '<LiveReplayReactions cmsLiveId={player.cmsLiveId} />',
    )
    expect(replayExtras).not.toContain(
      '<LiveReplayReactionCounts cmsLiveId={player.cmsLiveId} />',
    )
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

  it('preserves frozen reaction memory on public replay archive cards outside the modal', () => {
    const modalEnd = publicPage.indexOf("{tab === 'replays' && (")
    const archiveCount = publicPage.indexOf(
      '<LiveReplayReactionCounts cmsLiveId={replay.id} />',
      modalEnd,
    )

    expect(modalEnd).toBeGreaterThanOrEqual(0)
    expect(archiveCount).toBeGreaterThan(modalEnd)
  })
})