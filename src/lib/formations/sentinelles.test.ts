import { describe, expect, it } from 'vitest'
import {
  SENTINELLES_FORMATION_SLUG,
  canDeclareSentinellesModuleComplete,
  hasCompletedAllSentinellesModules,
  isSentinellesFormation,
  normalizeSentinellesEngagement,
} from './sentinelles'

describe('Sentinelles formation rules', () => {
  it('identifies only the dedicated formation slug', () => {
    expect(isSentinellesFormation(SENTINELLES_FORMATION_SLUG)).toBe(true)
    expect(isSentinellesFormation('fondements-de-la-foi')).toBe(false)
    expect(isSentinellesFormation(null)).toBe(false)
  })

  it('requires exactly the six published Sentinelles modules to unlock engagement', () => {
    const ids = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']

    expect(hasCompletedAllSentinellesModules(ids, new Set(ids))).toBe(true)
    expect(hasCompletedAllSentinellesModules(ids, new Set(ids.slice(0, 5)))).toBe(false)
    expect(hasCompletedAllSentinellesModules([...ids, 'm7'], new Set([...ids, 'm7']))).toBe(false)
  })

  it('allows declarative completion only for a Sentinelles module with a support', () => {
    expect(canDeclareSentinellesModuleComplete({
      slug: SENTINELLES_FORMATION_SLUG,
      hasVideo: false,
      hasAudio: true,
      hasPdf: false,
    })).toBe(true)
    expect(canDeclareSentinellesModuleComplete({
      slug: SENTINELLES_FORMATION_SLUG,
      hasVideo: false,
      hasAudio: false,
      hasPdf: false,
    })).toBe(false)
    expect(canDeclareSentinellesModuleComplete({
      slug: 'fondements-de-la-foi',
      hasVideo: true,
      hasAudio: true,
      hasPdf: true,
    })).toBe(false)
  })

  it('accepts a sincere final engagement and rejects an empty declaration', () => {
    expect(normalizeSentinellesEngagement({
      declaration: 'Je choisis de veiller et de servir avec fidélité.',
      consent: true,
    })).toEqual({ declaration: 'Je choisis de veiller et de servir avec fidélité.' })
    expect(normalizeSentinellesEngagement({ declaration: ' ', consent: true })).toBeNull()
    expect(normalizeSentinellesEngagement({ declaration: 'Je m’engage.', consent: false })).toBeNull()
    expect(normalizeSentinellesEngagement({ declaration: 'Je m’engage.', consent: 'false' })).toBeNull()
  })
})
