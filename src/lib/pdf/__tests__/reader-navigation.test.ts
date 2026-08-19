import { describe, it, expect } from 'vitest'
import {
  clamp,
  clampPage,
  clampScale,
  pageStep,
  normalizeForSpread,
  canGoPrev,
  canGoNext,
  goToPage,
  goNext,
  goPrev,
  zoomIn,
  zoomOut,
  resetZoom,
  resolveSpread,
  setSpread,
  visiblePages,
  pageLabel,
  initReaderState,
  MIN_SCALE,
  MAX_SCALE,
  SCALE_STEP,
  DOUBLE_PAGE_BREAKPOINT,
  type ReaderState,
} from '../reader-navigation'

const single = (over: Partial<ReaderState> = {}): ReaderState => ({
  page: 1,
  total: 10,
  scale: 1,
  spread: 'single',
  direction: 0,
  ...over,
})
const double = (over: Partial<ReaderState> = {}): ReaderState =>
  single({ spread: 'double', ...over })

describe('clamp / clampPage / clampScale', () => {
  it('borne dans [min,max] et gère NaN', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(99, 0, 10)).toBe(10)
    expect(clamp(Number.NaN, 2, 8)).toBe(2)
  })
  it('borne la page dans [1,total] et arrondit', () => {
    expect(clampPage(0, 10)).toBe(1)
    expect(clampPage(11, 10)).toBe(10)
    expect(clampPage(3.4, 10)).toBe(3)
    expect(clampPage(5, 0)).toBe(1) // total invalide → au moins 1
  })
  it('borne le zoom entre MIN_SCALE et MAX_SCALE', () => {
    expect(clampScale(0.1)).toBe(MIN_SCALE)
    expect(clampScale(9)).toBe(MAX_SCALE)
    expect(clampScale(1.25)).toBe(1.25)
  })
})

describe('pas et normalisation double page', () => {
  it('pageStep = 1 en simple, 2 en double', () => {
    expect(pageStep('single')).toBe(1)
    expect(pageStep('double')).toBe(2)
  })
  it('normalizeForSpread ramène la page de gauche à un rang impair en double', () => {
    expect(normalizeForSpread(4, 'double', 10)).toBe(3)
    expect(normalizeForSpread(3, 'double', 10)).toBe(3)
    expect(normalizeForSpread(1, 'double', 10)).toBe(1)
    // en simple, inchangé (juste borné)
    expect(normalizeForSpread(4, 'single', 10)).toBe(4)
    expect(normalizeForSpread(50, 'single', 10)).toBe(10)
  })
})

describe('canGoPrev / canGoNext', () => {
  it('simple : bornes première/dernière page', () => {
    expect(canGoPrev(single({ page: 1 }))).toBe(false)
    expect(canGoPrev(single({ page: 2 }))).toBe(true)
    expect(canGoNext(single({ page: 10, total: 10 }))).toBe(false)
    expect(canGoNext(single({ page: 9, total: 10 }))).toBe(true)
  })
  it('double : avance par planche de 2', () => {
    // page 9 (montre 9–10) sur un total de 10 → pas de suivant
    expect(canGoNext(double({ page: 9, total: 10 }))).toBe(false)
    // page 7 (montre 7–8) → suivant possible
    expect(canGoNext(double({ page: 7, total: 10 }))).toBe(true)
    // total impair : page 9 sur 9 → montre 9 seule, pas de suivant
    expect(canGoNext(double({ page: 9, total: 9 }))).toBe(false)
  })
})

