'use client'
/**
 * CITADELLE LIVING BOOKS — LB-1B : scène de tourne-page « corner-drag » (MODE LIVRE).
 *
 * Vrai geste direct : POINTER_DOWN sur un bord → DRAG (le feuillet SUIT le pointeur)
 * → RELEASE → COMPLETE (page suivante/précédente) ou SNAP_BACK (retour naturel).
 * Implémentation NATIVE (Pointer Events + CSS 3D), aucune dépendance.
 *
 * Cohabitation stricte :
 *   - la préhension n'a lieu que dans les ZONES DE BORD (le centre reste dédié à la
 *     sélection de texte) ; pendant un drag actif, la sélection est neutralisée puis
 *     restaurée au relâcher ;
 *   - zoom > 1 → aucun tourne-page (priorité au pan) ; reduced-motion / mode lecture
 *     → pas de physique (navigation boutons/clavier/miniatures/TOC conservée).
 *
 * Le composant ne fait QUE l'interaction visuelle : il rend la/les page(s) via PdfPage
 * (canvas + couche texte) et notifie `onTurn(±1)` à la validation.
 */
import { useCallback, useRef, useState } from 'react'
import { PdfPage } from './PdfPage'
import type { PdfDocumentProxy } from './pdf-engine'
import {
  visiblePages, goNext, goPrev, canGoNext, canGoPrev, type ReaderState,
} from '@/lib/pdf/reader-navigation'
import {
  grabEdge, flipProgress, flipAngle, foldShadow, resolveRelease, canPhysicalTurn,
  type FlipEdge,
} from '@/lib/pdf/reader-flip'

interface TurnState { edge: FlipEdge; progress: number; settling: boolean; target: number }

