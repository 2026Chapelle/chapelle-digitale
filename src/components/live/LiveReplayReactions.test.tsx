import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  join(process.cwd(), 'src/components/live/LiveReplayReactions.tsx'),
  'utf8',
)

describe('LIVE 4C replay reaction optimistic component contract', () => {
  it('renders the approved four-reaction community prompt without a Total aggregate', () => {
    expect(source).toContain('Ce message t’a touché ? Réagis avec la communauté.')
    expect(source).toContain('LIVE_REPLAY_REACTIONS.map')
    expect(source).toContain('aria-pressed')
    expect(source).toContain('grid-cols-2')
    expect(source).toContain('lg:grid-cols-4')
    expect(source).toContain('Ta réaction n’a pas pu être enregistrée. Réessaie.')
    expect(source).not.toContain('Total')
  })

  it('implements add replace remove optimism through applyOptimisticReaction', () => {
    expect(source).toContain('applyOptimisticReaction')
    expect(source).toContain("selectedReaction === reaction ? null : reaction")
    expect(source).toContain('queueRef.current?.push(nextReaction)')
  })

  it('polls every 15 seconds only while visible and refreshes immediately on visibility return', () => {
    expect(source).toContain('LIVE_REPLAY_REACTION_POLL_MS')
    expect(source).toContain("document.visibilityState === 'visible'")
    expect(source).toContain("'visibilitychange'")
    expect(source).toContain('void refresh()')
    expect(source).toContain('window.setInterval')
    expect(source).toContain('window.clearInterval')
  })

  it('does not let polling overwrite an in-flight optimistic selection', () => {
    expect(source).toContain('queueRef.current?.isBusy()')
    expect(source).toContain('if (queueRef.current?.isBusy()) return')
  })

  it('disposes the queue and never throws through siblings', () => {
    expect(source).toContain('queueRef.current?.dispose()')
    expect(source).toContain('catch')
  })
})
