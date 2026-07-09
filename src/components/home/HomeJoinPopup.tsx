'use client'
/**
 * Popup d'accueil première visite (V2.7-A). S'ouvre après 5 s, une seule fois
 * (mémorisé dans localStorage). Fermeture par bouton, clic overlay ou Échap.
 * CTA « Installer Citadelle » via PWA si disponible, sinon aide manuelle douce.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X, Sparkles, Download, ArrowRight } from 'lucide-react'
import { usePwaInstall } from '@/components/home/pwa-install'

const STORAGE_KEY = 'citadelle_home_join_popup_seen_v27'

export function HomeJoinPopup() {
  const [open, setOpen] = useState(false)
  const [installHint, setInstallHint] = useState(false)
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

  async function onInstall() {
    if (canInstall) { await promptInstall(); dismiss() }
    else setInstallHint(true)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="home-popup-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-gold/20 shadow-[0_30px_90px_rgba(0,0,0,0.7)]"
        style={{ background: 'radial-gradient(900px 400px at 50% -10%, rgba(212,175,55,0.14), transparent 60%), linear-gradient(180deg, #0b0713 0%, #050308 100%)' }}>
        <button ref={closeRef} onClick={dismiss} aria-label="Fermer" className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-pearl/60 hover:text-pearl hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-inter mb-4" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
            <Sparkles className="w-3.5 h-3.5" /> Bienvenue
          </div>
          <h2 id="home-popup-title" className="font-cinzel font-bold text-pearl text-xl leading-tight mb-3">Bienvenue à La Citadelle</h2>
          <p className="font-inter text-sm text-pearl/70 leading-relaxed mb-6">
            Et si cette visite était le début d&apos;un nouveau parcours spirituel ? La Chapelle Internationale des Élus du Royaume vous accueille comme une famille, avec des temps de prière, d&apos;enseignement, de communion et d&apos;accompagnement pastoral.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link href="/rejoindre" onClick={dismiss} className="btn-gold text-sm px-4 py-3 inline-flex items-center justify-center gap-2 font-semibold">
              Je veux faire partie de la Chapelle <ArrowRight className="w-4 h-4" />
            </Link>
            {!installed && (
              <button onClick={onInstall} className="text-sm font-inter px-4 py-3 rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#F5E6D8', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Download className="w-4 h-4" /> Installer Citadelle
              </button>
            )}
            <button onClick={dismiss} className="text-xs font-inter text-pearl/45 hover:text-pearl/70 py-2 transition-colors">Plus tard</button>
          </div>
          {installHint && (
            <p className="mt-4 text-[12px] font-inter text-pearl/50 leading-relaxed border-t border-white/10 pt-3">
              Ajoutez Citadelle à votre écran d&apos;accueil depuis le menu de votre navigateur (« Ajouter à l&apos;écran d&apos;accueil »).
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
