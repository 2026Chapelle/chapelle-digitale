/**
 * CITADELLE PDF-1 — Logique PURE de navigation du lecteur PDF/Flipbook.
 *
 * Aucune dépendance (ni React, ni pdfjs, ni DOM) : 100 % testable en isolation
 * (environnement `node`, cf. vitest.config.ts). Le composant `PdfReader`
 * (client) consomme ces fonctions ; toute la logique de bornage, de pagination
 * (simple / double page), de zoom et de direction d'animation vit ICI.
 *
 * Conventions :
 *   - Les pages sont numérotées à partir de 1 (comme pdf.js `getPage`).
 *   - En mode « double » (desktop large), la page de gauche est toujours
 *     ramenée à un rang IMPAIR (1, 3, 5, …) et l'on affiche `page` + `page+1`.
 *   - `direction` mémorise le sens de la dernière navigation (+1 avant, -1 arrière,
 *     0 neutre) pour piloter l'animation de tourne-page.
 */

export type SpreadMode = 'single' | 'double'

export interface ReaderState {
  /** Page courante (1-indexée). En mode double = page de GAUCHE (impaire). */
  page: number
  /** Nombre total de pages du document. */
  total: number
  /** Facteur de zoom appliqué EN PLUS de l'ajustement « pleine largeur ». */
  scale: number
  /** Simple page (mobile / étroit) ou double page (desktop large). */
  spread: SpreadMode
  /** Sens de la dernière navigation (pour l'animation). */
  direction: 1 | -1 | 0
}

/** Bornes de zoom. */
export const MIN_SCALE = 0.5
export const MAX_SCALE = 3
export const SCALE_STEP = 0.25

/** Largeur (px) à partir de laquelle la double page devient envisageable. */
export const DOUBLE_PAGE_BREAKPOINT = 1024

/** Ramène une valeur entière dans l'intervalle [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

/** Borne un numéro de page dans [1, total] (au moins 1). */
export function clampPage(page: number, total: number): number {
  const safeTotal = total > 0 ? total : 1
  return clamp(Math.round(page), 1, safeTotal)
}

/** Borne le facteur de zoom et l'arrondit au centième. */
export function clampScale(scale: number): number {
  const v = clamp(scale, MIN_SCALE, MAX_SCALE)
  return Math.round(v * 100) / 100
}

/** Nombre de pages avancées/reculées par pas (1 en simple, 2 en double). */
export function pageStep(spread: SpreadMode): number {
  return spread === 'double' ? 2 : 1
}

/**
 * En mode double, la page de gauche doit être impaire (1,3,5…).
 * En mode simple, la page est laissée telle quelle (bornée).
 */
export function normalizeForSpread(page: number, spread: SpreadMode, total: number): number {
  const p = clampPage(page, total)
  if (spread !== 'double') return p
  // Ramène au rang impair inférieur ou égal (1→1, 2→1, 3→3, 4→3…).
  return p % 2 === 0 ? p - 1 : p
}

/** Peut-on reculer depuis l'état courant ? */
export function canGoPrev(state: ReaderState): boolean {
  return state.page > 1
}

/** Peut-on avancer depuis l'état courant ? */
export function canGoNext(state: ReaderState): boolean {
  return state.page + pageStep(state.spread) <= state.total
}

/** Va à une page précise (bornée + normalisée), en calculant la direction. */
export function goToPage(state: ReaderState, target: number): ReaderState {
  const next = normalizeForSpread(target, state.spread, state.total)
  const direction: ReaderState['direction'] = next > state.page ? 1 : next < state.page ? -1 : 0
  return { ...state, page: next, direction }
}

/** Avance d'un pas (une page en simple, une planche en double). */
export function goNext(state: ReaderState): ReaderState {
  if (!canGoNext(state)) return { ...state, direction: 0 }
  return goToPage(state, state.page + pageStep(state.spread))
}

/** Recule d'un pas. */
export function goPrev(state: ReaderState): ReaderState {
  if (!canGoPrev(state)) return { ...state, direction: 0 }
  return goToPage(state, state.page - pageStep(state.spread))
}

/** Zoom avant (borné). */
export function zoomIn(state: ReaderState): ReaderState {
  return { ...state, scale: clampScale(state.scale + SCALE_STEP), direction: 0 }
}

/** Zoom arrière (borné). */
export function zoomOut(state: ReaderState): ReaderState {
  return { ...state, scale: clampScale(state.scale - SCALE_STEP), direction: 0 }
}

/** Réinitialise le zoom à « pleine largeur » (scale = 1). */
export function resetZoom(state: ReaderState): ReaderState {
  return { ...state, scale: 1, direction: 0 }
}

/**
 * Choisit le mode d'affichage selon la largeur du viewport.
 * `allowDouble=false` force le simple (ex. document d'une seule page, ou zoom actif).
 */
export function resolveSpread(viewportWidth: number, allowDouble = true): SpreadMode {
  if (!allowDouble) return 'single'
  return viewportWidth >= DOUBLE_PAGE_BREAKPOINT ? 'double' : 'single'
}

/**
 * Change de mode d'affichage en conservant la page visible cohérente
 * (re-normalise la page de gauche si l'on passe en double).
 */
export function setSpread(state: ReaderState, spread: SpreadMode): ReaderState {
  if (spread === state.spread) return state
  const page = normalizeForSpread(state.page, spread, state.total)
  return { ...state, spread, page, direction: 0 }
}

/** Les deux numéros de page réellement rendus dans l'état courant. */
export function visiblePages(state: ReaderState): number[] {
  if (state.spread !== 'double') return [state.page]
  const right = state.page + 1
  return right <= state.total ? [state.page, right] : [state.page]
}

/** Libellé humain de pagination : « 3 / 12 » ou « 3–4 / 12 ». */
export function pageLabel(state: ReaderState): string {
  const pages = visiblePages(state)
  const left = pages[0]
  const right = pages[pages.length - 1]
  const range = left === right ? `${left}` : `${left}–${right}`
  return `${range} / ${state.total}`
}

export interface InitReaderOptions {
  total: number
  initialPage?: number
  viewportWidth?: number
  allowDouble?: boolean
}

/** Construit l'état initial du lecteur (borné, normalisé). */
export function initReaderState({
  total,
  initialPage = 1,
  viewportWidth = 0,
  allowDouble = true,
}: InitReaderOptions): ReaderState {
  const safeTotal = total > 0 ? total : 1
  const spread = resolveSpread(viewportWidth, allowDouble && safeTotal > 1)
  const page = normalizeForSpread(initialPage, spread, safeTotal)
  return { page, total: safeTotal, scale: 1, spread, direction: 0 }
}
