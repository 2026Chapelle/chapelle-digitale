'use client'
/**
 * CITADELLE LIVING BOOKS — LB-1 : barre d'outils « Livre » (royale, épurée).
 *
 * GAUCHE  : retour + titre.  CENTRE : aller-à-la-page + précédent/suivant.
 * DROITE  : pages, sommaire, recherche, zoom, mode livre/lecture, plein écran,
 * téléchargement (si permis), fermer. Auto-masquable en mode immersif (piloté
 * par PdfReader). Tout est accessible (aria-label, focus visible).
 */
import { useEffect, useState } from 'react'
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, Download, X,
  PanelsTopLeft, ListTree, Search, BookOpen, ScrollText, ArrowLeft, GraduationCap,
  Bookmark, BookmarkCheck,
} from 'lucide-react'
import { MAX_SCALE, MIN_SCALE, type ViewMode } from '@/lib/pdf/reader-navigation'

export type PanelKind = 'pages' | 'sommaire' | 'recherche' | 'etude'

export interface PdfToolbarProps {
  title?: string
  currentPage: number
  total: number
  pageLabel: string
  scale: number
  canPrev: boolean
  canNext: boolean
  isFullscreen: boolean
  mode: ViewMode
  activePanel: PanelKind | null
  isPageBookmarked: boolean
  onTogglePageBookmark: () => void
  downloadUrl?: string | null
  onPrev: () => void
  onNext: () => void
  onGoToPage: (page: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitWidth: () => void
  onTogglePanel: (panel: PanelKind) => void
  onToggleMode: () => void
  onToggleFullscreen: () => void
  onClose: () => void
}

const iconBtn =
  'inline-flex items-center justify-center rounded-lg w-9 h-9 text-pearl/70 hover:text-pearl transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]'
const btnBg = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
const activeBg = { background: 'rgba(212,175,55,0.16)', border: '1px solid rgba(212,175,55,0.45)' }

export function PdfToolbar(props: PdfToolbarProps) {
  const {
    title, currentPage, total, pageLabel, scale, canPrev, canNext, isFullscreen, mode,
    activePanel, isPageBookmarked, onTogglePageBookmark, downloadUrl, onPrev, onNext, onGoToPage, onZoomIn, onZoomOut, onFitWidth,
    onTogglePanel, onToggleMode, onToggleFullscreen, onClose,
  } = props

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  useEffect(() => { if (!editing) setDraft(String(currentPage)) }, [currentPage, editing])

  const commit = () => {
    setEditing(false)
    const n = Number.parseInt(draft.replace(/[^0-9]/g, ''), 10)
    if (Number.isFinite(n)) onGoToPage(n)
  }

  const panelBtn = (panel: PanelKind, label: string, Icon: typeof Search) => (
    <button
      className={`${iconBtn} hidden sm:inline-flex`}
      style={activePanel === panel ? activeBg : btnBg}
      onClick={() => onTogglePanel(panel)}
      aria-label={label}
      aria-pressed={activePanel === panel}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  )

  return (
    <div
      className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 border-b"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(8,5,15,0.9)', backdropFilter: 'blur(8px)' }}
    >
      {/* GAUCHE — retour + titre */}
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <button className={iconBtn} style={btnBg} onClick={onClose} aria-label="Retour à la bibliothèque">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-cinzel text-pearl text-sm truncate" title={title}>{title || 'Document'}</span>
      </div>

      {/* CENTRE — aller à la page + précédent/suivant */}
      <div className="flex items-center gap-1.5">
        <button className={iconBtn} style={btnBg} onClick={onPrev} disabled={!canPrev} aria-label="Page précédente">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 font-inter text-xs text-pearl/70 tabular-nums" title="Aller à la page">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
              inputMode="numeric"
              aria-label="Numéro de page"
              className="w-12 text-center bg-transparent rounded outline-none"
              style={{ border: '1px solid rgba(212,175,55,0.5)' }}
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-2 py-1 rounded hover:text-pearl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
              style={btnBg}
              aria-label={`Page ${currentPage} sur ${total}. Cliquer pour aller à une page`}
            >
              <span className="hidden sm:inline">{pageLabel}</span>
              <span className="sm:hidden">{currentPage}/{total}</span>
            </button>
          )}
        </div>
        <button className={iconBtn} style={btnBg} onClick={onNext} disabled={!canNext} aria-label="Page suivante">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* DROITE — panneaux + zoom + mode + plein écran + download + fermer */}
      <div className="flex items-center gap-1.5 flex-1 justify-end">
        {panelBtn('pages', 'Pages', PanelsTopLeft)}
        {panelBtn('sommaire', 'Sommaire', ListTree)}
        {panelBtn('recherche', 'Rechercher', Search)}
        {panelBtn('etude', 'Étude', GraduationCap)}
        <button
          className={iconBtn}
          style={isPageBookmarked ? activeBg : btnBg}
          onClick={onTogglePageBookmark}
          aria-label={isPageBookmarked ? 'Retirer le signet de cette page' : 'Ajouter un signet à cette page'}
          aria-pressed={isPageBookmarked}
          title={isPageBookmarked ? 'Signet posé' : 'Signet de page'}
        >
          {isPageBookmarked ? <BookmarkCheck className="w-4 h-4" style={{ color: '#F5E6A7' }} /> : <Bookmark className="w-4 h-4" />}
        </button>

        <div className="hidden sm:flex items-center gap-1.5 pl-1.5 ml-0.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          <button className={iconBtn} style={btnBg} onClick={onZoomOut} disabled={scale <= MIN_SCALE} aria-label="Zoom arrière">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            className="inline-flex items-center justify-center rounded-lg h-9 px-2 text-pearl/70 hover:text-pearl transition-colors font-inter text-xs tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            style={btnBg} onClick={onFitWidth} aria-label="Ajuster à la largeur" title="Ajuster à la largeur"
          >
            {Math.round(scale * 100)}%
          </button>
          <button className={iconBtn} style={btnBg} onClick={onZoomIn} disabled={scale >= MAX_SCALE} aria-label="Zoom avant">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <button
          className={iconBtn} style={mode === 'livre' ? activeBg : btnBg} onClick={onToggleMode}
          aria-label={mode === 'livre' ? 'Passer en mode lecture' : 'Passer en mode livre'}
          aria-pressed={mode === 'livre'}
          title={mode === 'livre' ? 'Mode livre (feuilletage)' : 'Mode lecture'}
        >
          {mode === 'livre' ? <BookOpen className="w-4 h-4" /> : <ScrollText className="w-4 h-4" />}
        </button>

        <button className={`${iconBtn} hidden sm:inline-flex`} style={btnBg} onClick={onToggleFullscreen} aria-label={isFullscreen ? 'Quitter le plein écran' : 'Mode immersif (plein écran)'}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {downloadUrl && (
          <a className={`${iconBtn} hidden sm:inline-flex`} style={btnBg} href={downloadUrl} target="_blank" rel="noreferrer" aria-label="Télécharger le document" title="Télécharger">
            <Download className="w-4 h-4" />
          </a>
        )}

        <button className={iconBtn} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} onClick={onClose} aria-label="Fermer le lecteur">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
