'use client'
/**
 * SCÈNE 1 — HERO (blueprint V3 — référence unique)
 *
 * 100vh · photo réelle plein écran · voile sombre léger · logo discret
 * titre · sous-titre · CTA principal · lien secondaire
 * Sans badges, chips, stats, éléments rotatifs, distractions.
 */
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { events } from '@/lib/analytics'

const EASE = [0.16, 1, 0.3, 1] as const

/** Photographie réelle locale (public/). */
const HERO_PHOTO = {
  src: '/images/prayers/prayer-consecration.jpg',
  alt: 'Moment de consécration et de prière',
}

/** Copy blueprint — non négociable. */
const COPY = {
  titleLine1: 'Grandis en Christ.',
  titleLine2: "Un pas après l'autre.",
  subtitle:
    'Découvre un chemin clair pour grandir, être accompagné et trouver ta place dans une communauté vivante.',
  ctaLabel: 'Commencer mon parcours',
  ctaHref: '/rejoindre',
  secondaryLabel: 'Découvrir Citadelle',
  secondaryHref: '#decouvrir-citadelle',
} as const

export function HeroSection(_props: { block?: unknown } = {}) {
  const reduce = useReducedMotion()

  return (
    <section
      className="relative h-[100svh] min-h-[100vh] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#06060A' }}
      aria-labelledby="hero-title"
    >
      {/* Photographie plein écran + voile sombre léger */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src={HERO_PHOTO.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          quality={85}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,6,10,0.42) 0%, rgba(6,6,10,0.52) 48%, rgba(6,6,10,0.78) 100%), radial-gradient(ellipse 75% 60% at 50% 42%, transparent 0%, rgba(6,6,10,0.4) 100%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto px-5 sm:px-8 pt-28 pb-16 flex flex-col items-center text-center">
        {/* Logo discret */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE }}
          className="mb-9"
        >
          <Image
            src="/images/logo-mark.png"
            alt="Citadelle"
            width={44}
            height={44}
            priority
            className="mx-auto opacity-85"
          />
        </motion.div>

        <motion.h1
          id="hero-title"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: reduce ? 0 : 0.06, ease: EASE }}
          className="mb-6"
        >
          <span
            className="block font-cinzel font-black"
            style={{
              fontSize: 'clamp(2.15rem, 6.2vw, 4.5rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: '#F7F4EE',
              textShadow: '0 4px 40px rgba(0,0,0,0.4)',
            }}
          >
            {COPY.titleLine1}
          </span>
          <span
            className="block font-cinzel font-black text-gradient-light-gold mt-2"
            style={{
              fontSize: 'clamp(2.15rem, 6.2vw, 4.5rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            {COPY.titleLine2}
          </span>
        </motion.h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: reduce ? 0 : 0.18, ease: EASE }}
          className="font-inter leading-relaxed mb-11 mx-auto"
          style={{
            fontSize: 'clamp(0.95rem, 1.55vw, 1.1rem)',
            color: 'rgba(235,231,221,0.58)',
            maxWidth: '28rem',
          }}
        >
          {COPY.subtitle}
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: reduce ? 0 : 0.3, ease: EASE }}
          className="flex flex-col items-center gap-5 w-full sm:w-auto"
        >
          <Link
            href={COPY.ctaHref}
            onClick={() => events.ctaClick('commencer_parcours_hero')}
            className="btn-gold-cinematic group w-full sm:w-auto justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
            style={{ padding: '17px 40px', fontSize: '0.95rem' }}
          >
            {COPY.ctaLabel}
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </Link>

          <Link
            href={COPY.secondaryHref}
            onClick={() => events.ctaClick('decouvrir_citadelle_hero')}
            className="text-sm font-inter tracking-wide py-2 px-3 transition-colors hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37] rounded-sm"
            style={{ color: 'rgba(235,231,221,0.45)' }}
          >
            {COPY.secondaryLabel}
          </Link>
        </motion.div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, #06060A)' }}
        aria-hidden="true"
      />
    </section>
  )
}
