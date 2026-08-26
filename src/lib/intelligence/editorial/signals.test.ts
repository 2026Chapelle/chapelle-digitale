import { describe, expect, it } from 'vitest'
import {
  classifyEditorialSignalTruthState,
  mergeEditorialSignals,
  type EditorialSignalProvider,
} from './signals'
import { EXTERNAL_TREND_PROVIDERS } from './trends'

describe('editorial signals', () => {
  it('keeps missing values distinct from zero and classifies partial and unavailable sources', async () => {
    const provider: EditorialSignalProvider = {
      key: 'youtube',
      async read() {
        return [
          {
            key: 'youtube:views',
            source: 'youtube',
            truthState: 'PARTIAL',
            available: true,
            observedAt: '2026-08-25T08:00:00.000Z',
            value: {
              views: 0,
              watchTimeMinutes: undefined,
            },
          },
        ]
      },
    }

    expect(classifyEditorialSignalTruthState({ available: true, complete: true })).toBe('REAL')
    expect(classifyEditorialSignalTruthState({ available: true, complete: false })).toBe('PARTIAL')
    expect(classifyEditorialSignalTruthState({ available: false, complete: false })).toBe('UNAVAILABLE')
    expect(EXTERNAL_TREND_PROVIDERS).toHaveLength(0)

    const merged = await mergeEditorialSignals([provider], {
      organizationId: 'org_01',
      window: { start: '2026-08-25', end: '2026-08-31' },
      nowIso: '2026-08-25T08:00:00.000Z',
    })

    expect(merged).toHaveLength(1)
    expect(merged[0].value).toMatchObject({ views: 0 })
    expect(merged[0].value).toEqual(expect.objectContaining({ watchTimeMinutes: undefined }))
    expect(merged[0].truthState).toBe('PARTIAL')
  })

  it('downgrades provider failures to unavailable signals without throwing', async () => {
    const failingProvider: EditorialSignalProvider = {
      key: 'meta',
      async read() {
        throw new Error('connector unavailable')
      },
    }

    const merged = await mergeEditorialSignals([failingProvider], {
      organizationId: 'org_01',
      window: { start: '2026-08-25', end: '2026-08-31' },
      nowIso: '2026-08-25T08:00:00.000Z',
    })

    expect(merged).toHaveLength(1)
    expect(merged[0].source).toBe('meta')
    expect(merged[0].truthState).toBe('UNAVAILABLE')
    expect(merged[0].available).toBe(false)
  })

  it('preserves editorial recommendations as a distinct truth state', async () => {
    const merged = await mergeEditorialSignals([{
      key: 'editorial:manual-context',
      async read() {
        return [{
          key: 'editorial:manual-context',
          source: 'editorial_context',
          truthState: 'EDITORIAL_RECOMMENDATION',
          available: false,
          observedAt: '2026-08-25T08:00:00.000Z',
          value: { reason: 'mission alignment' },
        }]
      },
    }], {
      organizationId: 'org_01',
      window: { start: '2026-08-25', end: '2026-08-31' },
      nowIso: '2026-08-25T08:00:00.000Z',
    })

    expect(merged[0].truthState).toBe('EDITORIAL_RECOMMENDATION')
  })
})
