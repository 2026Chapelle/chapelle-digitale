'use client'
/**
 * CITADELLE LIVING BOOKS — LB-2 : capture d'une sélection de texte → ancrage.
 *
 * Lit la sélection courante dans la couche texte pdf.js, détermine la PAGE (via
 * l'attribut `data-page`), le texte sélectionné et les OFFSETS exacts (calculés
 * par Range sur le texte de la page) → délègue la construction de l'ancrage à la
 * logique pure `study-anchor.buildAnchor`.
 */
import { buildAnchor, type StudyAnchor } from '@/lib/pdf/study-anchor'

export interface CapturedSelection {
  page: number
  rect: { x: number; y: number }
  selectedText: string
  anchor: StudyAnchor
}

export function captureSelection(): CapturedSelection | null {
  if (typeof window === 'undefined') return null
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null
  const text = sel.toString().trim()
  if (text.length < 2) return null

  const range = sel.getRangeAt(0)
  const startEl = range.startContainer.parentElement
  const pageEl = startEl?.closest('[data-page]') as HTMLElement | null
  const layerEl = pageEl?.querySelector('.pdf-text-layer') as HTMLElement | null
  if (!pageEl || !layerEl) return null
  // La sélection doit commencer DANS la couche texte (sinon : hors passage).
  if (!layerEl.contains(range.startContainer)) return null

  const page = Number.parseInt(pageEl.dataset.page || '', 10)
  if (!Number.isFinite(page)) return null

  const pageText = layerEl.textContent ?? ''
  // Offset de début = longueur du texte de la page AVANT le début de la sélection.
  let startOffset = 0
  try {
    const pre = document.createRange()
    pre.selectNodeContents(layerEl)
    pre.setEnd(range.startContainer, range.startOffset)
    startOffset = pre.toString().length
  } catch {
    startOffset = pageText.indexOf(sel.toString())
  }
  const selected = sel.toString()
  const endOffset = startOffset + selected.length
  const anchor = buildAnchor({ page, pageText, startOffset, endOffset })
  if (!anchor) return null

  const r = range.getBoundingClientRect()
  return {
    page,
    rect: { x: r.left + r.width / 2, y: r.top },
    selectedText: anchor.selectedText,
    anchor,
  }
}

export function clearSelection() {
  try { window.getSelection()?.removeAllRanges() } catch { /* ignore */ }
}
