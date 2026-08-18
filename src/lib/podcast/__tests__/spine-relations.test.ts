import { describe, it, expect } from 'vitest'
import {
  checkSpineConsistency, nullifyEmpty, EPISODE_TYPES, EPISODE_TYPE_LABELS, SPINE_ERRORS,
} from '@/lib/podcast/spine-relations'

const SHOW_A = 'show-a'
const SHOW_B = 'show-b'
const SERIES_A = 'series-a' // appartient à SHOW_A
const SERIES_B = 'series-b' // appartient à SHOW_B
const SEASON_A1 = 'season-a1' // appartient à SERIES_A

describe('nullifyEmpty', () => {
  it('mappe ""/undefined/null → null, garde le reste', () => {
    expect(nullifyEmpty('')).toBeNull()
    expect(nullifyEmpty(undefined)).toBeNull()
    expect(nullifyEmpty(null)).toBeNull()
    expect(nullifyEmpty('x')).toBe('x')
  })
})

describe('typologie episode_type', () => {
  it('expose standard/special + libellés FR', () => {
    expect(EPISODE_TYPES).toEqual(['standard', 'special'])
    expect(EPISODE_TYPE_LABELS.standard).toBe('Épisode standard')
    expect(EPISODE_TYPE_LABELS.special).toBe('Édition spéciale')
  })
})

describe('checkSpineConsistency — legacy / FK null', () => {
  it('accepte un épisode sans aucun FK (legacy)', () => {
    expect(checkSpineConsistency({}, {})).toEqual({ ok: true })
  })
  it('accepte show seul (sans série ni saison)', () => {
    expect(checkSpineConsistency({ show_id: SHOW_A }, {})).toEqual({ ok: true })
  })
  it('traite "" comme non renseigné (pas d\'erreur)', () => {
    expect(checkSpineConsistency({ show_id: '', series_id: '', season_id: '' }, {})).toEqual({ ok: true })
  })
})

describe('checkSpineConsistency — episode_type', () => {
  it('accepte standard', () => {
    expect(checkSpineConsistency({ episode_type: 'standard' }, {}).ok).toBe(true)
  })
  it('accepte special', () => {
    expect(checkSpineConsistency({ episode_type: 'special' }, {}).ok).toBe(true)
  })
  it('rejette un type invalide avec message lisible', () => {
    const v = checkSpineConsistency({ episode_type: 'bonus' }, {})
    expect(v).toEqual({ ok: false, message: SPINE_ERRORS.invalidEpisodeType })
  })
  it('ignore un episode_type vide/absent', () => {
    expect(checkSpineConsistency({ episode_type: '' }, {}).ok).toBe(true)
    expect(checkSpineConsistency({ episode_type: null }, {}).ok).toBe(true)
  })
})

describe('checkSpineConsistency — série ↔ émission', () => {
  it('série sans émission → rejet', () => {
    const v = checkSpineConsistency({ series_id: SERIES_A }, { seriesRow: { show_id: SHOW_A } })
    expect(v).toEqual({ ok: false, message: SPINE_ERRORS.seriesWithoutShow })
  })
  it('série cohérente avec l\'émission → ok', () => {
    const v = checkSpineConsistency({ show_id: SHOW_A, series_id: SERIES_A }, { seriesRow: { show_id: SHOW_A } })
    expect(v).toEqual({ ok: true })
  })
  it('série d\'une AUTRE émission → rejet', () => {
    const v = checkSpineConsistency({ show_id: SHOW_A, series_id: SERIES_B }, { seriesRow: { show_id: SHOW_B } })
    expect(v).toEqual({ ok: false, message: SPINE_ERRORS.seriesNotInShow })
  })
  it('série introuvable → rejet lisible', () => {
    const v = checkSpineConsistency({ show_id: SHOW_A, series_id: SERIES_A }, { seriesRow: null })
    expect(v).toEqual({ ok: false, message: SPINE_ERRORS.seriesNotFound })
  })
})

describe('checkSpineConsistency — saison ↔ série', () => {
  it('saison sans série → rejet', () => {
    const v = checkSpineConsistency({ show_id: SHOW_A, season_id: SEASON_A1 }, { seasonRow: { series_id: SERIES_A } })
    expect(v).toEqual({ ok: false, message: SPINE_ERRORS.seasonWithoutSeries })
  })
  it('saison cohérente avec la série → ok', () => {
    const v = checkSpineConsistency(
      { show_id: SHOW_A, series_id: SERIES_A, season_id: SEASON_A1 },
      { seriesRow: { show_id: SHOW_A }, seasonRow: { series_id: SERIES_A } },
    )
    expect(v).toEqual({ ok: true })
  })
  it('saison d\'une AUTRE série → rejet', () => {
    const v = checkSpineConsistency(
      { show_id: SHOW_A, series_id: SERIES_A, season_id: SEASON_A1 },
      { seriesRow: { show_id: SHOW_A }, seasonRow: { series_id: SERIES_B } },
    )
    expect(v).toEqual({ ok: false, message: SPINE_ERRORS.seasonNotInSeries })
  })
  it('saison introuvable → rejet lisible', () => {
    const v = checkSpineConsistency(
      { show_id: SHOW_A, series_id: SERIES_A, season_id: SEASON_A1 },
      { seriesRow: { show_id: SHOW_A }, seasonRow: null },
    )
    expect(v).toEqual({ ok: false, message: SPINE_ERRORS.seasonNotFound })
  })
})

describe('checkSpineConsistency — chaîne complète cohérente', () => {
  it('émission + série + saison + type valides → ok', () => {
    const v = checkSpineConsistency(
      { show_id: SHOW_A, series_id: SERIES_A, season_id: SEASON_A1, episode_type: 'special' },
      { seriesRow: { show_id: SHOW_A }, seasonRow: { series_id: SERIES_A } },
    )
    expect(v).toEqual({ ok: true })
  })
})
