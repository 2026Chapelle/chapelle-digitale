'use client'
/**
 * SCÈNE 1 — HERO (Citadelle Experience OS V3)
 * Affiche 100vh : photo réelle, voile, logo, titre, sous-titre, 1 CTA, 1 lien.
 * Sans badges, chips, stats, rotation, distractions.
 */
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { events } from '@/lib/analytics'

const EASE = [0.16, 1, 0.3, 1] as const

/** Photographie réelle locale (prière / adoration). */
const HERO_PHOTO = {
  src: '/images/prayers/prayer-consecration.jpg',
  alt: 'Moment de consécration et de prière dans la maison',
}

export function HeroSection({
  block,
}: {
  block?: { subtitle?: string; cta_label?: string; cta_href?: string }
} = {}) {
  const reduce = useReducedMotion()
  const primaryHref = block?.cta_href || '/rejoindre'
  const primaryLabel = block?.cta_label || 'Commencer mon parcours'

  const scrollToDiscover = () => {
    const el = document.getElementById('decouvrir-citadelle')
    const behavior: ScrollBehavior =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth'
    if (el) {
      el.scrollIntoView({ behavior, block: 'start' })
      return
    }
    window.scrollTo({ top: window.innerHeight - 64, behavior })
  }

  return (
    <section
      className="relative h-[100svh] min-h-[100svh] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#06060A' }}
      aria-label="Accueil Citadelle"
    >
      {/* Photographie plein écran */}
      <div className="absolute inset-0" aria-hidden>
        <Image
          src={HERO_PHOTO.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          quality={85}
        />
        {/* Voile sombre lisible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,6,10,0.55) 0%, rgba(6,6,10,0.62) 45%, rgba(6,6,10,0.88) 100%), radial-gradient(ellipse 70% 55% at 50% 40%, transparent 0%, rgba(6,6,10,0.55) 100%)',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto px-6 sm:px-8 pt-24 pb-20 flex flex-col items-center text-center">
        {/* Logo discret */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="mb-10"
        >
          <Image
            src="/images/logo-mark.png"
            alt="Citadelle"
            width={48}
            height={48}
            priority
            className="opacity-90 mx-auto drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          />
        </motion.div>

        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: reduce ? 0 : 0.08, ease: EASE }}
          className="mb-6"
        >
          <span
            className="block font-cinzel font-black"
            style={{
              fontSize: 'clamp(2.35rem, 6.5vw, 4.6rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: '#F7F4EE',
              textShadow: '0 4px 48px rgba(0,0,0,0.45)',
            }}
          >
            Grandis en Christ.
          </span>
          <span
            className="block font-cinzel font-black text-gradient-light-gold mt-2"
            style={{
              fontSize: 'clamp(2.35rem, 6.5vw, 4.6rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            Un pas après l&apos;autre.
          </span>
        </motion.h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, delay: reduce ? 0 : 0.22, ease: EASE }}
          className="font-inter leading-relaxed mb-12 mx-auto"
          style={{
            fontSize: 'clamp(0.98rem, 1.6vw, 1.12rem)',
            color: 'rgba(235,231,221,0.55)',
            maxWidth: '28rem',
          }}
        >
          {block?.subtitle ||
            'Découvre un chemin clair pour grandir, être accompagné et trouver ta place dans une communauté vivante.'}
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: reduce ? 0 : 0.36, ease: EASE }}
          className="flex flex-col items-center gap-5 w-full sm:w-auto"
        >
          <Link
            href={primaryHref}
            onClick={() => events.ctaClick('commencer_parcours_hero')}
            className="btn-gold-cinematic group w-full sm:w-auto"
            style={{ padding: '17px 40px', fontSize: '0.95rem' }}
          >
            {primaryLabel}
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>

          <button
            type="button"
            onClick={() => {
              events.ctaClick('decouvrir_citadelle_hero')
              scrollToDiscover()
            }}
            className="text-sm font-inter tracking-wide py-2 px-2 transition-colors hover:text-gold-light"
            style={{ color: 'rgba(235,231,221,0.42)' }}
          >
            Découvrir Citadelle
          </button>
        </motion.div>
      </div>

      {/* Transition bas de scène */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, #06060A)' }}
        aria-hidden
      />
    </section>
  )
}
