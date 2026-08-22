import { describe, it, expect } from 'vitest'
import { buildSourceAttribution, labelSource } from '../source-attribution'
import type { AcquisitionResult } from '../../metrics/acquisition'

function acq(over: Partial<AcquisitionResult>): AcquisitionResult {
  return {
    generatedAt: '2026-08-22T10:00:00.000Z',
    demoMode: false,
    hasData: true,
    rows: [],
    totals: { visits: 0, signups: 0, podcastStarts: 0, parcoursCompletions: 0 },
    internalVisitsExcluded: 0,
    unattributed: { signups: 0, podcastStarts: 0, parcoursCompletions: 0 },
    ...over,
  }
}

describe('buildSourceAttribution', () => {
  it('mappe visites/inscriptions/progressions et marque la conversion UNAVAILABLE', () => {
    const result = buildSourceAttribution(
      acq({
        rows: [
          { source: 'whatsapp', visits: 100, signups: 10, podcastStarts: 5, parcoursCompletions: 3 },
        ],
        unattributed: { signups: 2, podcastStarts: 1, parcoursCompletions: 4 },
        internalVisitsExcluded: 7,
      }),
    )
    expect(result.availability).toBe('REAL')
    expect(result.rows).toHaveLength(1)
    const row = result.rows[0]
    expect(row).toMatchObject({ source: 'whatsapp', visits: 100, signups: 10, progressions: 3 })
    expect(row.conversionAvailability).toBe('UNAVAILABLE')
    expect(row.conversionRate).toBeNull()
    expect(row.conversionReason && row.conversionReason.length).toBeGreaterThan(0)
    expect(result.unattributed).toEqual({ signups: 2, progressions: 4 })
    expect(result.internalVisitsExcluded).toBe(7)
  })

  it('acquisition en démo → DEMO, lignes vides (jamais fabriquées)', () => {
    const result = buildSourceAttribution(acq({ demoMode: true }))
    expect(result.availability).toBe('DEMO')
    expect(result.rows).toHaveLength(0)
    expect(result.reason).toBeTruthy()
  })

  it('null → DEMO', () => {
    expect(buildSourceAttribution(null).availability).toBe('DEMO')
  })

  it('hasData=false mais réel → REAL avec 0 ligne (0 réel ≠ indisponible)', () => {
    const result = buildSourceAttribution(acq({ hasData: false, rows: [] }))
    expect(result.availability).toBe('REAL')
    expect(result.rows).toHaveLength(0)
  })

  it('labelSource : libellé connu et repli sur la clé brute', () => {
    expect(labelSource('whatsapp')).toBe('WhatsApp')
    expect(labelSource('inconnue_xyz')).toBe('inconnue_xyz')
  })
})
