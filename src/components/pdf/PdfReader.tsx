'use client'
/**
 * CITADELLE LIVING BOOKS — LB-1 : lecteur « Whaou » (Livre Citadelle).
 *
 * Expérience : feuilletage (livre) ou lecture rapide, texte SÉLECTIONNABLE,
 * miniatures, sommaire, recherche in-document, zoom, mode immersif, reprise de
 * lecture LOCALE. Le moteur pdf.js reste chargé paresseusement (pdf-engine) et
 * SÉCURISÉ : le lecteur ne reçoit qu'une `src` déjà signée par LB-SEC (route
 * serveur) — il n'a AUCUNE connaissance des règles d'accès.
 *
 * Toute la logique de bornage/pagination/zoom/recherche/reprise est PURE
 * (src/lib/pdf/reader-navigation, reader-search, reader-storage).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import {
  initReaderState, goNext, goPrev, goToPage, zoomIn, zoomOut, resetZoom,
  resolveSpread, setSpread, canGoNext, canGoPrev, pageLabel, visiblePages,
  clampScale, type ReaderState, type ViewMode,
} from '@/lib/pdf/reader-navigation'
import { progressStorageKey, serializeProgress, parseProgress } from '@/lib/pdf/reader-storage'
import { usePdfDocument } from './usePdfDocument'
import { usePdfText } from './usePdfText'
import { PdfPage } from './PdfPage'
import { PdfToolbar, type PanelKind } from './PdfToolbar'
import { PdfThumbnails } from './PdfThumbnails'
import { PdfOutline } from './PdfOutline'
import { PdfSearchPanel } from './PdfSearchPanel'
import { PdfLoadingState } from './PdfLoadingState'
import { PdfErrorState } from './PdfErrorState'

export interface PdfReaderProps {
  src: string
  title?: string
  downloadUrl?: string | null
  storageId?: string
  initialPage?: number
  onClose?: () => void
  variant?: 'overlay' | 'inline'
}

const SINGLE_MAX_WIDTH = 860
const PAGE_GAP = 22
const SWIPE_THRESHOLD = 48
const IMMERSIVE_IDLE_MS = 2600

export function PdfReader({
  src, title, downloadUrl, storageId, initialPage = 1, onClose, variant = 'overlay',
}: PdfReaderProps) {
  const { status, pdf, numPages, error, reload } = usePdfDocument(src)
  const text = usePdfText(pdf)
  const [reader, setReader] = useState<ReaderState | null>(null)
  const [mode, setMode] = useState<ViewMode>('livre')
  const [activePanel, setActivePanel] = useState<PanelKind | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [highlightQuery, setHighlightQuery] = useState<string | null>(null)
  const [resumeNotice, setResumeNotice] = useState<number | null>(null)
  const reduceMotion = useReducedMotion()

  const close = useCallback(() => onClose?.(), [onClose])
  const panelRef = useFocusTrap<HTMLDivElement>(true, { onEscape: close })
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resumeApplied = useRef(false)

  // Verrou de défilement de l'arrière-plan (overlay).
  useEffect(() => {
    if (variant !== 'overlay' || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [variant])

  // Mesure de la largeur disponible.
  useEffect(() => {
    const el = contentRef.current
    if (!el || typeof ResizeObserver === 'undefined') { if (el) setContentWidth(el.clientWidth); return }
    const ro = new ResizeObserver((entries) => setContentWidth(entries[0]?.contentRect.width ?? el.clientWidth))
    ro.observe(el)
    setContentWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [status])

  // Initialise la lecture dès que le document est prêt — avec REPRISE locale.
  useEffect(() => {
    if (status === 'ready' && numPages > 0) {
      const vw = contentWidth || (typeof window !== 'undefined' ? window.innerWidth : 0)
      let startPage = initialPage
      let startScale = 1
      let startMode: ViewMode = 'livre'
      if (storageId && typeof window !== 'undefined') {
        const saved = parseProgress(window.localStorage.getItem(progressStorageKey(storageId)), numPages)
        if (saved) {
          startPage = saved.page; startScale = saved.scale; startMode = saved.mode
          if (saved.page > 1) setResumeNotice(saved.page)
        }
      }
      setMode(startMode)
      const allowDouble = startMode === 'livre' && numPages > 1
      const base = initReaderState({ total: numPages, initialPage: startPage, viewportWidth: vw, allowDouble })
      setReader({ ...base, scale: clampScale(startScale) })
      resumeApplied.current = true
    } else if (status !== 'ready') {
      setReader(null)
      resumeApplied.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, numPages, initialPage, storageId])

  // Ajuste simple/double selon la largeur ET le mode (lecture = toujours simple).
  useEffect(() => {
    if (!reader || !contentWidth) return
    const allowDouble = mode === 'livre' && reader.total > 1
    const desired = resolveSpread(contentWidth, allowDouble)
    if (desired !== reader.spread) setReader((r) => (r ? setSpread(r, desired) : r))
  }, [contentWidth, reader, mode])

  // Persiste la progression (reprise locale). LB-1A : aucun Supabase.
  useEffect(() => {
    if (!reader || !storageId || !resumeApplied.current || typeof window === 'undefined') return
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(
          progressStorageKey(storageId),
          serializeProgress({ page: reader.page, scale: reader.scale, mode }),
        )
      } catch { /* quota / privé : silencieux */ }
    }, 400)
    return () => clearTimeout(t)
  }, [reader, mode, storageId])

  // Suivi plein écran.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Mode immersif : masque les contrôles après inactivité (uniquement en plein écran).
  useEffect(() => {
    if (!isFullscreen) { setControlsVisible(true); return }
    const bump = () => {
      setControlsVisible(true)
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => setControlsVisible(false), IMMERSIVE_IDLE_MS)
    }
    bump()
    window.addEventListener('mousemove', bump)
    window.addEventListener('touchstart', bump, { passive: true })
    window.addEventListener('keydown', bump)
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      window.removeEventListener('mousemove', bump)
      window.removeEventListener('touchstart', bump)
      window.removeEventListener('keydown', bump)
    }
  }, [isFullscreen])

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return
    const el = panelRef.current
    if (!document.fullscreenElement) el?.requestFullscreen?.().catch(() => undefined)
    else document.exitFullscreen?.().catch(() => undefined)
  }, [panelRef])

  const doNext = useCallback(() => setReader((r) => (r ? goNext(r) : r)), [])
  const doPrev = useCallback(() => setReader((r) => (r ? goPrev(r) : r)), [])
  const doGoTo = useCallback((page: number) => setReader((r) => (r ? goToPage(r, page) : r)), [])
  const toggleMode = useCallback(() => setMode((m) => (m === 'livre' ? 'lecture' : 'livre')), [])
  const togglePanel = useCallback((p: PanelKind) => setActivePanel((cur) => (cur === p ? null : p)), [])

  const onNavigateToMatch = useCallback((page: number, query: string) => {
    setHighlightQuery(query)
    setReader((r) => (r ? goToPage(r, page) : r))
  }, [])

  // Double-clic : bascule zoom 1× / 2× (ajustement rapide « premium »).
  const onDoubleClick = useCallback(() => {
    setReader((r) => (r ? { ...r, scale: r.scale > 1 ? 1 : clampScale(2), direction: 0 } : r))
  }, [])

  // Navigation clavier.
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': e.preventDefault(); doNext(); break
      case 'ArrowLeft': case 'PageUp': e.preventDefault(); doPrev(); break
      case '+': case '=': setReader((r) => (r ? zoomIn(r) : r)); break
      case '-': setReader((r) => (r ? zoomOut(r) : r)); break
      case '0': setReader((r) => (r ? resetZoom(r) : r)); break
      case 'f': case 'F':
        if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); setActivePanel('recherche') }
        break
      case 'Escape':
        if (activePanel) { e.preventDefault(); setActivePanel(null) }
        break
      default: break
    }
  }, [doNext, doPrev, activePanel])

  // Swipe tactile (désactivé quand zoomé).
  const onTouchStart = (e: React.TouchEvent) => {
    if (!reader || reader.scale > 1 || e.touches.length !== 1) { touchStartX.current = null; return }
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    if (dx < 0) doNext(); else doPrev()
  }

  const pageFitWidth = useMemo(() => {
    if (!reader || contentWidth <= 0) return 0
    if (reader.spread === 'double') return Math.max(180, Math.floor((contentWidth - PAGE_GAP) / 2) - 24)
    return Math.min(contentWidth - 24, SINGLE_MAX_WIDTH)
  }, [reader, contentWidth])

  const pages = reader ? visiblePages(reader) : []
  const direction = reader?.direction ?? 0
  const isFlip = reader?.spread === 'double' && mode === 'livre'

  const variants = useMemo<Variants>(() => {
    if (reduceMotion) return { enter: { opacity: 1 }, center: { opacity: 1 }, exit: { opacity: 1 } }
    if (isFlip) {
      return {
        enter: (d: number) => ({ opacity: 0, rotateY: d >= 0 ? 14 : -14, scale: 0.985 }),
        center: { opacity: 1, rotateY: 0, scale: 1 },
        exit: (d: number) => ({ opacity: 0, rotateY: d >= 0 ? -10 : 10, scale: 0.985 }),
      }
    }
    return {
      enter: (d: number) => ({ opacity: 0, x: d >= 0 ? 44 : -44 }),
      center: { opacity: 1, x: 0 },
      exit: (d: number) => ({ opacity: 0, x: d >= 0 ? -44 : 44 }),
    }
  }, [isFlip, reduceMotion])
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const }

  const shellClass = variant === 'overlay' ? 'fixed inset-0 z-[80] flex flex-col' : 'relative flex flex-col w-full h-full'

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal={variant === 'overlay' ? true : undefined}
      aria-label={title ? `Lecteur — ${title}` : 'Lecteur de document'}
      onKeyDown={onKeyDown}
      className={`${shellClass} focus:outline-none`}
      style={{ background: 'radial-gradient(1200px 800px at 50% -10%, #17102b 0%, #0b0713 45%, #050308 100%)' }}
    >
      {/* Barre d'outils (masquée en immersif inactif) */}
      <div
        className="transition-opacity duration-300"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}
      >
        <PdfToolbar
          title={title}
          currentPage={reader?.page ?? 1}
          total={reader?.total ?? numPages}
          pageLabel={reader ? pageLabel(reader) : '—'}
          scale={reader?.scale ?? 1}
          canPrev={reader ? canGoPrev(reader) : false}
          canNext={reader ? canGoNext(reader) : false}
          isFullscreen={isFullscreen}
          mode={mode}
          activePanel={activePanel}
          downloadUrl={downloadUrl}
          onPrev={doPrev}
          onNext={doNext}
          onGoToPage={doGoTo}
          onZoomIn={() => setReader((r) => (r ? zoomIn(r) : r))}
          onZoomOut={() => setReader((r) => (r ? zoomOut(r) : r))}
          onFitWidth={() => setReader((r) => (r ? resetZoom(r) : r))}
          onTogglePanel={togglePanel}
          onToggleMode={toggleMode}
          onToggleFullscreen={toggleFullscreen}
          onClose={close}
        />
      </div>

      <div className="relative flex-1 min-h-0 flex">
        {/* Panneau latéral (desktop) / feuille inférieure (mobile) */}
        {activePanel && reader && pdf && (
          <>
            <div
              className="fixed inset-0 z-[82] sm:absolute sm:inset-y-0 sm:left-0 sm:right-auto sm:w-auto"
              onClick={() => setActivePanel(null)}
              style={{ background: 'rgba(0,0,0,0.45)' }}
              aria-hidden
            />
            <aside
              className="z-[83] flex flex-col
                fixed left-0 right-0 bottom-0 max-h-[70vh] rounded-t-2xl
                sm:absolute sm:top-0 sm:bottom-0 sm:right-auto sm:w-[300px] sm:max-h-none sm:rounded-none"
              style={{ background: 'rgba(12,8,22,0.98)', borderRight: '1px solid rgba(255,255,255,0.08)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              aria-label={activePanel === 'pages' ? 'Pages' : activePanel === 'sommaire' ? 'Sommaire' : 'Recherche'}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="font-cinzel text-sm text-pearl">
                  {activePanel === 'pages' ? 'Pages' : activePanel === 'sommaire' ? 'Sommaire' : 'Rechercher'}
                </span>
                <button onClick={() => setActivePanel(null)} aria-label="Fermer le panneau" className="text-pearl/50 hover:text-pearl">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                {activePanel === 'pages' && (
                  <PdfThumbnails pdf={pdf} total={reader.total} currentPage={reader.page} onSelect={(p) => { doGoTo(p); if (typeof window !== 'undefined' && window.innerWidth < 640) setActivePanel(null) }} />
                )}
                {activePanel === 'sommaire' && (
                  <PdfOutline pdf={pdf} currentPage={reader.page} onSelect={(p) => { doGoTo(p); if (typeof window !== 'undefined' && window.innerWidth < 640) setActivePanel(null) }} />
                )}
                {activePanel === 'recherche' && (
                  <PdfSearchPanel pages={text.pages} loading={text.loading} onExtract={text.extract} onNavigate={onNavigateToMatch} onClose={() => setActivePanel(null)} />
                )}
              </div>
            </aside>
          </>
        )}

        {/* Zone de lecture */}
        <div
          className="relative flex-1 min-w-0 overflow-auto overscroll-contain"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onDoubleClick={onDoubleClick}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            ref={contentRef}
            className="min-h-full w-full flex items-center justify-center px-3 sm:px-8 py-5 sm:py-10"
            style={{ perspective: isFlip ? 2200 : undefined }}
          >
            {status === 'loading' && <PdfLoadingState title={title} />}
            {status === 'error' && <PdfErrorState onRetry={reload} fallbackUrl={downloadUrl ?? src} detail={error} />}
            {status === 'ready' && reader && pdf && pageFitWidth > 0 && (
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={`${reader.page}-${reader.spread}`}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={transition}
                  className="relative flex items-stretch justify-center"
                  style={{
                    gap: reader.spread === 'double' ? 0 : PAGE_GAP,
                    transformStyle: isFlip ? 'preserve-3d' : undefined,
                    filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.55))',
                  }}
                >
                  {pages.map((p, i) => (
                    <div key={p} className="relative" style={{ boxShadow: '0 2px 30px rgba(0,0,0,0.4)' }}>
                      <PdfPage
                        pdf={pdf}
                        pageNumber={p}
                        fitWidth={pageFitWidth}
                        zoom={reader.scale}
                        highlightQuery={highlightQuery}
                        ariaLabel={`${title ? `${title} — ` : ''}page ${p} sur ${reader.total}`}
                      />
                      {/* Reliure centrale subtile (mode double) */}
                      {reader.spread === 'double' && pages.length === 2 && (
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
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Reprise de lecture */}
          {resumeNotice && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[84] px-3 py-1.5 rounded-full font-inter text-xs text-pearl flex items-center gap-2"
              style={{ background: 'rgba(20,12,32,0.95)', border: '1px solid rgba(212,175,55,0.4)' }}
              role="status">
              Reprise page {resumeNotice}
              <button className="text-pearl/50 hover:text-pearl" aria-label="Masquer" onClick={() => setResumeNotice(null)}><X className="w-3 h-3" /></button>
            </div>
          )}

          {/* Zones de clic gauche/droite (desktop, mode livre) */}
          {status === 'ready' && reader && mode === 'livre' && (
            <>
              <button aria-label="Page précédente" onClick={doPrev} disabled={!canGoPrev(reader)}
                className="hidden sm:block absolute left-0 top-0 bottom-0 w-[12%] cursor-w-resize disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]" style={{ background: 'transparent' }} />
              <button aria-label="Page suivante" onClick={doNext} disabled={!canGoNext(reader)}
                className="hidden sm:block absolute right-0 top-0 bottom-0 w-[12%] cursor-e-resize disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]" style={{ background: 'transparent' }} />
            </>
          )}

          {/* Navigation flottante (mobile) */}
          {status === 'ready' && reader && (
            <div className="transition-opacity duration-300" style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? 'auto' : 'none' }}>
              <button onClick={doPrev} disabled={!canGoPrev(reader)} aria-label="Page précédente"
                className="sm:hidden fixed bottom-4 left-4 z-[85] w-11 h-11 rounded-full flex items-center justify-center text-pearl disabled:opacity-25"
                style={{ background: 'rgba(20,12,32,0.9)', border: '1px solid rgba(212,175,55,0.35)' }}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={doNext} disabled={!canGoNext(reader)} aria-label="Page suivante"
                className="sm:hidden fixed bottom-4 right-4 z-[85] w-11 h-11 rounded-full flex items-center justify-center text-pearl disabled:opacity-25"
                style={{ background: 'rgba(20,12,32,0.9)', border: '1px solid rgba(212,175,55,0.35)' }}>
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="sm:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-[85] px-3 py-1.5 rounded-full font-inter text-xs text-pearl/80 tabular-nums"
                style={{ background: 'rgba(20,12,32,0.9)', border: '1px solid rgba(255,255,255,0.1)' }} aria-live="polite">
                {pageLabel(reader)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PdfReader
