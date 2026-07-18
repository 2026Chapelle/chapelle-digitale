'use client'
/**
 * Bandeau « Installer Citadelle » (V2.7-A.4) — UNIQUE CTA d'installation de l'accueil.
 *
 * Compact (pas une grande section). Déclenche le prompt PWA natif si disponible
 * (`beforeinstallprompt` capté par usePwaInstall) ; sinon affiche une aide manuelle
 * adaptée à la plateforme. Aucun lien store, aucun APK, aucun window.location, aucun
 * téléchargement de fichier : le navigateur affiche sa fenêtre native, l'utilisateur confirme.
 */
import { useState } from 'react'
import { Download, Smartphone, Check } from 'lucide-react'
import { usePwaInstall } from '@/components/home/pwa-install'

/** Aide manuelle compacte quand le prompt natif n'est pas disponible. */
function installHint(): string {
  if (typeof navigator === 'undefined') {
    return 'Ajoutez Citadelle à votre écran d’accueil depuis le menu de votre navigateur.'
  }
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'Sur iPhone/iPad : appuyez sur Partager, puis « Sur l’écran d’accueil ».'
  }
  if (/Android/i.test(ua)) {
    return 'Sur Android : menu ⋮ puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».'
  }
  return 'Sur ordinateur : cliquez sur l’icône Installer dans la barre d’adresse (ou le menu ⋮) de Chrome/Edge.'
}

export function InstallCitadelleSection() {
  const { canInstall, installed, promptInstall } = usePwaInstall()
  const [hint, setHint] = useState<string | null>(null)

  async function onInstall() {
    // Prompt natif si disponible — rien d'autre. Sinon aide manuelle contextuelle.
    if (canInstall) { await promptInstall(); return }
    setHint(installHint())
  }

  return (
    <section className="py-14 sm:py-16" aria-labelledby="install-citadelle-title">
      <div className="container-royal">
        <div
          className="relative overflow-hidden rounded-3xl border border-gold/20 px-6 py-10 sm:px-10 sm:py-12 text-center sm:text-left"
          style={{
            background:
              'radial-gradient(700px 280px at 10% 0%, rgba(212,175,55,0.14), transparent 55%), radial-gradient(500px 240px at 90% 100%, rgba(75,0,130,0.12), transparent 50%), linear-gradient(165deg, rgba(13,9,24,0.98), rgba(6,4,9,0.96))',
          }}
        >
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            <div className="flex-1 max-w-xl">
              <p className="text-[11px] font-inter tracking-[0.32em] uppercase mb-4" style={{ color: 'rgba(235,217,160,0.5)' }}>
                Continuité
              </p>
              <h2 id="install-citadelle-title" className="font-cinzel font-bold text-2xl sm:text-3xl text-pearl leading-tight mb-4">
                Emporte Citadelle
                <span className="block text-cinematic-gold">avec toi.</span>
              </h2>
              <p className="font-inter text-sm sm:text-base leading-relaxed mb-8 max-w-sm" style={{ color: 'rgba(245,230,216,0.45)' }}>
                Ta maison spirituelle, à portée de main.
              </p>

              {installed ? (
                <p className="inline-flex items-center gap-2 text-sm font-inter text-[#86EFAC]">
                  <Check className="w-4 h-4" /> Citadelle est déjà installée sur cet appareil
                </p>
              ) : (
                <button
                  onClick={onInstall}
                  className="btn-gold text-sm px-6 py-3 inline-flex items-center gap-2 font-semibold"
                >
                  <Download className="w-4 h-4" /> Installer Citadelle
                </button>
              )}
              {hint && !installed && (
                <p className="mt-4 text-[13px] font-inter text-pearl/55 leading-relaxed max-w-lg">
                  {hint}
                </p>
              )}
            </div>

            <div
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-[1.75rem] flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(212,175,55,0.10)',
                border: '1px solid rgba(212,175,55,0.28)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 40px rgba(212,175,55,0.12)',
              }}
              aria-hidden
            >
              <Smartphone className="w-12 h-12 text-gold" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
