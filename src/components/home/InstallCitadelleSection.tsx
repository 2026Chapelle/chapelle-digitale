'use client'
/**
 * Section « Installer Citadelle » (V2.7-A) — présente Citadelle comme application
 * installable. Utilise le prompt PWA si disponible, sinon affiche une aide manuelle.
 */
import { useState } from 'react'
import { Download, Smartphone, Zap, BookOpen, Heart, Bell, Check } from 'lucide-react'
import { usePwaInstall } from '@/components/home/pwa-install'

const BENEFITS = [
  { icon: Zap, label: 'Accès rapide aux cultes' },
  { icon: BookOpen, label: 'Parcours spirituels à portée de main' },
  { icon: Heart, label: 'Formations et prières plus faciles à suivre' },
  { icon: Smartphone, label: "Expérience proche d'une application mobile" },
  { icon: Bell, label: 'Préparation aux rappels pastoraux' },
]

export function InstallCitadelleSection() {
  const { canInstall, installed, promptInstall } = usePwaInstall()
  const [hint, setHint] = useState(false)

  async function onInstall() {
    if (canInstall) await promptInstall()
    else setHint(true)
  }

  return (
    <section className="py-20 sm:py-24">
      <div className="container-royal">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-inter mb-4" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
              <Smartphone className="w-3.5 h-3.5" /> Application
            </div>
            <h2 className="font-cinzel font-bold text-2xl sm:text-3xl leading-tight mb-4">
              Installez <span className="text-cinematic-gold">Citadelle</span> sur votre téléphone
            </h2>
            <p className="font-inter text-pearl/70 leading-relaxed mb-6 max-w-lg">
              Ajoutez Citadelle à votre écran d&apos;accueil et accédez plus rapidement aux cultes, aux prières, aux formations, aux événements et à votre espace membre.
            </p>
            <ul className="space-y-2.5 mb-7">
              {BENEFITS.map((b) => (
                <li key={b.label} className="flex items-center gap-3 font-inter text-sm text-pearl/80">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <b.icon className="w-3.5 h-3.5 text-gold" />
                  </span>
                  {b.label}
                </li>
              ))}
            </ul>
            {installed ? (
              <p className="inline-flex items-center gap-2 text-sm font-inter text-[#86EFAC]"><Check className="w-4 h-4" /> Citadelle est installée sur cet appareil.</p>
            ) : (
              <button onClick={onInstall} className="btn-gold text-sm px-6 py-3 inline-flex items-center gap-2 font-semibold">
                <Download className="w-4 h-4" /> Installer Citadelle
              </button>
            )}
            {hint && !installed && (
              <p className="mt-4 text-[13px] font-inter text-pearl/55 leading-relaxed max-w-lg">
                Ajoutez Citadelle à votre écran d&apos;accueil depuis le menu de votre navigateur (« Ajouter à l&apos;écran d&apos;accueil »).
              </p>
            )}
          </div>

          {/* Aperçu premium type téléphone */}
          <div className="flex justify-center">
            <div className="relative w-[220px] h-[440px] rounded-[2.2rem] border border-white/10 p-3 shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
              style={{ background: 'linear-gradient(180deg, #0d0918 0%, #060409 100%)' }}>
              <div className="absolute left-1/2 -translate-x-1/2 top-2 w-16 h-1.5 rounded-full bg-white/15" />
              <div className="mt-5 h-full rounded-[1.6rem] overflow-hidden flex flex-col items-center justify-center text-center px-5"
                style={{ background: 'radial-gradient(400px 240px at 50% 15%, rgba(212,175,55,0.18), transparent 60%), linear-gradient(180deg, #0b0713, #050308)' }}>
                <div className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                  <span className="font-cinzel text-gold text-xl">C</span>
                </div>
                <p className="font-cinzel text-pearl text-sm font-bold">Citadelle</p>
                <p className="font-inter text-[11px] text-pearl/45 mt-1">La Chapelle · dans votre poche</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