export function PageTurnStage({
  pdf, reader, pageFitWidth, highlightQuery, highlightsForPage, title, reduceMotion, onTurn,
}: {
  pdf: PdfDocumentProxy
  reader: ReaderState
  pageFitWidth: number
  highlightQuery?: string | null
  highlightsForPage?: (page: number) => { color: string; selectedText: string }[]
  title?: string
  reduceMotion: boolean
  onTurn: (dir: 1 | -1) => void
}) {
  const [turn, setTurn] = useState<TurnState | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const widthRef = useRef(1)

  const pages = visiblePages(reader)
  const spread = reader.spread
  const enabled = canPhysicalTurn({ mode: 'livre', scale: reader.scale, reduceMotion })

  // Pages de destination révélées PENDANT le tournage.
  const destPages =
    turn ? visiblePages(turn.edge === 'right' ? goNext(reader) : goPrev(reader)) : []

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled || turn) return
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    const edge = grabEdge(e.clientX - rect.left, rect.width)
    if (!edge) return // centre → sélection texte préservée
    if (edge === 'right' && !canGoNext(reader)) return
    if (edge === 'left' && !canGoPrev(reader)) return
    startX.current = e.clientX
    widthRef.current = rect.width || 1
    setTurn({ edge, progress: 0, settling: false, target: edge === 'right' ? 1 : -1 })
    try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId) } catch { /* ignore */ }
  }, [enabled, turn, reader])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!turn || turn.settling) return
    const dx = e.clientX - startX.current
    const progress = flipProgress(dx, widthRef.current, turn.edge)
    setTurn((t) => (t ? { ...t, progress } : t))
  }, [turn])

  const finish = useCallback((t: TurnState) => {
    const decision = resolveRelease(t.progress)
    // Animation de fin : va au bout (complete) ou revient (snap_back).
    setTurn({ ...t, settling: true, progress: decision === 'complete' ? 1 : 0 })
    window.setTimeout(() => {
      if (decision === 'complete') onTurn(t.target as 1 | -1)
      setTurn(null)
    }, reduceMotion ? 0 : 260)
  }, [onTurn, reduceMotion])

  const CLICK_SLOP = 6
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!turn || turn.settling) return
    try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId) } catch { /* ignore */ }
    // Clic simple sur le bord (déplacement quasi nul) → tourne la page (affordance § 2).
    if (Math.abs(e.clientX - startX.current) < CLICK_SLOP) {
      onTurn(turn.target as 1 | -1)
      setTurn(null)
      return
    }
    finish(turn)
  }, [turn, finish, onTurn])

  const gap = spread === 'double' ? 0 : 0
  // Le feuillet saisi = page du côté du bord. En double : droite→page de droite (dernière), gauche→page de gauche (première).
  const leafIndex = turn?.edge === 'left' ? 0 : pages.length - 1
  const originIsLeft = turn?.edge === 'right' // droite tourne autour de la reliure (bord gauche du feuillet)

  return (
    <div
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative flex items-stretch justify-center"
      style={{
        gap,
        transformStyle: 'preserve-3d',
        touchAction: enabled ? 'none' : undefined, // le drag pilote lui-même le geste
        userSelect: turn ? 'none' : undefined, // neutralise la sélection pendant le drag
        filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.55))',
        cursor: enabled ? 'grab' : undefined,
      }}
    >
      {/* Destination révélée SOUS le feuillet en cours de tournage. */}
      {turn && destPages.length > 0 && (
        <div aria-hidden className="absolute inset-0 flex items-stretch justify-center" style={{ zIndex: 0, gap }}>
          {destPages.map((p) => (
            <div key={`dest-${p}`} className="relative" style={{ boxShadow: '0 2px 30px rgba(0,0,0,0.4)' }}>
              <PdfPage pdf={pdf} pageNumber={p} fitWidth={pageFitWidth} zoom={reader.scale} studyHighlights={highlightsForPage?.(p)} ariaLabel={`page ${p}`} />
            </div>
          ))}
        </div>
      )}

      {/* Spread courant. Le feuillet saisi porte le pli 3D + l'ombre dynamique. */}
      {pages.map((p, i) => {
        const isLeaf = turn != null && i === leafIndex
        const angle = isLeaf && turn ? flipAngle(turn.progress, turn.edge) : 0
        const shadow = isLeaf && turn ? foldShadow(turn.progress) : 0
        return (
          <div
            key={p}
            className="relative"
            style={{
              zIndex: isLeaf ? 3 : 1,
              transformOrigin: isLeaf ? (originIsLeft ? 'left center' : 'right center') : undefined,
              transform: isLeaf ? `rotateY(${angle}deg)` : undefined,
              transformStyle: 'preserve-3d',
              transition: turn?.settling && !reduceMotion ? 'transform 0.26s cubic-bezier(0.22,1,0.36,1)' : undefined,
              boxShadow: '0 2px 30px rgba(0,0,0,0.4)',
              backfaceVisibility: 'hidden',
            }}
          >
            <PdfPage
              pdf={pdf}
              pageNumber={p}
              fitWidth={pageFitWidth}
              zoom={reader.scale}
              highlightQuery={highlightQuery}
              studyHighlights={highlightsForPage?.(p)}
              ariaLabel={`${title ? `${title} — ` : ''}page ${p} sur ${reader.total}`}
            />
            {/* Ombre dynamique du pli (assombrit la reliure pendant le tournage). */}
            {isLeaf && shadow > 0 && (
              <span
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: originIsLeft
                    ? `linear-gradient(90deg, rgba(0,0,0,${shadow}) 0%, rgba(0,0,0,0) 42%)`
                    : `linear-gradient(270deg, rgba(0,0,0,${shadow}) 0%, rgba(0,0,0,0) 42%)`,
                }}
              />
            )}
            {/* Reliure centrale subtile (planche double). */}
            {spread === 'double' && pages.length === 2 && (
              <span
                aria-hidden
                className="absolute top-0 bottom-0 w-6 pointer-events-none"
                style={{
                  [i === 0 ? 'right' : 'left']: 0,
                  background: i === 0
                    ? 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.22) 100%)'
                    : 'linear-gradient(90deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 100%)',
                } as React.CSSProperties}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
