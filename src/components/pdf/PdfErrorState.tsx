'use client'
/**
 * CITADELLE PDF-1 — État d'erreur du lecteur.
 * « Impossible d'ouvrir ce document. » + bouton « Réessayer » (et repli
 * « Ouvrir dans un nouvel onglet » si une URL directe est fournie).
 */
import { AlertTriangle, RotateCw, ExternalLink } from 'lucide-react'

export interface PdfErrorStateProps {
  onRetry?: () => void
  fallbackUrl?: string | null
  detail?: string | null
}

export function PdfErrorState({ onRetry, fallbackUrl, detail }: PdfErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ minHeight: 240 }}
    >
      <div
        aria-hidden
        className="flex items-center justify-center"
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.3)',
        }}
      >
        <AlertTriangle className="w-6 h-6" style={{ color: '#f87171' }} />
      </div>
      <div>
        <p className="font-cinzel text-pearl text-base">Impossible d’ouvrir ce document.</p>
        <p className="font-inter text-xs mt-1" style={{ color: 'rgba(245,230,216,0.5)' }}>
          {detail || 'Vérifiez votre connexion, puis réessayez.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-gold text-sm px-4 py-2 inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
          >
            <RotateCw className="w-4 h-4" aria-hidden /> Réessayer
          </button>
        )}
        {fallbackUrl && (
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm px-4 py-2 inline-flex items-center gap-2 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(245,230,216,0.85)',
            }}
          >
            <ExternalLink className="w-4 h-4" aria-hidden /> Ouvrir dans un nouvel onglet
          </a>
        )}
      </div>
    </div>
  )
}
