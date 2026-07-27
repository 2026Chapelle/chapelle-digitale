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
   PAGE D'ENTRÉE IMMERSIVE — /ouverture
   ------------------------------------------------------------
   Un écran unique, sans header ni footer : la route vit hors du groupe
   `(public)` (le chrome n'est rendu qu'à la sous-route « vision », via
   src/app/ouverture/vision/layout.tsx).

   Tenir sur un écran, sans défilement, de 1440×900 à 320×568 :
   - conteneur exactement `100svh` — jamais `100vh`, qui inclut la barre
     d'URL rétractable et rendrait le corps plus haut que le viewport ;
   - toutes les tailles bornées à la fois par la largeur ET la hauteur, via
     `clamp(min, min(vw, svh), max)` : sur un écran bas c'est la hauteur qui
     commande, sans jamais descendre sous le minimum lisible ;
   - hauteur de la vidéo plafonnée en `svh`, donc les CTA ne peuvent pas être
     repoussés sous la ligne de flottaison ;
   - le compte à rebours, seul élément déclaré optionnel, s'efface sous
     620 px de hauteur (règle portée par la page, cf. IMMERSIVE_CSS) ;
   - marges de sécurité `env(safe-area-inset-*)` pour les encoches iOS.

   Aucun `overflow: hidden` n'est posé sur le conteneur : masquer un
   débordement ne le supprimerait pas (`scrollHeight` resterait supérieur à
   `clientHeight`) et risquerait de rendre du contenu inatteignable. Le
   contenu tient réellement dans l'écran.
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

  /* Anti-hydratation : état calculé sur le serveur, repris tel quel au premier
     rendu client, puis corrigé à la seconde par l'effet. */
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
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        }

  return (
    <div
      className="relative flex w-full flex-col overflow-x-hidden"
      style={{
        height: '100svh',
        paddingTop: 'max(env(safe-area-inset-top), 0.75rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        background:
          'linear-gradient(180deg, #050816 0%, #0B1023 45%, #111936 75%, #050816 100%)',
        color: '#C7CEDB',
      }}
    >
      {/* ══════════ DÉCOR FESTIF ══════════ */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[18%] left-1/2 h-[70svh] w-[170vw] -translate-x-1/2 md:w-[1250px]"
          style={{
            background:
              'radial-gradient(ellipse 60% 55% at 50% 0%, rgba(240,220,174,0.15) 0%, rgba(212,175,110,0.05) 36%, transparent 70%)',
          }}
        />
        <div
          className="absolute left-1/2 top-0 h-[46svh] w-[92vw] -translate-x-1/2 md:w-[760px]"
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
              'radial-gradient(ellipse 82% 68% at 50% 46%, transparent 0%, rgba(5,8,22,0.28) 78%, rgba(5,8,22,0.6) 100%)',
          }}
        />
      </div>

      {/* ══════════ CONTENU — ÉCRAN UNIQUE ══════════ */}
      <section
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-[clamp(0.5rem,1.6svh,1.25rem)]"
        aria-labelledby="entree-titre"
      >
        <div className="grid w-full grid-cols-1 items-center gap-x-10 gap-y-[clamp(0.5rem,1.6svh,1.25rem)] text-center lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:text-left">
          {/* ─── Bloc texte ─── */}
          <motion.div
            {...appear(0)}
            className="order-1 flex flex-col items-center lg:items-start"
          >
            <p
              className="inline-flex items-center gap-2 rounded-full font-inter font-bold uppercase"
              style={{
                padding: 'clamp(0.25rem, 0.7svh, 0.45rem) clamp(0.7rem, 2.5vw, 1rem)',
                fontSize: 'clamp(0.63rem, min(2.4vw, 1.3svh), 0.7rem)',
                letterSpacing: '0.26em',
                color: '#F0DCAE',
                background: 'rgba(212,175,110,0.09)',
                border: '1px solid rgba(212,175,110,0.3)',
              }}
            >
              <Sparkles
                className="h-[1em] w-[1em] shrink-0"
                style={{ color: '#FF8C00' }}
                aria-hidden
              />
              Ouverture publique
            </p>

            <h1
              id="entree-titre"
              className="mt-[clamp(0.5rem,1.5svh,1rem)] font-cinzel font-black uppercase"
              style={{
                // Bornée par la largeur ET la hauteur : sur écran bas, c'est
                // `svh` qui commande, sans passer sous 1,35 rem (lisibilité).
                fontSize: 'clamp(1.35rem, min(6.6vw, 5.2svh), 3.5rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.02em',
              }}
            >
              <span className="block" style={{ color: '#FFFFFF' }}>
                La Citadelle
              </span>
              <span
                className="block"
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
              className="mt-[clamp(0.45rem,1.4svh,0.9rem)] font-cinzel font-bold uppercase"
              style={{
                fontSize: 'clamp(0.75rem, min(2.5vw, 1.7svh), 0.98rem)',
                letterSpacing: '0.14em',
                color: '#F0DCAE',
              }}
            >
              {OPENING_DATE_LABEL}
            </p>
            <p
              className="mt-1 font-inter"
              style={{
                fontSize: 'clamp(0.64rem, min(2vw, 1.3svh), 0.76rem)',
                letterSpacing: '0.13em',
                color: 'rgba(199,206,219,0.62)',
              }}
            >
              {OPENING_TZ_LABEL}
            </p>
          </motion.div>

          {/* ─── Vidéo ─── */}
          <motion.div
            {...appear(0.16)}
            className="order-2 mx-auto w-full lg:row-span-2"
            style={{
              // Hauteur plafonnée (ratio 16/9) : c'est la garantie que les CTA
              // restent visibles, quelle que soit la hauteur d'écran.
              maxWidth: 'min(100%, 40rem, calc(34svh * 16 / 9))',
            }}
          >
            <OpeningVideo source={video} />
          </motion.div>

          {/* ─── CTA + connexion ─── */}
          <motion.div
            {...appear(0.26)}
            className="order-3 flex flex-col items-center gap-[clamp(0.4rem,1.2svh,0.75rem)] lg:items-start"
          >
            <div className="flex w-full flex-col items-center gap-[clamp(0.4rem,1.2svh,0.75rem)] sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href={ctaHref}
                onClick={() => events.ctaClick('ouverture_entree_primary')}
                className="btn-gold-cinematic group w-full sm:w-auto"
                style={{
                  padding: 'clamp(0.6rem, 1.5svh, 0.95rem) clamp(1.4rem, 5vw, 2.2rem)',
                  fontSize: 'clamp(0.81rem, min(2.7vw, 1.7svh), 0.94rem)',
                }}
              >
                {heroCtaLabel(open)}
                <ArrowRight className="h-[1.1em] w-[1.1em] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>

              <Link
                href={OUVERTURE_ROUTES.vision}
                onClick={() => events.ctaClick('ouverture_entree_vision')}
                className="btn-glass-cinematic w-full sm:w-auto"
                style={{
                  padding: 'clamp(0.55rem, 1.4svh, 0.9rem) clamp(1.2rem, 4vw, 1.9rem)',
                  fontSize: 'clamp(0.81rem, min(2.7vw, 1.7svh), 0.92rem)',
                }}
              >
                Découvrir la vision
              </Link>
            </div>

            <Link
              href={`${OUVERTURE_ROUTES.connexion}?redirect=${encodeURIComponent(OUVERTURE_ROUTES.espaceMembre)}`}
              onClick={() => events.ctaClick('ouverture_entree_login')}
              className="font-inter underline-offset-4 hover:underline"
              style={{
                fontSize: 'clamp(0.76rem, min(2.3vw, 1.5svh), 0.86rem)',
                color: 'rgba(199,206,219,0.72)',
              }}
            >
              J’ai déjà un compte
            </Link>
          </motion.div>
        </div>

        {/* ─── Compte à rebours compact (masqué sous 620 px de hauteur) ─── */}
        <motion.div {...appear(0.34)} data-ouverture-compte-a-rebours className="w-full">
          <OpeningCountdown initial={initialCountdown} compact />
        </motion.div>
      </section>
    </div>
  )
}
