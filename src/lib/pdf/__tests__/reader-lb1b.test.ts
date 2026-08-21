import { describe, it, expect } from 'vitest'
import {
  grabEdge, flipProgress, flipAngle, foldShadow, resolveRelease, canPhysicalTurn,
  FLIP_COMPLETE_THRESHOLD,
} from '@/lib/pdf/reader-flip'
import {
  initReaderState, normalizeForSpread, visiblePages, goNext, goPrev, goToPage,
  type ReaderState,
} from '@/lib/pdf/reader-navigation'

/** LB-1B — tourne-page corner-drag (pur) + pagination couverture (recto/verso). */

describe('Geste de tourne-page — préhension du bord', () => {
  it('zone droite / gauche / centre', () => {
    expect(grabEdge(980, 1000)).toBe('right')
    expect(grabEdge(20, 1000)).toBe('left')
    expect(grabEdge(500, 1000)).toBeNull() // centre → sélection texte / pan préservés
    expect(grabEdge(10, 0)).toBeNull()
  })
})

describe('Progression, angle, ombre, décision', () => {
  it('progression bornée [0,1] selon le bord', () => {
    expect(flipProgress(-500, 1000, 'right')).toBeCloseTo(0.5) // droite tirée à gauche
    expect(flipProgress(500, 1000, 'left')).toBeCloseTo(0.5) // gauche tirée à droite
    expect(flipProgress(-2000, 1000, 'right')).toBe(1) // clamp
    expect(flipProgress(300, 1000, 'right')).toBe(0) // mauvais sens → 0
  })
  it('angle rotateY signé selon le bord', () => {
    expect(flipAngle(1, 'right')).toBe(-180)
    expect(flipAngle(1, 'left')).toBe(180)
    expect(flipAngle(0.5, 'right')).toBe(-90)
  })
  it('ombre nulle aux extrêmes, maximale à mi-parcours', () => {
    expect(foldShadow(0)).toBeCloseTo(0)
    expect(foldShadow(1)).toBeCloseTo(0)
    expect(foldShadow(0.5)).toBeGreaterThan(foldShadow(0.1))
  })
  it('relâcher : au-delà du seuil tourne, sinon revient', () => {
    expect(resolveRelease(FLIP_COMPLETE_THRESHOLD + 0.01)).toBe('complete')
    expect(resolveRelease(FLIP_COMPLETE_THRESHOLD - 0.01)).toBe('snap_back')
    expect(resolveRelease(NaN)).toBe('snap_back')
  })
  it('tourne-page physique désactivé si zoom élevé / lecture / reduced-motion', () => {
    expect(canPhysicalTurn({ mode: 'livre', scale: 1, reduceMotion: false })).toBe(true)
    expect(canPhysicalTurn({ mode: 'livre', scale: 1.5, reduceMotion: false })).toBe(false) // zoom → pan
    expect(canPhysicalTurn({ mode: 'lecture', scale: 1, reduceMotion: false })).toBe(false)
    expect(canPhysicalTurn({ mode: 'livre', scale: 1, reduceMotion: true })).toBe(false)
  })
})

describe('Pagination couverture (recto/verso)', () => {
  it('page de gauche : couverture seule puis planches paires', () => {
    expect(normalizeForSpread(1, 'double', 200, true)).toBe(1) // couverture
    expect(normalizeForSpread(2, 'double', 200, true)).toBe(2)
    expect(normalizeForSpread(3, 'double', 200, true)).toBe(2) // planche (2,3)
    expect(normalizeForSpread(4, 'double', 200, true)).toBe(4)
    expect(normalizeForSpread(5, 'double', 200, true)).toBe(4) // planche (4,5)
  })
  it('sans couverture : comportement LB-1 historique inchangé', () => {
    expect(normalizeForSpread(1, 'double', 200, false)).toBe(1)
    expect(normalizeForSpread(2, 'double', 200, false)).toBe(1) // planche (1,2)
    expect(normalizeForSpread(3, 'double', 200, false)).toBe(3)
  })

  const cover = (page: number, total = 200): ReaderState => ({
    page, total, scale: 1, spread: 'double', direction: 0, cover: true,
  })

  it('couverture affichée SEULE, puis double-pages', () => {
    expect(visiblePages(cover(1))).toEqual([1])
    expect(visiblePages(cover(2))).toEqual([2, 3])
    expect(visiblePages(cover(4))).toEqual([4, 5])
  })
  it('dernière page impaire affichée seule (pas de verso)', () => {
    expect(visiblePages(cover(6, 6))).toEqual([6]) // total 6 → planche (6) seule
    expect(visiblePages(cover(4, 5))).toEqual([4, 5])
  })
  it('navigation cohérente depuis la couverture', () => {
    const c = cover(1)
    const next = goNext(c)
    expect(visiblePages(next)).toEqual([2, 3]) // tourner la couverture → première planche
    const back = goPrev(next)
    expect(visiblePages(back)).toEqual([1]) // revenir → couverture
    const jump = goToPage(cover(1), 7)
    expect(visiblePages(jump)).toEqual([6, 7]) // page 7 → planche (6,7)
  })
})

describe('initReaderState — option couverture', () => {
  it('démarre sur la couverture en mode recto/verso', () => {
    const s = initReaderState({ total: 190, initialPage: 1, viewportWidth: 1440, cover: true })
    expect(s.cover).toBe(true)
    expect(s.spread).toBe('double')
    expect(visiblePages(s)).toEqual([1])
  })
})
