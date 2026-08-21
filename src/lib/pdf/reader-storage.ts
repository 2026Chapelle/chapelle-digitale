/**
 * CITADELLE LIVING BOOKS — LB-1 : reprise de lecture LOCALE (PURE).
 *
 * LB-1A ne crée AUCUNE table Supabase : la progression (dernière page, zoom,
 * mode) est mémorisée localement. Ce module ne touche PAS `localStorage` : il
 * sérialise / valide / borne la progression, l'I/O de stockage vit dans le
 * composant (testable, SSR-safe). La vraie synchro multi-device viendra ensuite.
 */
import { clampPage, clampScale, type ViewMode } from './reader-navigation'

export interface ReadingProgress {
  page: number
  scale: number
  mode: ViewMode
}

const VALID_MODES: ViewMode[] = ['livre', 'lecture']

/** Clé de stockage propre à UN document (jamais partagée entre livres). */
export function progressStorageKey(documentId: string): string {
  const safe = String(documentId ?? '').trim() || 'unknown'
  return `citadelle:lb1:progress:${safe}`
}

export function serializeProgress(progress: ReadingProgress): string {
  return JSON.stringify({ page: progress.page, scale: progress.scale, mode: progress.mode })
}

/**
 * Analyse une progression sérialisée. Renvoie null si illisible. Borne la page
 * dans [1,total] et le zoom dans les limites, et valide le mode (repli 'livre').
 */
export function parseProgress(raw: string | null | undefined, total: number): ReadingProgress | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  const pageNum = typeof obj.page === 'number' ? obj.page : Number(obj.page)
  if (!Number.isFinite(pageNum)) return null
  const scaleNum = typeof obj.scale === 'number' ? obj.scale : Number(obj.scale)
  const mode: ViewMode = VALID_MODES.includes(obj.mode as ViewMode) ? (obj.mode as ViewMode) : 'livre'
  return {
    page: clampPage(pageNum, total),
    scale: Number.isFinite(scaleNum) ? clampScale(scaleNum) : 1,
    mode,
  }
}
