import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  checkTeachingSpineConsistency,
  normalizeTeachingRef,
  TEACHING_SPINE_ERRORS,
} from './teaching-spine-relations'

describe('TEACHING-SPINE', () => {
  it('allows standalone teachings', () => {
    expect(
      checkTeachingSpineConsistency(
        {},
        {},
      ),
    ).toEqual({ ok: true })
  })

  it('normalizes empty references', () => {
    expect(normalizeTeachingRef('')).toBeNull()
    expect(normalizeTeachingRef('   ')).toBeNull()
    expect(normalizeTeachingRef(null)).toBeNull()
    expect(normalizeTeachingRef('abc')).toBe('abc')
  })

  it('requires a series when a season is selected', () => {
    expect(
      checkTeachingSpineConsistency(
        {
          season_id: 'season-1',
        },
        {
          seasonRow: {
            series_id: 'series-1',
          },
        },
      ),
    ).toEqual({
      ok: false,
      message:
        TEACHING_SPINE_ERRORS.seasonRequiresSeries,
    })
  })

  it('rejects an unknown series', () => {
    expect(
      checkTeachingSpineConsistency(
        {
          series_id: 'series-1',
        },
        {
          seriesRow: null,
        },
      ),
    ).toEqual({
      ok: false,
      message:
        TEACHING_SPINE_ERRORS.seriesNotFound,
    })
  })

  it('rejects an unknown season', () => {
    expect(
      checkTeachingSpineConsistency(
        {
          series_id: 'series-1',
          season_id: 'season-1',
        },
        {
          seriesRow: {
            id: 'series-1',
          },
          seasonRow: null,
        },
      ),
    ).toEqual({
      ok: false,
      message:
        TEACHING_SPINE_ERRORS.seasonNotFound,
    })
  })

  it('rejects a season from another series', () => {
    expect(
      checkTeachingSpineConsistency(
        {
          series_id: 'series-1',
          season_id: 'season-1',
        },
        {
          seriesRow: {
            id: 'series-1',
          },
          seasonRow: {
            series_id: 'series-2',
          },
        },
      ),
    ).toEqual({
      ok: false,
      message:
        TEACHING_SPINE_ERRORS.mismatch,
    })
  })

  it('accepts a coherent series and season', () => {
    expect(
      checkTeachingSpineConsistency(
        {
          series_id: 'series-1',
          season_id: 'season-1',
        },
        {
          seriesRow: {
            id: 'series-1',
          },
          seasonRow: {
            series_id: 'series-1',
          },
        },
      ),
    ).toEqual({ ok: true })
  })
})