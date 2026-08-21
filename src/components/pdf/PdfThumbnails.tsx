'use client'
/**
 * CITADELLE LIVING BOOKS — LB-1 : panneau « Pages » (miniatures RÉELLES).
 *
 * Rendu PARESSEUX : chaque miniature n'est rendue que lorsqu'elle approche du
 * viewport du panneau (IntersectionObserver) → jamais 190 pages en haute
 * résolution simultanément. La page courante est mise en avant ; clic → aller.
 */
import { useEffect, useRef, useState } from 'react'
import type { PdfDocumentProxy, PdfRenderTask } from './pdf-engine'

const THUMB_WIDTH = 116

function PdfThumb({
  pdf, pageNumber, active, onSelect, scrollRoot,
}: {
  pdf: PdfDocumentProxy
  pageNumber: number
  active: boolean
  onSelect: (page: number) => void
  scrollRoot: HTMLElement | null
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = btnRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect() } },
      { root: scrollRoot ?? null, rootMargin: '300px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [scrollRoot])

  useEffect(() => {
    if (!visible) return
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let task: PdfRenderTask | null = null
    let page: Awaited<ReturnType<PdfDocumentProxy['getPage']>> | null = null
    ;(async () => {
      try {
        page = await pdf.getPage(pageNumber)
        if (cancelled) { page.cleanup(); return }
        const base = page.getViewport({ scale: 1 })
        const scale = THUMB_WIDTH / base.width
        const viewport = page.getViewport({ scale })
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        task = page.render({ canvasContext: ctx, viewport })
        await task.promise
      } catch { /* thumbnail non bloquant */ }
    })()
    return () => {
      cancelled = true
      try { task?.cancel() } catch { /* ignore */ }
      try { page?.cleanup() } catch { /* ignore */ }
    }
  }, [visible, pdf, pageNumber])

  return (
    <button
      ref={btnRef}
      onClick={() => onSelect(pageNumber)}
      aria-label={`Aller à la page ${pageNumber}`}
      aria-current={active ? 'true' : undefined}
      className="group flex flex-col items-center gap-1.5 rounded-lg p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
      style={{ background: active ? 'rgba(212,175,55,0.14)' : 'transparent' }}
    >
      <span
        className="block rounded-[3px] overflow-hidden"
        style={{
          width: THUMB_WIDTH,
          minHeight: 60,
          background: '#0d0a16',
          border: active ? '2px solid #D4AF37' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: active ? '0 0 16px rgba(212,175,55,0.3)' : 'none',
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 'auto', background: '#fff' }} />
      </span>
      <span className="font-inter text-[10px] tabular-nums" style={{ color: active ? '#F5E6A7' : 'rgba(255,255,255,0.45)' }}>
        {pageNumber}
      </span>
    </button>
  )
}

export function PdfThumbnails({
  pdf, total, currentPage, onSelect,
}: {
  pdf: PdfDocumentProxy
  total: number
  currentPage: number
  onSelect: (page: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [root, setRoot] = useState<HTMLElement | null>(null)
  useEffect(() => { setRoot(scrollRef.current) }, [])

  // Amène la miniature courante dans la vue quand la page change.
  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-thumb="${currentPage}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [currentPage])

  return (
    <div ref={scrollRef} data-thumb-scroll className="h-full overflow-y-auto overscroll-contain px-2 py-3">
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
          <div key={p} data-thumb={p}>
            <PdfThumb pdf={pdf} pageNumber={p} active={p === currentPage} onSelect={onSelect} scrollRoot={root} />
          </div>
        ))}
      </div>
    </div>
  )
}
