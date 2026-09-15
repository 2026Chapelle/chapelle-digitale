/**
 * CITADELLE — TEACHING-SPINE
 *
 * Contrat PURE de cohérence :
 *
 *   Série → Saison → Enseignement
 *
 * Série et Saison sont optionnelles pour un enseignement autonome.
 */

export interface TeachingSpineInput {
  series_id?: unknown
  season_id?: unknown
}

export interface TeachingSpineParents {
  seriesRow?: { id?: string | null } | null
  seasonRow?: { series_id?: string | null } | null
}

export type TeachingSpineVerdict =
  | { ok: true }
  | { ok: false; message: string }

export const TEACHING_SPINE_ERRORS = {
  seasonRequiresSeries:
    'Une saison d’enseignement ne peut pas être sélectionnée sans série.',
  seriesNotFound:
    'La série d’enseignement sélectionnée est introuvable.',
  seasonNotFound:
    'La saison d’enseignement sélectionnée est introuvable.',
  mismatch:
    'La saison sélectionnée n’appartient pas à la série choisie.',
  seasonSeriesRequired:
    'Une saison d’enseignement doit appartenir à une série.',
} as const

export function normalizeTeachingRef(
  value: unknown,
): string | null {
  if (value == null) return null

  const normalized = String(value).trim()

  return normalized || null
}

export function checkTeachingSpineConsistency(
  input: TeachingSpineInput,
  parents: TeachingSpineParents,
): TeachingSpineVerdict {
  const series = normalizeTeachingRef(
    input.series_id,
  )

  const season = normalizeTeachingRef(
    input.season_id,
  )

  if (season && !series) {
    return {
      ok: false,
      message: TEACHING_SPINE_ERRORS.seasonRequiresSeries,
    }
  }

  if (
    series &&
    !parents.seriesRow
  ) {
    return {
      ok: false,
      message: TEACHING_SPINE_ERRORS.seriesNotFound,
    }
  }

  if (
    season &&
    !parents.seasonRow
  ) {
    return {
      ok: false,
      message: TEACHING_SPINE_ERRORS.seasonNotFound,
    }
  }

  if (
    season &&
    parents.seasonRow?.series_id !== series
  ) {
    return {
      ok: false,
      message: TEACHING_SPINE_ERRORS.mismatch,
    }
  }

  return { ok: true }
}