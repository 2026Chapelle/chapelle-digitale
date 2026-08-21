'use client'
/**
 * CITADELLE LIVING BOOKS — LB-1 : rendu d'UNE page (canvas NET + couche TEXTE
 * sélectionnable), synchronisés au même viewport (échelle, zoom, page).
 *
 * Performance & propreté :
 *   - rend UNIQUEMENT la page demandée (jamais tout le document) ;
 *   - ANNULE la tâche de rendu canvas ET de couche texte, libère la page à chaque
 *     changement (page/échelle) et au démontage (aucune fuite pdf.js) ;
 *   - devicePixelRatio pour un canvas net sans surdimensionner la taille CSS.
 *
 * Couche texte : API officielle pdfjs 3.11 `renderTextLayer` ; positionnement via
 * la variable CSS `--scale-factor` (= échelle du viewport). Texte transparent
 * au-dessus du canvas → sélection/copie réelles, sans masquer le rendu.
 */
import { useEffect, useRef, useState } from 'react'
import { renderPdfTextLayer, type PdfDocumentProxy, type PdfRenderTask, type PdfTextLayerTask } from './pdf-engine'
import { foldText } from '@/lib/pdf/reader-search'

export interface PdfPageProps {
  pdf: PdfDocumentProxy
  pageNumber: number
  /** Largeur d'affichage cible (px), avant zoom utilisateur. */
  fitWidth: number
  /** Multiplicateur de zoom (1 = pleine largeur). */
  zoom?: number
  /** Requête de recherche active : surligne les occurrences sur cette page. */
  highlightQuery?: string | null
  className?: string
  ariaLabel?: string
}

export function PdfPage({
  pdf,
  pageNumber,
  fitWidth,
  zoom = 1,
  highlightQuery,
  className,
  ariaLabel,
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const [rendering, setRendering] = useState(true)
  const [failed, setFailed] = useState(false)
  const [textReady, setTextReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const textLayer = textLayerRef.current
    if (!canvas || !pdf || fitWidth <= 0) return

    let cancelled = false
    let renderTask: PdfRenderTask | null = null
    let textTask: PdfTextLayerTask | null = null
    let page: Awaited<ReturnType<PdfDocumentProxy['getPage']>> | null = null

    setRendering(true)
    setFailed(false)
    setTextReady(false)
    ;(async () => {
      try {
        page = await pdf.getPage(pageNumber)
        if (cancelled) { page.cleanup(); return }
        const base = page.getViewport({ scale: 1 })
        const cssScale = (fitWidth / base.width) * zoom
        const viewport = page.getViewport({ scale: cssScale })
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
        const cssW = Math.floor(viewport.width)
        const cssH = Math.floor(viewport.height)

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Contexte canvas indisponible.')

        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${cssW}px`
        canvas.style.height = `${cssH}px`

        renderTask = page.render({
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        })
        await renderTask.promise
        if (!cancelled) setRendering(false)

        // ---- Couche texte sélectionnable (best-effort : n'empêche pas la lecture) ----
        if (textLayer && !cancelled) {
          textLayer.replaceChildren()
          textLayer.style.width = `${cssW}px`
          textLayer.style.height = `${cssH}px`
          textLayer.style.setProperty('--scale-factor', String(cssScale))
          try {
            const textContent = await page.getTextContent()
            if (cancelled) return
            textTask = await renderPdfTextLayer({ textContentSource: textContent, container: textLayer, viewport })
            await textTask.promise
            if (!cancelled) setTextReady(true)
          } catch {
            /* Une page image-only ou sans texte : on garde juste le canvas. */
          }
        }
      } catch (err: unknown) {
        const name = (err as { name?: string } | null)?.name
        if (cancelled || name === 'RenderingCancelledException') return
        setFailed(true)
        setRendering(false)
      }
    })()

    return () => {
      cancelled = true
      try { renderTask?.cancel() } catch { /* ignore */ }
      try { textTask?.cancel() } catch { /* ignore */ }
      try { textLayerRef.current?.replaceChildren() } catch { /* ignore */ }
      try { page?.cleanup() } catch { /* ignore */ }
    }
  }, [pdf, pageNumber, fitWidth, zoom])

  // Surbrillance des occurrences de recherche sur les spans de la couche texte.
  useEffect(() => {
    const layer = textLayerRef.current
    if (!layer || !textReady) return
    const needle = highlightQuery ? foldText(highlightQuery.trim()) : ''
    const spans = layer.querySelectorAll<HTMLElement>('span')
    spans.forEach((span) => {
      const hit = needle.length >= 2 && foldText(span.textContent ?? '').includes(needle)
      span.classList.toggle('lb1-hl', hit)
    })
  }, [highlightQuery, textReady, pageNumber])

  return (
    <div className={className} style={{ position: 'relative', lineHeight: 0 }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel ?? `Page ${pageNumber}`}
        style={{
          display: 'block',
          maxWidth: '100%',
          borderRadius: 4,
          background: '#fff',
          opacity: rendering ? 0.35 : 1,
          transition: 'opacity 0.25s ease',
        }}
      />
      <div ref={textLayerRef} className="pdf-text-layer" aria-hidden={false} />
      {rendering && !failed && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid rgba(212,175,55,0.35)', borderTopColor: '#D4AF37', animation: 'pdf-spin 0.8s linear infinite' }} />
        </div>
      )}
      {failed && (
        <div role="status" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(245,230,216,0.7)', fontSize: 13 }}>
          Page indisponible
        </div>
      )}
      <style>{`
        @keyframes pdf-spin { to { transform: rotate(360deg); } }
        .pdf-text-layer{ position:absolute; inset:0; overflow:hidden; line-height:1; text-align:initial; transform-origin:0 0; z-index:2; }
        .pdf-text-layer span{ color:transparent; position:absolute; white-space:pre; cursor:text; transform-origin:0% 0%; }
        .pdf-text-layer br{ user-select:none; }
        .pdf-text-layer span.lb1-hl{ background:rgba(212,175,55,0.45); border-radius:2px; }
        .pdf-text-layer span::selection{ background:rgba(212,175,55,0.40); }
        .pdf-text-layer span::-moz-selection{ background:rgba(212,175,55,0.40); }
      `}</style>
    </div>
  )
}
