'use client'
/**
 * CITADELLE PDF-1 — Lecteur PDF / Flipbook intégré (« Lire dans la Citadelle »).
 *
 * Socle de LECTURE réutilisable (bibliothèque, formation, parcours, enseignement,
 * émission, événement…). Ne connaît AUCUNE logique métier : il reçoit `src`,
 * `title` et un `downloadUrl` optionnel.
 *
 * Expérience :
 *   - desktop large → double page + tourne-page discret (rotateY léger) ;
 *   - mobile / étroit → une page + glissé (slide) ; swipe si non zoomé ;
 *   - zoom, ajuster à la largeur, plein écran, navigation clavier (← →, +/−, 0) ;
 *   - respecte `prefers-reduced-motion` (aucune animation).
 *
 * Performance : le moteur pdf.js est chargé paresseusement (cf. pdf-engine),
 * seules la/les page(s) visibles sont rendues, tâches annulées au changement.
 * Toute la logique de bornage/pagination est PURE (src/lib/pdf/reader-navigation).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import {
  initReaderState,
  goNext,
  goPrev,
  zoomIn,
  zoomOut,
  resetZoom,
  resolveSpread,
  setSpread,
  canGoNext,
  canGoPrev,
  pageLabel,
  visiblePages,
  type ReaderState,
} from '@/lib/pdf/reader-navigation'
import { usePdfDocument } from './usePdfDocument'
import { PdfPage } from './PdfPage'
import { PdfToolbar } from './PdfToolbar'
import { PdfLoadingState } from './PdfLoadingState'
import { PdfErrorState } from './PdfErrorState'

export interface PdfReaderProps {
  src: string
  title?: string
  /** URL directe pour le téléchargement / repli nouvel onglet (facultatif). */
  downloadUrl?: string | null
  initialPage?: number
  onClose?: () => void
  /** overlay (modale plein écran) par défaut, ou inline (remplit le parent). */
  variant?: 'overlay' | 'inline'
}

const SINGLE_MAX_WIDTH = 900 // largeur de lecture confortable (simple page)
const PAGE_GAP = 20
const SWIPE_THRESHOLD = 48

