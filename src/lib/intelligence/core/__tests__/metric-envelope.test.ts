import { describe, it, expect } from 'vitest'
import {
  containsDemo,
  isDemoEnvelope,
  makeEnvelope,
  validateEnvelope,
} from '../metric-envelope'

const SYNCED = '2026-08-19T12:00:00.000Z'

describe('metric-envelope (purs)', () => {
  it('makeEnvelope: measured_at par défaut = synced_at', () => {
    const env = makeEnvelope({
      source: 'first_party',
      metric: 'sessions',
      value: 12,
      unit: 'count',
      freshness: 'NEAR_REALTIME',
      syncedAt: SYNCED,
    })
    expect(env.measured_at).toBe(SYNCED)
    expect(env.demo).toBe(false)
  })

  it('source demo FORCE demo=true (aucun nombre fictif en prod)', () => {
    const env = makeEnvelope({
      source: 'demo',
      metric: 'x',
      value: 0,
      unit: 'count',
      freshness: 'SYNCED',
      syncedAt: SYNCED,
      demo: false, // tenté à false…
    })
    expect(env.demo).toBe(true) // …mais forcé à true
    expect(isDemoEnvelope(env)).toBe(true)
  })

  it('dimensions sont gelées (immuables)', () => {
    const env = makeEnvelope({
      source: 'first_party',
      metric: 'x',
      value: 1,
      unit: 'count',
      freshness: 'SYNCED',
      syncedAt: SYNCED,
      dimensions: { platform: 'citadelle' },
    })
    expect(Object.isFrozen(env.dimensions)).toBe(true)
  })

  it('containsDemo détecte au moins une donnée de démo', () => {
    const real = makeEnvelope({ source: 'first_party', metric: 'a', value: 1, unit: 'count', freshness: 'SYNCED', syncedAt: SYNCED })
    const demo = makeEnvelope({ source: 'demo', metric: 'b', value: 0, unit: 'count', freshness: 'SYNCED', syncedAt: SYNCED })
    expect(containsDemo([real])).toBe(false)
    expect(containsDemo([real, demo])).toBe(true)
  })

  it('validateEnvelope repère ratio/percent hors bornes et dates invalides', () => {
    const bad = makeEnvelope({ source: 'first_party', metric: 'r', value: 2, unit: 'ratio', freshness: 'SYNCED', syncedAt: SYNCED })
    expect(validateEnvelope(bad)).toContain('ratio hors [0,1]')

    const ok = makeEnvelope({ source: 'first_party', metric: 'r', value: 0.5, unit: 'ratio', freshness: 'SYNCED', syncedAt: SYNCED })
    expect(validateEnvelope(ok)).toHaveLength(0)
  })
})
