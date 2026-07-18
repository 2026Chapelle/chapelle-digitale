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
    <section className="py-8 sm:py-10">
      <div className="container-royal">
        <div
          className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-2xl border border-gold/20 px-5 py-5 sm:px-7"
          style={{ background: 'radial-gradient(600px 200px at 0% 0%, rgba(212,175,55,0.10), transparent 60%), linear-gradient(180deg, rgba(13,9,24,0.92), rgba(6,4,9,0.92))' }}
        >
          <span
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}
          >
            <Smartphone className="w-5 h-5 text-gold" />
          </span>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-cinzel font-bold text-lg text-pearl leading-tight">Emporte Citadelle partout avec toi</h2>
            <p className="font-inter text-sm text-pearl/60 mt-0.5">
              Accède à tes parcours, tes enseignements et ta communauté depuis ton téléphone.
            </p>
          </div>

          {installed ? (
            <p className="inline-flex items-center gap-2 text-sm font-inter text-[#86EFAC] flex-shrink-0">
              <Check className="w-4 h-4" /> Citadelle est installée
            </p>
          ) : (
            <button
              onClick={onInstall}
              className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-2 font-semibold flex-shrink-0"
            >
              <Download className="w-4 h-4" /> Installer l&apos;app
            </button>
          )}
        </div>

        {hint && !installed && (
          <p className="mt-3 text-[13px] font-inter text-pearl/55 leading-relaxed text-center sm:text-left max-w-2xl mx-auto sm:mx-0">
            {hint}
          </p>
        )}
      </div>
    </section>
  )
}
