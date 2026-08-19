'use client'
/**
 * CITADELLE PDF-1 — Rendu d'UNE page PDF dans un <canvas>.
 *
 * Performance & propreté :
 *   - rend UNIQUEMENT la page demandée (jamais tout le document) ;
 *   - ANNULE la tâche de rendu en cours (`renderTask.cancel()`) et libère la
 *     page (`page.cleanup()`) à chaque changement de page/échelle et au démontage ;
 *   - tient compte du devicePixelRatio pour un rendu net sans surdimensionner
 *     le canvas CSS.
 *
 * `fitWidth` = largeur cible d'affichage (px) ; `zoom` = multiplicateur utilisateur.
 */
import { useEffect, useRef, useState } from 'react'
import type { PdfDocumentProxy, PdfRenderTask } from './pdf-engine'

export interface PdfPageProps {
  pdf: PdfDocumentProxy
  pageNumber: number
  /** Largeur d'affichage cible (px), avant zoom utilisateur. */
  fitWidth: number
  /** Multiplicateur de zoom (1 = pleine largeur). */
  zoom?: number
  className?: string
  /** Libellé accessible du canvas. */
  ariaLabel?: string
}

export function PdfPage({
  pdf,
  pageNumber,
  fitWidth,
  zoom = 1,
  className,
  ariaLabel,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rendering, setRendering] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pdf || fitWidth <= 0) return

    let cancelled = false
    let renderTask: PdfRenderTask | null = null
    let page: Awaited<ReturnType<PdfDocumentProxy['getPage']>> | null = null

    setRendering(true)
    setFailed(false)
    ;(async () => {
      try {
        page = await pdf.getPage(pageNumber)
        if (cancelled) {
          page.cleanup()
          return
        }
        const base = page.getViewport({ scale: 1 })
        const cssScale = (fitWidth / base.width) * zoom
        const viewport = page.getViewport({ scale: cssScale })
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Contexte canvas indisponible.')

        // Canvas physique (net) vs. taille CSS (mise en page).
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        renderTask = page.render({
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        })
        await renderTask.promise
        if (!cancelled) setRendering(false)
      } catch (err: unknown) {
        // `cancel()` rejette avec une RenderingCancelledException : on l'ignore.
        const name = (err as { name?: string } | null)?.name
        if (cancelled || name === 'RenderingCancelledException') return
        setFailed(true)
        setRendering(false)
      }
    })()

    return () => {
      cancelled = true
      try {
        renderTask?.cancel()
      } catch {
        /* ignore */
      }
      try {
        page?.cleanup()
      } catch {
        /* ignore */
      }
    }
  }, [pdf, pageNumber, fitWidth, zoom])

  return (
    <div className={className} style={{ position: 'relative', lineHeight: 0 }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel ?? `Page ${pageNumber}`}
        style={{
          display: 'block',
          maxWidth: '100%',
          borderRadius: 6,
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          background: '#fff',
          opacity: rendering ? 0.35 : 1,
          transition: 'opacity 0.2s ease',
        }}
      />
      {rendering && !failed && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: '2px solid rgba(212,175,55,0.35)',
              borderTopColor: '#D4AF37',
              animation: 'pdf-spin 0.8s linear infinite',
            }}
          />
        </div>
      )}
      {failed && (
        <div
          role="status"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(245,230,216,0.7)',
            fontSize: 13,
          }}
        >
          Page indisponible
        </div>
      )}
      <style>{`@keyframes pdf-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
