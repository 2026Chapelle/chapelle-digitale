'use client'
/**
 * Popup d'accueil première visite (V2.7-A.1). Une seule image, très peu de mots,
 * un CTA principal unique (Installer si PWA disponible, sinon Rejoindre). S'ouvre
 * après 5 s, une seule fois (localStorage). Fermeture bouton / overlay / Échap.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X, Download, ArrowRight } from 'lucide-react'
import { usePwaInstall } from '@/components/home/pwa-install'

const STORAGE_KEY = 'citadelle_home_join_popup_seen_v27'

export function HomeJoinPopup() {
  const [open, setOpen] = useState(false)
  const [hint, setHint] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const { canInstall, installed, promptInstall } = usePwaInstall()

  useEffect(() => {
    if (typeof window === 'undefined') return
    let seen = false
    try { seen = window.localStorage.getItem(STORAGE_KEY) === '1' } catch { seen = false }
    if (seen) return
    const t = window.setTimeout(() => setOpen(true), 5000)
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

  async function onPrimary() {
    if (canInstall) { await promptInstall(); dismiss() }
    else setHint(true)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="home-popup-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} aria-hidden />
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-gold/20 shadow-[0_30px_90px_rgba(0,0,0,0.7)]"
        style={{ background: 'linear-gradient(180deg, #0b0713 0%, #050308 100%)' }}>
        <button ref={closeRef} onClick={dismiss} aria-label="Fermer" className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-black/30 hover:bg-black/50 transition-colors">
          <X className="w-4 h-4" />
        </button>

        {/* Une seule image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/platformes/jeunesse.png" alt="" loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(5,3,8,0.95) 100%)' }} />
        </div>

        <div className="p-6 -mt-1 text-center">
          <h2 id="home-popup-title" className="font-cinzel font-bold text-pearl text-xl leading-tight mb-2">Bienvenue sur Citadelle</h2>
          <p className="font-inter text-sm text-pearl/65 leading-relaxed mb-5">Rejoignez. Grandissez. Suivez votre parcours.</p>

          {installed ? (
            <Link href="/rejoindre" onClick={dismiss} className="btn-gold text-sm px-5 py-3 inline-flex items-center justify-center gap-2 font-semibold w-full">
              Rejoindre la Chapelle <ArrowRight className="w-4 h-4" />
            </Link>
          ) : canInstall ? (
            <button onClick={onPrimary} className="btn-gold text-sm px-5 py-3 inline-flex items-center justify-center gap-2 font-semibold w-full">
              <Download className="w-4 h-4" /> Installer Citadelle
            </button>
          ) : (
            <Link href="/rejoindre" onClick={dismiss} className="btn-gold text-sm px-5 py-3 inline-flex items-center justify-center gap-2 font-semibold w-full">
              Rejoindre la Chapelle <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          {!installed && canInstall && (
            <Link href="/rejoindre" onClick={dismiss} className="block mt-3 text-xs font-inter text-pearl/45 hover:text-pearl/70 transition-colors">Découvrir</Link>
          )}
          {!canInstall && (
            <button onClick={dismiss} className="block w-full mt-3 text-xs font-inter text-pearl/40 hover:text-pearl/65 transition-colors">Plus tard</button>
          )}

          {hint && (
            <p className="mt-4 text-[12px] font-inter text-pearl/50 leading-relaxed border-t border-white/10 pt-3">
              Ajoutez Citadelle à votre écran d&apos;accueil depuis le menu de votre navigateur.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