export function PdfReader({
  src,
  title,
  downloadUrl,
  initialPage = 1,
  onClose,
  variant = 'overlay',
}: PdfReaderProps) {
  const { status, pdf, numPages, error, reload } = usePdfDocument(src)
  const [reader, setReader] = useState<ReaderState | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const reduceMotion = useReducedMotion()

  const close = useCallback(() => onClose?.(), [onClose])
  const panelRef = useFocusTrap<HTMLDivElement>(true, { onEscape: close })
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)
  const touchStartX = useRef<number | null>(null)

  // Verrou de défilement de l'arrière-plan (variante overlay uniquement).
  useEffect(() => {
    if (variant !== 'overlay' || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [variant])

  // Mesure de la largeur disponible (pilote simple/double + ajustement largeur).
  useEffect(() => {
    const el = contentRef.current
    if (!el || typeof ResizeObserver === 'undefined') {
      if (el) setContentWidth(el.clientWidth)
      return
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth
      setContentWidth(w)
    })
    ro.observe(el)
    setContentWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [status])

  // Initialise l'état de lecture dès que le document est prêt.
  useEffect(() => {
    if (status === 'ready' && numPages > 0) {
      const vw = contentWidth || (typeof window !== 'undefined' ? window.innerWidth : 0)
      setReader(initReaderState({ total: numPages, initialPage, viewportWidth: vw }))
    } else if (status !== 'ready') {
      setReader(null)
    }
    // contentWidth volontairement hors deps : l'ajustement de mode se fait plus bas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, numPages, initialPage])

  // Ajuste simple/double quand la largeur change (rotation, resize, fullscreen).
  useEffect(() => {
    if (!reader || !contentWidth) return
    const desired = resolveSpread(contentWidth, reader.total > 1)
    if (desired !== reader.spread) {
      setReader((r) => (r ? setSpread(r, desired) : r))
    }
  }, [contentWidth, reader])

  // Suivi de l'état plein écran.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return
    const el = panelRef.current
    if (!document.fullscreenElement) {
      el?.requestFullscreen?.().catch(() => undefined)
    } else {
      document.exitFullscreen?.().catch(() => undefined)
    }
  }, [panelRef])

  const doNext = useCallback(() => setReader((r) => (r ? goNext(r) : r)), [])
  const doPrev = useCallback(() => setReader((r) => (r ? goPrev(r) : r)), [])

  // Navigation clavier (le piège à focus gère déjà Tab / Échap).
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          doNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          doPrev()
          break
        case '+':
        case '=':
          setReader((r) => (r ? zoomIn(r) : r))
          break
        case '-':
          setReader((r) => (r ? zoomOut(r) : r))
          break
        case '0':
          setReader((r) => (r ? resetZoom(r) : r))
          break
        default:
          break
      }
    },
    [doNext, doPrev],
  )

  // Swipe tactile (désactivé quand zoomé : on laisse le déplacement libre).
  const onTouchStart = (e: React.TouchEvent) => {
    if (!reader || reader.scale > 1 || e.touches.length !== 1) {
      touchStartX.current = null
      return
    }
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    if (dx < 0) doNext()
    else doPrev()
  }

  // Largeur d'affichage cible (avant zoom) pour chaque page.
  const pageFitWidth = useMemo(() => {
    if (!reader || contentWidth <= 0) return 0
    if (reader.spread === 'double') {
      return Math.max(180, Math.floor((contentWidth - PAGE_GAP) / 2))
    }
    return Math.min(contentWidth, SINGLE_MAX_WIDTH)
  }, [reader, contentWidth])

  const pages = reader ? visiblePages(reader) : []

  // Variantes d'animation : tourne-page (double / desktop) vs glissé (simple).
  const direction = reader?.direction ?? 0
  const isFlip = reader?.spread === 'double'
  const variants = useMemo<Variants>(() => {
    if (reduceMotion) {
      return {
        enter: { opacity: 1 },
        center: { opacity: 1 },
        exit: { opacity: 1 },
      }
    }
    if (isFlip) {
      return {
        enter: (d: number) => ({ opacity: 0, rotateY: d >= 0 ? 10 : -10 }),
        center: { opacity: 1, rotateY: 0 },
        exit: (d: number) => ({ opacity: 0, rotateY: d >= 0 ? -8 : 8 }),
      }
    }
    return {
      enter: (d: number) => ({ opacity: 0, x: d >= 0 ? 40 : -40 }),
      center: { opacity: 1, x: 0 },
      exit: (d: number) => ({ opacity: 0, x: d >= 0 ? -40 : 40 }),
    }
  }, [isFlip, reduceMotion])
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.28, ease: 'easeOut' as const }

  const shellClass =
    variant === 'overlay'
      ? 'fixed inset-0 z-[80] flex flex-col'
      : 'relative flex flex-col w-full h-full'

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal={variant === 'overlay' ? true : undefined}
      aria-label={title ? `Lecteur — ${title}` : 'Lecteur de document'}
      onKeyDown={onKeyDown}
      className={`${shellClass} focus:outline-none`}
      style={{ background: 'linear-gradient(180deg, #0b0713 0%, #050308 100%)' }}
    >
      <PdfToolbar
        title={title}
        pageLabel={reader ? pageLabel(reader) : '—'}
        scale={reader?.scale ?? 1}
        canPrev={reader ? canGoPrev(reader) : false}
        canNext={reader ? canGoNext(reader) : false}
        isFullscreen={isFullscreen}
        downloadUrl={downloadUrl}
        onPrev={doPrev}
        onNext={doNext}
        onZoomIn={() => setReader((r) => (r ? zoomIn(r) : r))}
        onZoomOut={() => setReader((r) => (r ? zoomOut(r) : r))}
        onResetZoom={() => setReader((r) => (r ? resetZoom(r) : r))}
        onToggleFullscreen={toggleFullscreen}
        onClose={close}
      />

      {/* Zone de lecture */}
      <div
        className="relative flex-1 overflow-auto overscroll-contain"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          ref={contentRef}
          className="min-h-full w-full flex items-center justify-center px-3 sm:px-6 py-4 sm:py-8"
          style={{ perspective: isFlip ? 1800 : undefined }}
        >
          {status === 'loading' && <PdfLoadingState title={title} />}
          {status === 'error' && (
            <PdfErrorState onRetry={reload} fallbackUrl={downloadUrl ?? src} detail={error} />
          )}
          {status === 'ready' && reader && pdf && pageFitWidth > 0 && (
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={reader.page}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
                className="flex items-start justify-center"
                style={{ gap: PAGE_GAP, transformStyle: isFlip ? 'preserve-3d' : undefined }}
              >
                {pages.map((p) => (
                  <PdfPage
                    key={p}
                    pdf={pdf}
                    pageNumber={p}
                    fitWidth={pageFitWidth}
                    zoom={reader.scale}
                    ariaLabel={`${title ? `${title} — ` : ''}page ${p} sur ${reader.total}`}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Navigation flottante (mobile surtout) */}
        {status === 'ready' && reader && (
          <>
            <button
              onClick={doPrev}
              disabled={!canGoPrev(reader)}
              aria-label="Page précédente"
              className="sm:hidden fixed bottom-4 left-4 z-[85] w-11 h-11 rounded-full flex items-center justify-center text-pearl disabled:opacity-25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
              style={{ background: 'rgba(20,12,32,0.9)', border: '1px solid rgba(212,175,55,0.35)' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={doNext}
              disabled={!canGoNext(reader)}
              aria-label="Page suivante"
              className="sm:hidden fixed bottom-4 right-4 z-[85] w-11 h-11 rounded-full flex items-center justify-center text-pearl disabled:opacity-25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
              style={{ background: 'rgba(20,12,32,0.9)', border: '1px solid rgba(212,175,55,0.35)' }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {/* Pagination visible en bas (mobile) */}
            <div
              className="sm:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-[85] px-3 py-1.5 rounded-full font-inter text-xs text-pearl/80 tabular-nums"
              style={{ background: 'rgba(20,12,32,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
              aria-live="polite"
            >
              {pageLabel(reader)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default PdfReader
