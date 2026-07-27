'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { countdownTo, primaryCtaHref, type Countdown } from '@/lib/ouverture'
import { events } from '@/lib/analytics'

/* ============================================================
   COMPTE À REBOURS — Ouverture du 09 août 2026, 00H00 Abidjan
   ------------------------------------------------------------
   Hydratation : la valeur initiale est calculée sur le serveur puis passée en
   prop. Le premier rendu client est donc STRICTEMENT identique au HTML serveur
   (aucun mismatch), et l'intervalle prend le relais à la seconde suivante.
   CLS : les tuiles ont une largeur minimale fixe + chiffres tabulaires, la
   mise en page ne bouge pas quand les valeurs changent.
   ============================================================ */

const UNITS: { key: keyof Omit<Countdown, 'done'>; label: string }[] = [
  { key: 'days', label: 'Jours' },
  { key: 'hours', label: 'Heures' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Secondes' },
]

export function OpeningCountdown({
  initial,
  compact = false,
}: {
  initial: Countdown
  /**
   * Variante compacte : une seule ligne « 12 J · 15 H · 46 M · 36 S », sans
   * tuiles ni fond. Utilisée par la page d'entrée immersive, où chaque pixel
   * de hauteur compte pour tenir sur un écran unique.
   */
  compact?: boolean
}) {
  const reduce = useReducedMotion()
  const [cd, setCd] = useState<Countdown>(initial)

  useEffect(() => {
    const tick = () => setCd(countdownTo(Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const ariaLabel = `Ouverture dans ${cd.days} jours, ${cd.hours} heures, ${cd.minutes} minutes et ${cd.seconds} secondes`

  /* ── Variante compacte ─────────────────────────────────────── */
  if (compact) {
    if (cd.done) {
      return (
        <p
          className="text-center font-cinzel font-bold uppercase"
          style={{
            fontSize: 'clamp(0.72rem, 2.4vw, 0.95rem)',
            letterSpacing: '0.16em',
            color: '#F0DCAE',
          }}
        >
          Les portes sont ouvertes
        </p>
      )
    }

    const parts: [number, string][] = [
      [cd.days, 'J'],
      [cd.hours, 'H'],
      [cd.minutes, 'M'],
      [cd.seconds, 'S'],
    ]

    return (
      <div
        role="timer"
        aria-live="off"
        aria-label={ariaLabel}
        className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 sm:gap-x-5"
      >
        {parts.map(([value, unit], i) => (
          <span key={unit} className="inline-flex items-baseline gap-2" aria-hidden>
            {i > 0 && (
              <span
                className="mr-1 inline-block h-1 w-1 rounded-full align-middle"
                style={{ background: 'rgba(212,175,110,0.5)' }}
              />
            )}
            <span
              className="font-cinzel font-black tabular-nums"
              style={{
                fontSize: 'clamp(1rem, 3.4vw, 1.45rem)',
                lineHeight: 1,
                color: '#FFFFFF',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {i === 0 ? value : String(value).padStart(2, '0')}
            </span>
            <span
              className="font-inter font-semibold uppercase"
              style={{
                fontSize: 'clamp(0.55rem, 1.6vw, 0.68rem)',
                letterSpacing: '0.18em',
                color: 'rgba(199,206,219,0.62)',
              }}
            >
              {unit}
            </span>
          </span>
        ))}
      </div>
    )
  }

  /* ── Variante complète (page /ouverture/vision) ────────────── */
  if (cd.done) {
    return (
      <div className="flex flex-col items-center text-center">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-cinzel font-black uppercase"
          style={{
            fontSize: 'clamp(1.6rem, 5.2vw, 3.1rem)',
            lineHeight: 1.05,
            letterSpacing: '0.01em',
            color: '#FFFFFF',
          }}
        >
          Les portes sont ouvertes
        </motion.p>

        <p
          className="mt-4 font-inter max-w-lg"
          style={{ fontSize: 'clamp(0.95rem, 2vw, 1.05rem)', color: '#C7CEDB', lineHeight: 1.7 }}
        >
          La Citadelle est accessible. Crée ton compte et commence ton parcours dès maintenant.
        </p>

        <Link
          href={primaryCtaHref()}
          onClick={() => events.ctaClick('ouverture_countdown_open')}
          className="btn-gold-cinematic group mt-8"
          style={{ padding: '15px 34px' }}
        >
          Entrer dans La Citadelle
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    )
  }

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={ariaLabel}
      /* Grille à 4 colonnes : les tuiles tiennent toujours sur une seule ligne,
         même à 320 px, et gardent des largeurs égales. */
      className="mx-auto grid w-full max-w-md grid-cols-4 gap-2 sm:max-w-xl sm:gap-4"
    >
      {UNITS.map(({ key, label }) => (
        <div
          key={key}
          className="flex min-w-0 flex-col items-center rounded-2xl px-1.5 py-4 sm:px-4 sm:py-5"
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(212,175,110,0.18)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <span
            aria-hidden
            className="font-cinzel font-black tabular-nums"
            style={{
              fontSize: 'clamp(1.6rem, 6vw, 3rem)',
              lineHeight: 1,
              color: '#FFFFFF',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {key === 'days' ? cd[key] : String(cd[key]).padStart(2, '0')}
          </span>
          <span
            aria-hidden
            className="mt-2 font-inter uppercase"
            style={{
              fontSize: 'clamp(0.5rem, 1.9vw, 0.66rem)',
              // Interlettrage resserré sur petits écrans pour que « SECONDES »
              // tienne dans sa colonne sans jamais tronquer ni déborder.
              letterSpacing: 'clamp(0.04em, 0.5vw, 0.22em)',
              color: 'rgba(199,206,219,0.65)',
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
