/**
 * CITADELLE LIVING BOOKS — LB-2 : ancrage ROBUSTE d'un passage (PUR).
 *
 * Une annotation ne doit JAMAIS dépendre de coordonnées pixel (x,y) : elles
 * cassent au zoom/relayout. On ancre par le TEXTE : passage sélectionné + un
 * peu de contexte avant/après (prefix/suffix), plus des offsets indicatifs.
 * `locateAnchor` retrouve le passage dans le texte d'une page même si la couche
 * texte évolue légèrement (choix de la meilleure occurrence par contexte).
 *
 * Aucune dépendance (ni DOM, ni pdfjs) : 100 % testable.
 */
import { foldText } from './reader-search'

export const ANCHOR_CONTEXT_LEN = 32

export interface StudyAnchor {
  page: number
  selectedText: string
  prefix: string
  suffix: string
  startOffset: number
  endOffset: number
}

export interface AnchorInput {
  page: number
  pageText: string
  /** Offset de début de la sélection dans `pageText` (couche texte concaténée). */
  startOffset: number
  /** Offset de fin (exclu). */
  endOffset: number
}

/** Construit un ancrage à partir d'une sélection dans le texte concaténé d'une page. */
export function buildAnchor(input: AnchorInput): StudyAnchor | null {
  const { page, pageText, startOffset, endOffset } = input
  if (!pageText || startOffset < 0 || endOffset <= startOffset || endOffset > pageText.length) return null
  const selectedText = pageText.slice(startOffset, endOffset)
  if (!selectedText.trim()) return null
  return {
    page,
    selectedText,
    prefix: pageText.slice(Math.max(0, startOffset - ANCHOR_CONTEXT_LEN), startOffset),
    suffix: pageText.slice(endOffset, Math.min(pageText.length, endOffset + ANCHOR_CONTEXT_LEN)),
    startOffset,
    endOffset,
  }
}

function overlapLen(a: string, b: string, fromEnd: boolean): number {
  // Longueur du chevauchement pertinent (suffixe de `a` vs préfixe de `b`, ou l'inverse).
  const fa = foldText(a)
  const fb = foldText(b)
  let n = 0
  const max = Math.min(fa.length, fb.length)
  for (let i = 1; i <= max; i++) {
    const sa = fromEnd ? fa.slice(fa.length - i) : fa.slice(0, i)
    const sb = fromEnd ? fb.slice(0, i) : fb.slice(fb.length - i)
    if (sa === sb) n = i
  }
  return n
}

/**
 * Retrouve le passage ancré dans le texte courant d'une page. Renvoie l'intervalle
 * [start,end) de la MEILLEURE occurrence (score = contexte prefix/suffix + proximité
 * de l'offset d'origine), ou null si le passage a disparu.
 */
export function locateAnchor(pageText: string, anchor: StudyAnchor): { start: number; end: number } | null {
  if (!pageText || !anchor?.selectedText) return null
  const hayFolded = foldText(pageText)
  const needle = foldText(anchor.selectedText)
  if (!needle) return null

  const candidates: { start: number; score: number }[] = []
  let from = 0
  for (;;) {
    const at = hayFolded.indexOf(needle, from)
    if (at === -1) break
    const beforeCtx = pageText.slice(Math.max(0, at - ANCHOR_CONTEXT_LEN), at)
    const afterCtx = pageText.slice(at + anchor.selectedText.length, at + anchor.selectedText.length + ANCHOR_CONTEXT_LEN)
    const prefixScore = overlapLen(anchor.prefix, beforeCtx, true)
    const suffixScore = overlapLen(afterCtx, anchor.suffix, false)
    const offsetPenalty = Math.min(1, Math.abs(at - anchor.startOffset) / Math.max(1, pageText.length))
    candidates.push({ start: at, score: prefixScore + suffixScore - offsetPenalty })
    from = at + Math.max(1, needle.length)
  }
  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.score - a.score || a.start - b.start)
  const best = candidates[0]
  return { start: best.start, end: best.start + anchor.selectedText.length }
}
