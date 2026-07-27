'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import {
  OPENING_DATE_LABEL,
  OPENING_TZ_LABEL,
  OUVERTURE_ROUTES,
  heroCtaLabel,
  isOpen as computeIsOpen,
  primaryCtaHref,
  type Countdown,
  type OpeningVideo as OpeningVideoSource,
} from '@/lib/ouverture'
import { events } from '@/lib/analytics'
import { OpeningCountdown } from './OpeningCountdown'
import { OpeningVideo } from './OpeningVideo'
import { GoldenSparkles } from './GoldenSparkles'

/* ============================================================
   PAGE FESTIVE D'ENTRÉE — /ouverture
   ------------------------------------------------------------
   Un seul écran porte l'essentiel : titre, date, VIDÉO et CTA.
   - dès `lg`, deux colonnes (texte | vidéo) : c'est ce qui permet de tenir
     l'ensemble au-dessus de la ligne de flottaison sur desktop ;
   - en dessous, empilement dans l'ordre titre → vidéo → CTA (`order-*`), et
     la hauteur de la vidéo est plafonnée en `svh` pour que les CTA restent
     visibles sans défilement, y compris sur un écran court.

   Le récit long (vision, promesses, étapes, verset) vit sur
   /ouverture/vision, atteint par le CTA « Découvrir la vision ».

   Ambiance : nuit royale + étincelles dorées animées (canvas plafonné,
   coupé sous prefers-reduced-motion — voir GoldenSparkles).
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1] as const

export default function EntreeContent({
  initialOpen,
  initialCountdown,
  video,
}: {
  initialOpen: boolean
  initialCountdown: Countdown
  video: OpeningVideoSource | null
}) {
  const reduce = useReducedMotion()

  /* Même stratégie anti-hydratation que la landing détaillée : l'état est
     calculé sur le serveur, repris tel quel au premier rendu client, puis
     corrigé à la seconde par l'effet. */
  const [open, setOpen] = useState(initialOpen)
  useEffect(() => {
    const tick = () => setOpen(computeIsOpen(Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const ctaHref = primaryCtaHref()
  const appear = (delay: number) =>
    reduce
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: EASE },
        }

  return (
    <div
      className="relative overflow-x-hidden"
      style={{
        background:
          'linear-gradient(180deg, #050816 0%, #0B1023 40%, #111936 70%, #050816 100%)',
        color: '#C7CEDB',
      }}
    >
      {/* ══════════ DÉCOR FESTIF ══════════ */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[16%] left-1/2 h-[680px] w-[170vw] -translate-x-1/2 md:w-[1250px]"
          style={{
            background:
              'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(240,220,174,0.14) 0%, rgba(212,175,110,0.05) 36%, transparent 70%)',
          }}
        />
        <div
          className="absolute left-1/2 top-[2%] h-[440px] w-[92vw] -translate-x-1/2 md:w-[760px]"
          style={{
            background:
              'radial-gradient(ellipse 50% 50% at 50% 0%, rgba(255,140,0,0.10) 0%, transparent 62%)',
          }}
        />
        <GoldenSparkles className="absolute inset-0" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 65% at 50% 45%, transparent 0%, rgba(5,8,22,0.30) 76%, rgba(5,8,22,0.62) 100%)',
          }}
        />
      </div>

      {/* ══════════ PREMIER ÉCRAN ══════════ */}
      <section
        className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 pb-8 pt-20 sm:px-6 md:pt-24"
        aria-labelledby="entree-titre"
      >
        <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-y-5 text-center sm:gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-x-12 lg:text-left">
          {/* ─── Bloc texte ─── */}
          <motion.div
            {...appear(0)}
            className="order-1 flex flex-col items-center lg:items-start"
          >
            <p
              className="mb-4 inline-flex items-center gap-2.5 rounded-full px-4 py-2 font-inter font-bold uppercase"
              style={{
                fontSize: 'clamp(0.58rem, 1.8vw, 0.7rem)',
                letterSpacing: '0.28em',
                color: '#F0DCAE',
                background: 'rgba(212,175,110,0.09)',
                border: '1px solid rgba(212,175,110,0.3)',
              }}
            >
              <Sparkles className="h-3 w-3" style={{ color: '#FF8C00' }} aria-hidden />
              Ouverture publique
            </p>

            <h1
              id="entree-titre"
              className="font-cinzel font-black uppercase"
              style={{
                // Bornée aussi par la hauteur d'écran : sur un écran court, le
                // titre cède la place à la vidéo et aux CTA.
                fontSize: 'clamp(1.9rem, min(6.6vw, 6.4svh), 3.9rem)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              <span className="block" style={{ color: '#FFFFFF' }}>
                La Citadelle
              </span>
              <span
                className="mt-1 block"
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F0DCAE 42%, #D4AF6E 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                ouvre ses portes
              </span>
            </h1>

            <p
              className="mt-4 font-cinzel font-bold uppercase"
              style={{
                fontSize: 'clamp(0.74rem, 2.3vw, 0.98rem)',
                letterSpacing: '0.15em',
                color: '#F0DCAE',
              }}
            >
              {OPENING_DATE_LABEL}
            </p>
            <p
              className="mt-1.5 font-inter"
              style={{
                fontSize: 'clamp(0.64rem, 1.8vw, 0.74rem)',
                letterSpacing: '0.14em',
                color: 'rgba(199,206,219,0.6)',
              }}
            >
              {OPENING_TZ_LABEL}
            </p>
          </motion.div>

          {/* ─── Vidéo — au premier écran ─── */}
          <motion.div
            {...appear(0.2)}
            className="order-2 mx-auto w-full lg:row-span-2"
            style={{
              // Hauteur plafonnée en `svh` (ratio 16/9) : garantit que les CTA
              // restent au-dessus de la ligne de flottaison sur écran court.
              maxWidth: 'min(100%, 44rem, calc(42svh * 16 / 9))',
            }}
          >
            <OpeningVideo source={video} />
          </motion.div>

          {/* ─── CTA — au premier écran ─── */}
          <motion.div
            {...appear(0.32)}
            className="order-3 flex flex-col items-center gap-3 lg:items-start"
          >
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href={ctaHref}
                onClick={() => events.ctaClick('ouverture_entree_primary')}
                className="btn-gold-cinematic group w-full sm:w-auto"
                style={{ padding: '15px 34px', fontSize: '0.94rem' }}
              >
                {heroCtaLabel(open)}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>

              <Link
                href={OUVERTURE_ROUTES.vision}
                onClick={() => events.ctaClick('ouverture_entree_vision')}
                className="btn-glass-cinematic w-full sm:w-auto"
              >
                Découvrir la vision
              </Link>
            </div>

            <Link
              href={`${OUVERTURE_ROUTES.connexion}?redirect=${encodeURIComponent(OUVERTURE_ROUTES.espaceMembre)}`}
              onClick={() => events.ctaClick('ouverture_entree_login')}
              className="font-inter underline-offset-4 hover:underline"
              style={{ fontSize: 'clamp(0.8rem, 2vw, 0.88rem)', color: 'rgba(199,206,219,0.72)' }}
            >
              J’ai déjà un compte
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════ COMPTE À REBOURS ══════════ */}
      <section
        className="relative px-4 pb-24 pt-2 sm:px-6 md:pb-32"
        aria-label="Compte à rebours avant l’ouverture"
      >
        <div className="relative z-10 mx-auto max-w-4xl">
          <OpeningCountdown initial={initialCountdown} />
        </div>
      </section>
    </div>
  )
}
