/**
 * PODCAST-SPINE — cohérence relationnelle Émission → Série → Saison → Épisode.
 *
 * Fonction PURE (aucune I/O) : reçoit les valeurs effectives de l'épisode + les
 * lignes parentes déjà lues (série/saison), renvoie un verdict lisible. La lecture
 * DB reste dans la route API (testabilité). Rôle : la cohérence ne dépend PAS
 * uniquement de l'UI — le serveur refuse toute relation incohérente (400 lisible),
 * même si la DB porte déjà ses FK/CHECK.
 *
 * Contrat legacy : FK NULL ⇒ épisode legacy (fallback `serie`) → toujours accepté.
 */

export const EPISODE_TYPES = ['standard', 'special'] as const
export type EpisodeType = (typeof EPISODE_TYPES)[number]

/** Libellés FR de la typologie (UI admin). */
export const EPISODE_TYPE_LABELS: Record<EpisodeType, string> = {
  standard: 'Épisode standard',
  special: 'Édition spéciale',
}

export const SPINE_ERRORS = {
  seriesWithoutShow: 'Une émission doit être sélectionnée avant de choisir une série.',
  seasonWithoutSeries: 'Une série doit être sélectionnée avant de choisir une saison.',
  seriesNotInShow: "Cette série n'appartient pas à l'émission sélectionnée.",
  seasonNotInSeries: "Cette saison n'appartient pas à la série sélectionnée.",
  seriesNotFound: 'Série introuvable.',
  seasonNotFound: 'Saison introuvable.',
  invalidEpisodeType: "Type d'épisode invalide : choisir « Épisode standard » ou « Édition spéciale ».",
  seriesShowRequired: 'Une émission est requise pour créer une série.',
  seasonSeriesRequired: 'Une série est requise pour créer une saison.',
} as const

/** '' / undefined → null (une chaîne vide de <select> vaut « non renseigné »). */
export function nullifyEmpty<T>(v: T | '' | undefined | null): T | null {
  return v === '' || v === undefined || v === null ? null : v
}

export interface EpisodeSpineInput {
  show_id?: string | null
  series_id?: string | null
  season_id?: string | null
  episode_type?: string | null
}

export interface SpineParentRows {
  /** Ligne cms_podcast_series correspondant à series_id (ou null si introuvable/non requis). */
  seriesRow?: { show_id?: string | null } | null
  /** Ligne cms_podcast_seasons correspondant à season_id (ou null si introuvable/non requis). */
  seasonRow?: { series_id?: string | null } | null
}

export type SpineVerdict = { ok: true } | { ok: false; message: string }

/**
 * Vérifie la cohérence de l'assignation d'un épisode.
 * - episode_type ∈ {standard, special} (si fourni).
 * - series_id ⇒ show_id requis ET series.show_id == show_id.
 * - season_id ⇒ series_id requis ET season.series_id == series_id.
 * - FK NULL (legacy) ⇒ accepté.
 */
export function checkSpineConsistency(input: EpisodeSpineInput, rows: SpineParentRows): SpineVerdict {
  const show = nullifyEmpty(input.show_id)
  const series = nullifyEmpty(input.series_id)
  const season = nullifyEmpty(input.season_id)
  const type = input.episode_type

  if (type !== undefined && type !== null && type !== '' && !EPISODE_TYPES.includes(type as EpisodeType)) {
    return { ok: false, message: SPINE_ERRORS.invalidEpisodeType }
  }

  if (series) {
    if (!show) return { ok: false, message: SPINE_ERRORS.seriesWithoutShow }
    if (!rows.seriesRow) return { ok: false, message: SPINE_ERRORS.seriesNotFound }
    if (nullifyEmpty(rows.seriesRow.show_id) !== show) return { ok: false, message: SPINE_ERRORS.seriesNotInShow }
  }

  if (season) {
    if (!series) return { ok: false, message: SPINE_ERRORS.seasonWithoutSeries }
    if (!rows.seasonRow) return { ok: false, message: SPINE_ERRORS.seasonNotFound }
    if (nullifyEmpty(rows.seasonRow.series_id) !== series) return { ok: false, message: SPINE_ERRORS.seasonNotInSeries }
  }

  return { ok: true }
}
