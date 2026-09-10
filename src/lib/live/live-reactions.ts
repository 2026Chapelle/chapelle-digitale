export const REACTION_TYPES = ['prayer', 'fire', 'heart', 'praise', 'kingdom'] as const
export type ReactionType = (typeof REACTION_TYPES)[number]
export type ReactionCounts = Record<ReactionType, number>
export const REACTION_LABELS: Record<ReactionType, string> = { prayer: 'Prière', fire: 'Feu', heart: 'Amour', praise: 'Louange', kingdom: 'Royaume' }
export const REACTION_SYMBOLS: Record<ReactionType, string> = { prayer: '🙏', fire: '🔥', heart: '❤️', praise: '🙌', kingdom: '👑' }
export function parseReactionCounts(value: unknown): ReactionCounts | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== REACTION_TYPES.length || !REACTION_TYPES.every((type) => Object.hasOwn(record, type))) return null
  const result = {} as ReactionCounts
  for (const type of REACTION_TYPES) { const count = record[type]; if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) return null; result[type] = count }
  return result
}
