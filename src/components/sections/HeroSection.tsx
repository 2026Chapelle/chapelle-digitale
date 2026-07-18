'use client'
/**
 * SCÈNE 1 — HERO · Art direction premium
 * Affiche cinématographique : titre iconique, lumière vivante, zéro distraction.
 */
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { events } from '@/lib/analytics'

/** Courbe unique homepage */
const EASE = [0.16, 1, 0.3, 1] as const
const DUR = 0.9

const HERO_PHOTO = {
  src: '/images/prayers/prayer-consecration.jpg',
  alt: 'Moment de consécration et de prière',
}

const COPY = {
  titleLine1: 'Grandis en Christ.',
  titleLine2: "Un pas après l'autre.",
  subtitle: 'Un chemin clair pour grandir et trouver ta place.',
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
      {/* Photographie + color grading ciné */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src={HERO_PHOTO.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-[1.03]"
          quality={90}
          style={{
            filter: 'contrast(1.08) saturate(0.88) brightness(0.92)',
          }}
        />
        {/* Voile + grading (nuit / or) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,8,16,0.55) 0%, rgba(8,10,18,0.45) 40%, rgba(6,6,10,0.82) 100%), ' +
              'radial-gradient(ellipse 80% 55% at 50% 38%, transparent 0%, rgba(6,6,10,0.55) 100%), ' +
              'linear-gradient(120deg, rgba(30,58,138,0.12) 0%, transparent 45%, rgba(212,175,55,0.08) 100%)',
          }}
        />
        {/* Lumière vivante — uniquement la lumière, pas les composants */}
        {!reduce && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 55% 45% at 50% 28%, rgba(245,230,167,0.16) 0%, rgba(212,175,55,0.05) 42%, transparent 70%)',
            }}
            animate={{ opacity: [0.55, 0.85, 0.55], scale: [1, 1.04, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {reduce && (
          <div
            className="absolute inset-0 pointer-events-none opacity-70"
            style={{
              background:
                'radial-gradient(ellipse 55% 45% at 50% 28%, rgba(245,230,167,0.14) 0%, transparent 70%)',
            }}
          />
        )}
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-5 sm:px-8 pt-24 pb-20 flex flex-col items-center text-center">
        <motion.h1
          id="hero-title"
          initial={reduce ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR, ease: EASE }}
          className="mb-7 w-full max-w-[min(100%,42rem)] mx-auto overflow-hidden px-0"
        >
          {/* Une ligne chacune · largeur visuelle alignée · sans overflow 320 */}
          <span
            className="block font-cinzel font-black uppercase whitespace-nowrap"
            style={{
              fontSize: 'clamp(0.98rem, 4.4vw, 3.55rem)',
              lineHeight: 1.05,
              letterSpacing: 'clamp(0.005em, 0.28vw, 0.04em)',
              color: '#F7F4EE',
              textShadow: '0 6px 48px rgba(0,0,0,0.5)',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {COPY.titleLine1}
          </span>
          <span
            className="block font-cinzel font-black uppercase whitespace-nowrap mt-2 text-gradient-light-gold"
            style={{
              fontSize: 'clamp(0.98rem, 4.4vw, 3.55rem)',
              lineHeight: 1.05,
              letterSpacing: 'clamp(0.002em, 0.15vw, 0.018em)',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {COPY.titleLine2}
          </span>
        </motion.h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR, delay: reduce ? 0 : 0.12, ease: EASE }}
          className="font-inter leading-relaxed mb-12 mx-auto"
          style={{
            fontSize: 'clamp(0.95rem, 1.5vw, 1.08rem)',
            color: 'rgba(235,231,221,0.52)',
            maxWidth: '22rem',
          }}
        >
          {COPY.subtitle}
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR, delay: reduce ? 0 : 0.22, ease: EASE }}
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
            style={{ color: 'rgba(235,231,221,0.42)' }}
          >
            {COPY.secondaryLabel}
          </Link>
        </motion.div>
      </div>

      {/* Respiration vers le bandeau preuve */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 md:h-40 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, #06060A)' }}
        aria-hidden="true"
      />
    </section>
  )
}
