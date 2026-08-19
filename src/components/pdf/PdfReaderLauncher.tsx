'use client'
/**
 * CITADELLE PDF-1 — Déclencheur « Lire dans la Citadelle ».
 *
 * Rôle : garder le moteur PDF HORS du bundle des pages. Le lecteur (`PdfReader`,
 * qui importe pdf.js) est chargé PARESSEUSEMENT via `next/dynamic` + `ssr: false`
 * UNIQUEMENT quand l'utilisateur ouvre réellement un document.
 *
 * Réutilisable dans tous les contextes (bibliothèque, formation, parcours,
 * enseignement, émission, événement) : on lui passe `src`, `title`, et un
 * `downloadUrl` optionnel — aucune logique métier ici.
 */
import { useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { BookOpen } from 'lucide-react'

// Chargement paresseux, jamais côté serveur (pdf.js = browser-only).
const PdfReader = dynamic(() => import('./PdfReader').then((m) => m.PdfReader), {
  ssr: false,
  loading: () => (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(5,3,8,0.92)' }}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid rgba(212,175,55,0.25)',
          borderTopColor: '#D4AF37',
          animation: 'pdf-spin 0.8s linear infinite',
        }}
      />
      <span className="sr-only">Ouverture du lecteur…</span>
      <style>{`@keyframes pdf-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
})

export interface PdfReaderLauncherProps {
  src: string
  title?: string
  downloadUrl?: string | null
  initialPage?: number
  /** Classe du bouton déclencheur (sinon style « Lire » par défaut). */
  className?: string
  /** Contenu du bouton (sinon « Lire dans la Citadelle »). */
  children?: ReactNode
  /** Callback à l'ouverture (ex. traçabilité côté page appelante). */
  onOpen?: () => void
}

const DEFAULT_BTN =
  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-inter font-medium btn-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]'

export function PdfReaderLauncher({
  src,
  title,
  downloadUrl,
  initialPage,
  className,
  children,
  onOpen,
}: PdfReaderLauncherProps) {
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    onOpen?.()
    setOpen(true)
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className={className ?? DEFAULT_BTN}>
        {children ?? (
          <>
            <BookOpen className="w-4 h-4" aria-hidden /> Lire dans la Citadelle
          </>
        )}
      </button>
      {open && (
        <PdfReader
          src={src}
          title={title}
          downloadUrl={downloadUrl}
          initialPage={initialPage}
          variant="overlay"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export default PdfReaderLauncher
