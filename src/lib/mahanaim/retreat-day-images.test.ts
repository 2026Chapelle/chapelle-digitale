import { describe, expect, it } from 'vitest'

import { mahanaimRetreatDayImageSlug, resolveMahanaimDayImageUrl } from './retreat-day-images'

describe('mahanaimRetreatDayImageSlug', () => {
  it('uses the stable CMS naming convention for a numbered retreat day', () => {
    expect(mahanaimRetreatDayImageSlug('chambre-haute-2026', 3)).toBe('mahanaim-chambre-haute-2026-jour-03')
  })

  it('returns null rather than creating an invalid CMS lookup key', () => {
    expect(mahanaimRetreatDayImageSlug('Chambre Haute', 0)).toBeNull()
  })
})

describe('resolveMahanaimDayImageUrl', () => {
  it('keeps a published CMS image ahead of the local official illustration', () => {
    expect(resolveMahanaimDayImageUrl(4, 'https://cms.example/jour-04.webp')).toBe('https://cms.example/jour-04.webp')
  })

  it('maps each valid day to its optimized local illustration when CMS has none', () => {
    expect(resolveMahanaimDayImageUrl(1, null)).toBe('/images/mahanaim/jour-01.webp')
    expect(resolveMahanaimDayImageUrl(10, null)).toBe('/images/mahanaim/jour-10.webp')
    expect(resolveMahanaimDayImageUrl(11, null)).toBeNull()
  })
})
