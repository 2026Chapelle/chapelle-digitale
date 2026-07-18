'use client'
/**
 * Popup d'accueil première visite (V2.7-A.1). Une seule image, très peu de mots,
 * un CTA principal unique (Installer si PWA disponible, sinon Rejoindre). S'ouvre
 * après 25 s, une seule fois (localStorage). Fermeture bouton / overlay / Échap.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X, ArrowRight } from 'lucide-react'

const STORAGE_KEY = 'citadelle_home_join_popup_seen_v27'

export function HomeJoinPopup() {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let seen = false
    try { seen = window.localStorage.getItem(STORAGE_KEY) === '1' } catch { seen = false }
    if (seen) return
    const t = window.setTimeout(() => setOpen(true), 25000)
    return () => window.clearTimeout(t)
  }, [])

  const dismiss = () => {
    try { window.localStorage.setItem(STORAGE_KEY, '1') } catch { /* stockage indisponible */ }
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/70 p-3 py-6 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-popup-title"
      aria-describedby="home-popup-description"
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      <div className="relative isolate z-10 w-full max-w-sm max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-gold/20 shadow-[0_30px_90px_rgba(0,0,0,0.7)]"
        style={{ background: 'linear-gradient(180deg, #0b0713 0%, #050308 100%)' }}>
        <button ref={closeRef} onClick={dismiss} aria-label="Fermer" className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-black/30 hover:bg-black/50 transition-colors">
          <X className="w-4 h-4" />
        </button>

        {/* Une seule image */}
        <div className="relative h-44 w-full overflow-hidden sm:h-auto sm:aspect-[4/3]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/platformes/jeunesse.webp" alt="" loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(5,3,8,0.95) 100%)' }} />
        </div>

        <div className="p-4 sm:p-6 -mt-1 text-center">
          <h2 id="home-popup-title" className="font-cinzel font-bold text-pearl text-xl leading-tight mb-2">Bienvenue sur Citadelle</h2>
          <p id="home-popup-description" className="font-inter text-sm text-pearl/65 leading-relaxed mb-5">
            Emporte ta maison spirituelle partout avec toi.
          </p>

          {/* V2.7-A.4 : CTA interne unique — pas d'installation ici (bandeau Install unique). */}
          <Link href="/parcours" onClick={dismiss} className="btn-gold text-sm px-5 py-3 inline-flex items-center justify-center gap-2 font-semibold w-full">
            Commencer mon parcours <ArrowRight className="w-4 h-4" />
          </Link>
          <button onClick={dismiss} className="block w-full mt-3 text-xs font-inter text-pearl/40 hover:text-pearl/65 transition-colors">Plus tard</button>
        </div>
      </div>
    </div>
  )
}
