import { describe, expect, it } from 'vitest'
import {
  LIVE_REPLAY_REACTIONS,
  applyOptimisticReaction,
  emptyLiveReplayReactionCounts,
  isLiveReplayReaction,
} from './live-replay-reactions'

describe('live replay reactions', () => {
  it('defines the exact reaction list', () => {
    expect(LIVE_REPLAY_REACTIONS).toEqual([
      { key: 'amen', label: 'Amen' },
      { key: 'receive', label: 'Je reçois' },
      { key: 'glory', label: 'Gloire à Dieu' },
      { key: 'thanks', label: 'Merci Seigneur' },
    ])
  })

  it('accepts only known keys', () => {
    expect(LIVE_REPLAY_REACTIONS.every(({ key }) => isLiveReplayReaction(key))).toBe(true)
    expect(isLiveReplayReaction('fire')).toBe(false)
    expect(isLiveReplayReaction('')).toBe(false)
    expect(isLiveReplayReaction(null)).toBe(false)
    expect(isLiveReplayReaction(1)).toBe(false)
  })

  it('creates all-zero counts', () => {
    expect(emptyLiveReplayReactionCounts()).toEqual({ amen: 0, receive: 0, glory: 0, thanks: 0 })
  })

  it('adds a reaction', () => {
    expect(applyOptimisticReaction(emptyLiveReplayReactionCounts(), null, 'amen')).toEqual({
      counts: { amen: 1, receive: 0, glory: 0, thanks: 0 }, selectedReaction: 'amen',
    })
  })

  it('replaces a reaction', () => {
    expect(applyOptimisticReaction({ amen: 2, receive: 0, glory: 0, thanks: 0 }, 'amen', 'glory')).toEqual({
      counts: { amen: 1, receive: 0, glory: 1, thanks: 0 }, selectedReaction: 'glory',
    })
  })

  it('removes a reaction', () => {
    expect(applyOptimisticReaction({ amen: 2, receive: 0, glory: 0, thanks: 0 }, 'amen', null)).toEqual({
      counts: { amen: 1, receive: 0, glory: 0, thanks: 0 }, selectedReaction: null,
    })
  })

  it('is idempotent for the same selected key', () => {
    expect(applyOptimisticReaction({ amen: 2, receive: 0, glory: 0, thanks: 0 }, 'amen', 'amen')).toEqual({
      counts: { amen: 2, receive: 0, glory: 0, thanks: 0 }, selectedReaction: 'amen',
    })
  })

  it('clamps decrements at zero', () => {
    expect(applyOptimisticReaction(emptyLiveReplayReactionCounts(), 'amen', null).counts.amen).toBe(0)
  })

  it('does not mutate inputs and returns new counts', () => {
    const input = { amen: 1, receive: 0, glory: 0, thanks: 0 }
    const result = applyOptimisticReaction(input, 'amen', 'glory')
    expect(input).toEqual({ amen: 1, receive: 0, glory: 0, thanks: 0 })
    expect(result.counts).not.toBe(input)
  })
})
