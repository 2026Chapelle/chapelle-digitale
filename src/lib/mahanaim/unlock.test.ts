import { describe, expect, it } from 'vitest'

import { isMahanaimDayUnlocked } from './unlock'

describe('Mahanaïm day unlock schedule', () => {
  it('keeps a future day locked until 18:00 the previous day in Abidjan', () => {
    expect(isMahanaimDayUnlocked('2026-10-11', 2, new Date('2026-10-10T17:59:00Z'))).toBe(false)
    expect(isMahanaimDayUnlocked('2026-10-11', 2, new Date('2026-10-10T18:00:00Z'))).toBe(true)
  })
})