describe('goToPage / goNext / goPrev', () => {
  it('goToPage borne, normalise et calcule la direction', () => {
    const s = goToPage(single({ page: 3 }), 7)
    expect(s.page).toBe(7)
    expect(s.direction).toBe(1)
    const back = goToPage(single({ page: 7 }), 2)
    expect(back.page).toBe(2)
    expect(back.direction).toBe(-1)
  })
  it('goNext/goPrev en simple', () => {
    expect(goNext(single({ page: 1 })).page).toBe(2)
    expect(goPrev(single({ page: 5 })).page).toBe(4)
  })
  it('goNext/goPrev en double avancent par 2 et restent impairs', () => {
    const s = goNext(double({ page: 1, total: 10 }))
    expect(s.page).toBe(3)
    const back = goPrev(double({ page: 3, total: 10 }))
    expect(back.page).toBe(1)
  })
  it('ne dépasse pas les bornes et neutralise la direction en butée', () => {
    const first = goPrev(single({ page: 1 }))
    expect(first.page).toBe(1)
    expect(first.direction).toBe(0)
    const last = goNext(single({ page: 10, total: 10 }))
    expect(last.page).toBe(10)
    expect(last.direction).toBe(0)
  })
})

describe('zoom', () => {
  it('zoomIn / zoomOut par pas et bornés', () => {
    expect(zoomIn(single({ scale: 1 })).scale).toBe(1 + SCALE_STEP)
    expect(zoomOut(single({ scale: 1 })).scale).toBe(1 - SCALE_STEP)
    expect(zoomOut(single({ scale: MIN_SCALE })).scale).toBe(MIN_SCALE)
    expect(zoomIn(single({ scale: MAX_SCALE })).scale).toBe(MAX_SCALE)
  })
  it('resetZoom revient à 1', () => {
    expect(resetZoom(single({ scale: 2.5 })).scale).toBe(1)
  })
})

describe('resolveSpread / setSpread', () => {
  it('resolveSpread selon la largeur du viewport', () => {
    expect(resolveSpread(DOUBLE_PAGE_BREAKPOINT, true)).toBe('double')
    expect(resolveSpread(DOUBLE_PAGE_BREAKPOINT - 1, true)).toBe('single')
    expect(resolveSpread(1600, false)).toBe('single') // double interdit
  })
  it('setSpread re-normalise la page en passant en double', () => {
    const s = setSpread(single({ page: 4, total: 10 }), 'double')
    expect(s.spread).toBe('double')
    expect(s.page).toBe(3)
    // idempotent si même mode
    const same = setSpread(s, 'double')
    expect(same).toBe(s)
  })
})

describe('visiblePages / pageLabel', () => {
  it('simple montre une page', () => {
    expect(visiblePages(single({ page: 4 }))).toEqual([4])
    expect(pageLabel(single({ page: 4, total: 10 }))).toBe('4 / 10')
  })
  it('double montre deux pages, une seule si dernière impaire', () => {
    expect(visiblePages(double({ page: 3, total: 10 }))).toEqual([3, 4])
    expect(pageLabel(double({ page: 3, total: 10 }))).toBe('3–4 / 10')
    expect(visiblePages(double({ page: 9, total: 9 }))).toEqual([9])
    expect(pageLabel(double({ page: 9, total: 9 }))).toBe('9 / 9')
  })
})

describe('initReaderState', () => {
  it('borne la page initiale et choisit le mode selon la largeur', () => {
    const wide = initReaderState({ total: 12, initialPage: 6, viewportWidth: 1400 })
    expect(wide.spread).toBe('double')
    expect(wide.page).toBe(5) // 6 → impair inférieur
    const narrow = initReaderState({ total: 12, initialPage: 6, viewportWidth: 500 })
    expect(narrow.spread).toBe('single')
    expect(narrow.page).toBe(6)
  })
  it('document une seule page → jamais de double', () => {
    const s = initReaderState({ total: 1, viewportWidth: 1600 })
    expect(s.spread).toBe('single')
    expect(s.page).toBe(1)
  })
  it('total invalide → au moins une page', () => {
    const s = initReaderState({ total: 0, viewportWidth: 1600 })
    expect(s.total).toBe(1)
    expect(s.page).toBe(1)
  })
})
