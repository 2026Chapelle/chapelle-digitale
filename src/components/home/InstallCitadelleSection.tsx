'use client'
/**
 * SCÈNE 8 — APPLICATION (PWA réelle)
 * Emporte Citadelle avec toi. Mécanisme d'installation réel uniquement.
 * Pas de faux stores, pas de fausses captures inventées.
 */
import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Download, Smartphone, Check, BookOpen, Bell, Heart } from 'lucide-react'
import { usePwaInstall } from '@/components/home/pwa-install'
import {
  HOME_VIEWPORT,
  HOME_DELAY,
  revealInitial,
  revealVisible,
  revealTransition,
} from '@/lib/home-motion'

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

const BENEFITS = [
  { icon: BookOpen, label: 'Parcours et enseignements à portée de main' },
  { icon: Bell, label: 'Accès rapide aux lives et rendez-vous' },
  { icon: Heart, label: 'Prière et communauté, où que tu sois' },
] as const

export function InstallCitadelleSection() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { canInstall, installed, promptInstall } = usePwaInstall()
  const [hint, setHint] = useState<string | null>(null)

  async function onInstall() {
    if (canInstall) {
      await promptInstall()
      return
    }
    setHint(installHint())
  }

  return (
    <section ref={ref} className="section-cinematic" aria-labelledby="install-citadelle-title">
      <div className="container-cinematic max-w-4xl">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-16 items-center">
          <div>
            <motion.h2
              id="install-citadelle-title"
              initial={revealInitial(reduce)}
              whileInView={revealVisible()}
              viewport={HOME_VIEWPORT}
              transition={revealTransition(reduce, HOME_DELAY.title)}
              className="font-cinzel font-bold text-2xl sm:text-3xl md:text-4xl text-pearl leading-tight mb-8"
            >
              Emporte Citadelle
              <span className="block text-cinematic-gold">avec toi.</span>
            </motion.h2>

            <motion.div
              initial={revealInitial(reduce, { y: 36 })}
              whileInView={revealVisible()}
              viewport={HOME_VIEWPORT}
              transition={revealTransition(reduce, HOME_DELAY.body)}
            >
              <ul className="space-y-3 mb-10 list-none m-0 p-0">
                {BENEFITS.map((b) => (
                  <li key={b.label} className="flex items-start gap-3">
                    <b.icon
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={{ color: 'rgba(212,175,55,0.75)' }}
                      strokeWidth={1.5}
                    />
                    <span className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.55)' }}>
                      {b.label}
                    </span>
                  </li>
                ))}
              </ul>

              {installed ? (
                <p className="inline-flex items-center gap-2 text-sm font-inter text-[#86EFAC]">
                  <Check className="w-4 h-4" /> Citadelle est déjà installée sur cet appareil
                </p>
              ) : (
                <button
                  type="button"
                  onClick={onInstall}
                  className="btn-gold text-sm px-6 py-3 inline-flex items-center gap-2 font-semibold"
                >
                  <Download className="w-4 h-4" /> Installer Citadelle
                </button>
              )}
              {hint && !installed && (
                <p className="mt-4 text-[13px] font-inter text-pearl/55 leading-relaxed max-w-lg">{hint}</p>
              )}
            </motion.div>
          </div>

          {/* Cadre téléphone stylisé — pas de fausse capture d'app store */}
          <motion.div
            className="flex justify-center"
            aria-hidden
            initial={revealInitial(reduce, { y: 40, scale: true })}
            whileInView={revealVisible({ scale: true })}
            viewport={HOME_VIEWPORT}
            transition={revealTransition(reduce, HOME_DELAY.card)}
          >
            <div
              className="relative w-[200px] h-[400px] rounded-[2rem] p-3 flex flex-col"
              style={{
                background: 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(15,23,42,0.4))',
                border: '1px solid rgba(244,241,233,0.12)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 40px rgba(212,175,55,0.08)',
              }}
            >
              <div
                className="flex-1 rounded-[1.5rem] flex flex-col items-center justify-center gap-4"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.12), transparent 55%), linear-gradient(180deg, #0A0B12, #06060A)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logo-mark.png"
                  alt=""
                  width={56}
                  height={56}
                  className="opacity-90"
                />
                <Smartphone className="w-8 h-8 text-gold/60" />
                <p
                  className="font-cinzel text-xs tracking-[0.2em] uppercase"
                  style={{ color: 'rgba(235,217,160,0.55)' }}
                >
                  Citadelle
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
