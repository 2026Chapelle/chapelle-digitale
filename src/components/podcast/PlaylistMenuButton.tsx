'use client'
/**
 * PODCAST-7 — Bouton ⋯ discret sur une carte épisode (membre connecté uniquement).
 * Ouvre la feuille « Ajouter à une playlist ». Volontairement mono-action pour rester
 * discret et tactile ; ne transforme pas la carte en panneau de boutons. Accessible.
 */
import { MoreHorizontal } from 'lucide-react'

export function PlaylistMenuButton({
  onClick, title, className = '',
}: {
  onClick: () => void
  /** Titre de l'épisode (aria-label contextualisé). */
  title?: string | null
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick() }}
      aria-label={title ? `Ajouter « ${title} » à une playlist` : 'Ajouter à une playlist'}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-pearl/70 hover:text-gold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] ${className}`}
      style={{ background: 'rgba(6,6,10,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <MoreHorizontal className="w-4 h-4" aria-hidden />
    </button>
  )
}
