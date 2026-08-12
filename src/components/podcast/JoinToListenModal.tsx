'use client'
/**
 * PODCAST-0A — Invitation élégante à rejoindre La Citadelle avant la lecture.
 *
 * Affichée UNIQUEMENT sur /podcast, quand un visiteur non connecté clique sur Lecture.
 * Le catalogue reste entièrement visible ; seule la mise en lecture est réservée.
 * Aucune redirection brutale : une modale accessible (focus, Échap, overlay) avec
 * deux CTA — « Créer mon compte » (/register) et « Se connecter » (/login).
 *
 * Ne change RIEN à la lecture membre ni à l'écoute libre de L'Instant Citadelle
 * depuis la page d'accueil (ce composant n'y est pas monté).
 */
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, ArrowRight, Headphones, Lock } from 'lucide-react'

export interface JoinToListenModalProps {
  open: boolean
  onClose: () => void
  /** Titre de l'épisode que le visiteur a tenté de lancer (contextualise le message). */
  episodeTitle?: string | null
}

export function JoinToListenModal({ open, onClose, episodeTitle }: JoinToListenModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/75 p-3 py-6 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="podcast-join-title"
      aria-describedby="podcast-join-description"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="relative isolate z-10 w-full max-w-sm max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-gold/20 shadow-[0_30px_90px_rgba(0,0,0,0.7)]"
        style={{ background: 'linear-gradient(180deg, #0b0713 0%, #050308 100%)' }}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-black/30 hover:bg-black/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7 text-center">
          <div
            className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(212,175,55,0.12)',
              border: '1px solid rgba(212,175,55,0.28)',
            }}
          >
            <Headphones className="w-6 h-6 text-gold" aria-hidden />
          </div>

          <h2
            id="podcast-join-title"
            className="font-cinzel font-bold text-pearl text-xl leading-tight mb-2"
          >
            Rejoins La Citadelle pour écouter
          </h2>
          <p
            id="podcast-join-description"
            className="font-inter text-sm leading-relaxed mb-6"
            style={{ color: 'rgba(245,230,216,0.62)' }}
          >
            {episodeTitle ? (
              <>
                Crée gratuitement ton compte pour lancer
                <span className="text-pearl/85"> « {episodeTitle} » </span>
                et tous les enseignements de La Voix du Royaume.
              </>
            ) : (
              <>
                Crée gratuitement ton compte pour accéder aux podcasts et
                enseignements de La Voix du Royaume.
              </>
            )}
          </p>

          <Link
            href="/register"
            onClick={onClose}
            className="btn-gold text-sm px-5 py-3 inline-flex items-center justify-center gap-2 font-semibold w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
          >
            Créer mon compte <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>

          <Link
            href="/login"
            onClick={onClose}
            className="mt-3 inline-flex items-center justify-center gap-2 w-full text-sm font-medium rounded-full px-5 py-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(245,230,216,0.85)',
            }}
          >
            Se connecter
          </Link>

          <p
            className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-inter"
            style={{ color: 'rgba(245,230,216,0.4)' }}
          >
            <Lock className="w-3 h-3" aria-hidden />
            Écoute réservée aux membres · découverte libre du catalogue
          </p>
        </div>
      </div>
    </div>
  )
}
