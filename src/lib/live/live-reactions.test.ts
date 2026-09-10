import { describe, expect, it } from 'vitest'
import { REACTION_LABELS, REACTION_SYMBOLS, REACTION_TYPES, parseReactionCounts } from './live-reactions'

describe('LIVE 4B.2 reaction contracts', () => {
  it('defines only the five canonical reactions and parses exact safe counts', () => {
    expect(REACTION_TYPES).toEqual(['prayer', 'fire', 'heart', 'praise', 'kingdom'])
    expect(REACTION_LABELS).toEqual({ prayer: 'Prière', fire: 'Feu', heart: 'Amour', praise: 'Louange', kingdom: 'Royaume' })
    expect(REACTION_SYMBOLS).toEqual({ prayer: '🙏', fire: '🔥', heart: '❤️', praise: '🙌', kingdom: '👑' })
    expect(parseReactionCounts({ prayer: 0, fire: 1, heart: 2, praise: 3, kingdom: 4 })).toEqual({ prayer: 0, fire: 1, heart: 2, praise: 3, kingdom: 4 })
    expect(parseReactionCounts({ prayer: 0, fire: -1, heart: 0, praise: 0, kingdom: 0 })).toBeNull()
    expect(parseReactionCounts({ prayer: 0, fire: Number.MAX_SAFE_INTEGER + 1, heart: 0, praise: 0, kingdom: 0 })).toBeNull()
    expect(parseReactionCounts({ prayer: 0, fire: 0, heart: 0, praise: 0, kingdom: 0, sparkle: 0 })).toBeNull()
  })
})
