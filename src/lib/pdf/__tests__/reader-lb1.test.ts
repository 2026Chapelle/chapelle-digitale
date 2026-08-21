import { describe, it, expect } from 'vitest'
import { parsePageInput, clampScale, MIN_SCALE, MAX_SCALE } from '@/lib/pdf/reader-navigation'
import {
  foldText, normalizeQuery, buildSearchResult, stepMatchIndex, matchLabel,
} from '@/lib/pdf/reader-search'
import { progressStorageKey, serializeProgress, parseProgress } from '@/lib/pdf/reader-storage'
import { flattenOutline, hasOutline, firstDestRef } from '@/lib/pdf/reader-outline'

/** LB-1 — logique PURE du reader « Whaou » (navigation directe, recherche, reprise, sommaire). */

describe('Aller à une page — parsePageInput', () => {
  it('accepte un entier et le borne dans [1,total]', () => {
    expect(parsePageInput('74', 190)).toBe(74)
    expect(parsePageInput('  12 ', 190)).toBe(12)
    expect(parsePageInput('999', 190)).toBe(190)
    expect(parsePageInput('0', 190)).toBe(1)
    expect(parsePageInput('-3', 190)).toBe(3) // premier nombre extrait (le signe est ignoré)
  })
  it('tolère un « 74 / 190 » collé et prend le premier nombre', () => {
    expect(parsePageInput('74 / 190', 190)).toBe(74)
  })
  it('rejette une saisie non numérique', () => {
    expect(parsePageInput('abc', 190)).toBeNull()
    expect(parsePageInput('', 190)).toBeNull()
  })
})

describe('Recherche dans le livre', () => {
  const pages = [
    { page: 1, text: 'Bienvenue dans la Citadelle du Royaume.' },
    { page: 2, text: 'La CITADELLE accueille ; la citadèlle veille.' },
    { page: 3, text: 'Rien ici.' },
  ]

  it('insensible à la casse et aux accents', () => {
    expect(foldText('Citadèlle')).toBe('citadelle')
    const r = buildSearchResult(pages, 'citadelle')
    expect(r.matches.length).toBe(3) // p1 ×1, p2 ×2
    expect(r.matches.map((m) => m.page)).toEqual([1, 2, 2])
    expect(r.matches[2].indexInPage).toBe(1) // 2e occurrence de la page 2
  })

  it('ignore les requêtes trop courtes (<2)', () => {
    expect(buildSearchResult(pages, 'c').matches).toHaveLength(0)
    expect(normalizeQuery('  a   b ')).toBe('a b')
  })

  it('navigation résultat suivant/précédent avec bouclage', () => {
    expect(stepMatchIndex(7, -1, 1)).toBe(0) // premier "suivant" depuis aucun
    expect(stepMatchIndex(7, 6, 1)).toBe(0) // boucle
    expect(stepMatchIndex(7, 0, -1)).toBe(6) // boucle arrière
    expect(stepMatchIndex(0, -1, 1)).toBe(-1) // aucun résultat
  })

  it('libellé « 1 / 7 » / « 0 résultat »', () => {
    expect(matchLabel(7, 0)).toBe('1 / 7')
    expect(matchLabel(7, 6)).toBe('7 / 7')
    expect(matchLabel(0, -1)).toBe('0 résultat')
  })
})

describe('Reprise de lecture locale', () => {
  it('clé propre à chaque document', () => {
    expect(progressStorageKey('a27ccf64')).toBe('citadelle:lb1:progress:a27ccf64')
    expect(progressStorageKey('')).toBe('citadelle:lb1:progress:unknown')
  })
  it('round-trip borné', () => {
    const raw = serializeProgress({ page: 14, scale: 1.5, mode: 'lecture' })
    const p = parseProgress(raw, 190)
    expect(p).toEqual({ page: 14, scale: 1.5, mode: 'lecture' })
  })
  it('borne page/zoom et valide le mode', () => {
    const p = parseProgress(JSON.stringify({ page: 9999, scale: 99, mode: 'pirate' }), 190)
    expect(p?.page).toBe(190)
    expect(p?.scale).toBe(MAX_SCALE)
    expect(p?.mode).toBe('livre') // repli sûr
    const lo = parseProgress(JSON.stringify({ page: -5, scale: 0.01, mode: 'livre' }), 190)
    expect(lo?.page).toBe(1)
    expect(lo?.scale).toBe(MIN_SCALE)
  })
  it('entrée illisible → null', () => {
    expect(parseProgress(null, 190)).toBeNull()
    expect(parseProgress('{bad', 190)).toBeNull()
    expect(parseProgress('42', 190)).toBeNull() // pas un objet progress
  })
  it('clampScale reste dans les bornes', () => {
    expect(clampScale(10)).toBe(MAX_SCALE)
    expect(clampScale(0)).toBe(MIN_SCALE)
  })
})

describe('Sommaire (TOC) — aplatissement pur', () => {
  const outline = [
    { title: 'Préface', dest: 'preface', items: [] },
    {
      title: 'Chapitre 1', dest: [{ num: 12, gen: 0 }, { name: 'XYZ' }],
      items: [{ title: '1.1 Origines', dest: 'ch1-1' }],
    },
  ]

  it('aplati en liste indentée dans l’ordre', () => {
    const flat = flattenOutline(outline)
    expect(flat.map((f) => [f.depth, f.title])).toEqual([
      [0, 'Préface'],
      [0, 'Chapitre 1'],
      [1, '1.1 Origines'],
    ])
    expect(flat[0].id).toBe('0')
    expect(flat[2].id).toBe('1.0') // enfant du 2e noeud
  })

  it('détecte l’absence de sommaire', () => {
    expect(hasOutline(null)).toBe(false)
    expect(hasOutline([])).toBe(false)
    expect(hasOutline(outline)).toBe(true)
  })

  it('extrait la référence de page d’une destination explicite', () => {
    expect(firstDestRef([{ num: 12, gen: 0 }, { name: 'XYZ' }])).toEqual({ num: 12, gen: 0 })
    expect(firstDestRef('preface')).toBeNull() // destination nommée → résolue par l’appelant
    expect(firstDestRef([])).toBeNull()
  })
})
