/**
 * CITADELLE LIVING BOOKS — LB-2 : fusion de progression (PUR).
 *
 * La reprise devient multi-device : le SERVEUR (document_progress) est la source
 * canonique, `localStorage` reste un cache/fallback. À l'ouverture, on choisit la
 * progression la PLUS RÉCENTE de façon déterministe (égalité → serveur gagne, pour
 * converger vers la source canonique).
 */
import { clampPage, clampScale, type ViewMode } from './reader-navigation'

export interface ProgressRecord {
  page: number
  scale: number
  mode: ViewMode
  /** Instant de mise à jour (ms epoch). */
  updatedAt: number
}

export type ProgressSource = 'server' | 'local' | 'none'

export interface MergedProgress {
  record: ProgressRecord | null
  source: ProgressSource
}

function valid(r: ProgressRecord | null | undefined): r is ProgressRecord {
  return !!r && Number.isFinite(r.updatedAt) && Number.isFinite(r.page)
}

/**
 * Choisit la progression la plus récente. Égalité stricte d'horodatage → serveur
 * (source canonique). Bornes appliquées (page/scale) avec `total`.
 */
export function mergeProgress(
  local: ProgressRecord | null | undefined,
  server: ProgressRecord | null | undefined,
  total: number,
): MergedProgress {
  const l = valid(local) ? local : null
  const s = valid(server) ? server : null
  let chosen: ProgressRecord | null = null
  let source: ProgressSource = 'none'
  if (l && s) {
    if (s.updatedAt >= l.updatedAt) { chosen = s; source = 'server' }
    else { chosen = l; source = 'local' }
  } else if (s) { chosen = s; source = 'server' }
  else if (l) { chosen = l; source = 'local' }
  if (!chosen) return { record: null, source: 'none' }
  return {
    record: {
      page: clampPage(chosen.page, total),
      scale: clampScale(chosen.scale),
      mode: chosen.mode === 'lecture' ? 'lecture' : 'livre',
      updatedAt: chosen.updatedAt,
    },
    source,
  }
}
