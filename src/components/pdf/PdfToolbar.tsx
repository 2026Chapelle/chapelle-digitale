'use client'
/**
 * CITADELLE PDF-1 — Barre d'outils du lecteur (sobre, royale, non « Acrobat »).
 *
 * Contrôles : précédent / suivant, pagination, zoom −/+ / ajuster, plein écran,
 * téléchargement (optionnel), fermer. Tous accessibles (aria-label, focus
 * visible). Sur mobile la navigation gauche/droite est déportée en bas
 * (`PdfReader`) ; ici on garde une barre compacte.
 */
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  X,
  Maximize,
} from 'lucide-react'
import { MAX_SCALE, MIN_SCALE } from '@/lib/pdf/reader-navigation'

export interface PdfToolbarProps {
  title?: string
  pageLabel: string
  scale: number
  canPrev: boolean
  canNext: boolean
  isFullscreen: boolean
  downloadUrl?: string | null
  onPrev: () => void
  onNext: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onToggleFullscreen: () => void
  onClose: () => void
}

const iconBtn =
  'inline-flex items-center justify-center rounded-lg w-9 h-9 text-pearl/70 hover:text-pearl transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]'
const iconBtnBg = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }

export function PdfToolbar({
  title,
  pageLabel,
  scale,
  canPrev,
  canNext,
  isFullscreen,
  downloadUrl,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFullscreen,
  onClose,
}: PdfToolbarProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(8,5,15,0.85)' }}
    >
      {/* Titre (tronqué) */}
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span className="font-cinzel text-pearl text-sm truncate" title={title}>
          {title || 'Document'}
        </span>
      </div>

      {/* Navigation pages (desktop / tablette) */}
      <div className="hidden sm:flex items-center gap-1.5">
        <button className={iconBtn} style={iconBtnBg} onClick={onPrev} disabled={!canPrev} aria-label="Page précédente">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-inter text-xs text-pearl/70 tabular-nums px-1 min-w-[74px] text-center" aria-live="polite">
          {pageLabel}
        </span>
        <button className={iconBtn} style={iconBtnBg} onClick={onNext} disabled={!canNext} aria-label="Page suivante">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-1.5">
        <button className={iconBtn} style={iconBtnBg} onClick={onZoomOut} disabled={scale <= MIN_SCALE} aria-label="Zoom arrière">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          className="hidden sm:inline-flex items-center justify-center rounded-lg h-9 px-2 text-pearl/70 hover:text-pearl transition-colors font-inter text-xs tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
          style={iconBtnBg}
          onClick={onResetZoom}
          aria-label="Ajuster à la largeur"
          title="Ajuster à la largeur"
        >
          {Math.round(scale * 100)}%
        </button>
        <button className={iconBtn} style={iconBtnBg} onClick={onZoomIn} disabled={scale >= MAX_SCALE} aria-label="Zoom avant">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Ajuster (mobile) */}
      <button
        className={`${iconBtn} sm:hidden`}
        style={iconBtnBg}
        onClick={onResetZoom}
        aria-label="Ajuster à la largeur"
      >
        <Maximize className="w-4 h-4" />
      </button>

      {/* Plein écran (desktop) */}
      <button
        className={`${iconBtn} hidden sm:inline-flex`}
        style={iconBtnBg}
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>

      {/* Télécharger (si disponible) — la lecture ne supprime pas cette capacité */}
      {downloadUrl && (
        <a
          className={iconBtn}
          style={iconBtnBg}
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Télécharger le document"
          title="Télécharger"
        >
          <Download className="w-4 h-4" />
        </a>
      )}

      {/* Fermer */}
      <button
        className={iconBtn}
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={onClose}
        aria-label="Fermer le lecteur"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
