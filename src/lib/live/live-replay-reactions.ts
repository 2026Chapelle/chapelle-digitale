export const LIVE_REPLAY_REACTIONS = [
  { key: 'amen', label: 'Amen' },
  { key: 'receive', label: 'Je reçois' },
  { key: 'glory', label: 'Gloire à Dieu' },
  { key: 'thanks', label: 'Merci Seigneur' },
] as const

export type LiveReplayReaction =
  typeof LIVE_REPLAY_REACTIONS[number]['key']

export type LiveReplayReactionCounts =
  Record<LiveReplayReaction, number>

export type LiveReplayReactionSnapshot = {
  enabled: boolean
  selectedReaction: LiveReplayReaction | null
  counts: LiveReplayReactionCounts
}

export function isLiveReplayReaction(value: unknown): value is LiveReplayReaction {
  return typeof value === 'string' && LIVE_REPLAY_REACTIONS.some(({ key }) => key === value)
}

export function emptyLiveReplayReactionCounts(): LiveReplayReactionCounts {
  return { amen: 0, receive: 0, glory: 0, thanks: 0 }
}

export function applyOptimisticReaction(counts: LiveReplayReactionCounts, selectedReaction: LiveReplayReaction | null, nextReaction: LiveReplayReaction | null): Pick<LiveReplayReactionSnapshot, 'counts' | 'selectedReaction'> {
  const nextCounts = { ...counts }

  if (selectedReaction === nextReaction) {
    return { counts: nextCounts, selectedReaction }
  }

  if (selectedReaction !== null) {
    nextCounts[selectedReaction] = Math.max(0, nextCounts[selectedReaction] - 1)
  }

  if (nextReaction !== null) {
    nextCounts[nextReaction] += 1
  }

  return { counts: nextCounts, selectedReaction: nextReaction }
}
