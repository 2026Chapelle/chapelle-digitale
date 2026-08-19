import { describe, it, expect } from 'vitest'
import { DEMO_BADGE_EN, DEMO_BADGE_FR, demoEnvelopes } from '../demo'
import { isDemoEnvelope } from '../metric-envelope'

describe('données de démonstration explicites', () => {
  it('toutes les enveloppes de démo sont marquées demo=true', () => {
    const envs = demoEnvelopes('2026-08-19T12:00:00.000Z')
    expect(envs.length).toBeGreaterThan(0)
    for (const env of envs) {
      expect(isDemoEnvelope(env)).toBe(true)
      expect(env.source).toBe('demo')
    }
  })

  it('badges FR/EN présents', () => {
    expect(DEMO_BADGE_FR).toMatch(/DÉMONSTRATION/)
    expect(DEMO_BADGE_EN).toMatch(/DEMO/)
  })

  it('déterministe : même instant ⇒ même sortie', () => {
    const a = demoEnvelopes('2026-08-19T12:00:00.000Z')
    const b = demoEnvelopes('2026-08-19T12:00:00.000Z')
    expect(a).toEqual(b)
  })
})
