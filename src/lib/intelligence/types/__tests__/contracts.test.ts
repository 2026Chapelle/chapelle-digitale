import { describe, it, expect } from 'vitest'
import { FRESHNESS_LEVELS, FRESHNESS_ORDER, isFreshness } from '../freshness'
import { METRIC_SOURCES, METRIC_UNITS } from '../metrics'
import { CONTENT_PLATFORMS, isContentPlatform } from '../content'
import { ATTRIBUTION_SOURCES, isAttributionSource } from '../attribution'

describe('contrats de domaine (invariants)', () => {
  it('FRESHNESS_ORDER couvre tous les niveaux et est strictement ordonné', () => {
    expect(Object.keys(FRESHNESS_ORDER).sort()).toEqual([...FRESHNESS_LEVELS].sort())
    const ordered = [...FRESHNESS_LEVELS].map((f) => FRESHNESS_ORDER[f])
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThan(ordered[i - 1])
    }
  })

  it('gardes de type', () => {
    expect(isFreshness('REALTIME')).toBe(true)
    expect(isFreshness('NOPE')).toBe(false)
    expect(isContentPlatform('citadelle')).toBe(true)
    expect(isContentPlatform('myspace')).toBe(false)
    expect(isAttributionSource('whatsapp')).toBe(true)
    expect(isAttributionSource('carrier-pigeon')).toBe(false)
  })

  it('les vocabulaires clés ne sont pas vides et incluent les valeurs canoniques', () => {
    expect(METRIC_SOURCES).toContain('first_party')
    expect(METRIC_SOURCES).toContain('demo')
    expect(METRIC_UNITS).toContain('currency_xof') // devise FCFA canonique
    expect(CONTENT_PLATFORMS).toEqual(
      expect.arrayContaining(['chapelle', 'citadelle', 'youtube', 'facebook', 'whatsapp']),
    )
    // aligné sur detectSource() de analytics-server.ts
    expect(ATTRIBUTION_SOURCES).toEqual(
      expect.arrayContaining(['whatsapp', 'facebook', 'youtube', 'google', 'direct']),
    )
  })
})
