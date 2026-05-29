'use client'
import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Play, Users, Globe, Tv, ChevronDown, Sparkles, Radio } from 'lucide-react'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { HERO_IMAGES } from '@/lib/images'
import { events } from '@/lib/analytics'

const STATS = [
  { value: '127K', label: 'Membres actifs', icon: Users, color: '#D4AF37' },
  { value: '120+', label: 'Nations', icon: Globe, color: '#C4B5FD' },
  { value: '500+', label: 'Cultes en direct', icon: Tv, color: '#86EFAC' },
]

const ROTATING_WORDS = [
  'Être transformé par Sa Présence',
  'Grandir dans Sa Vérité',
  'Vivre pour Sa Gloire',
  'Impacter les Nations',
]

const FLOATING_BADGES = [
  { emoji: '🇨🇩', label: 'Kinshasa', delay: 0 },
  { emoji: '🇫🇷', label: 'Paris', delay: 0.4 },
  { emoji: '🇨🇦', label: 'Montréal', delay: 0.8 },
  { emoji: '🇨🇮', label: 'Abidjan', delay: 1.2 },
]

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0)
  const [isLive] = useState(true) // showcase the live pill
  const { scrollY } = useScroll()
  const bgY = useTransform(scrollY, [0, 600], [0, 180])
  const contentY = useTransform(scrollY, [0, 400], [0, -40])
  const textOpacity = useTransform(scrollY, [0, 350], [1, 0])

  useEffect(() => {
    const t = setInterval(() => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length), 3500)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden bg-cinematic-deep">
      {/* IMMERSIVE HERO IMAGE — parallaxed cathedral artwork */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ y: bgY, scale: 1.1 }}
        aria-hidden
      >
        <PremiumImage
          image={HERO_IMAGES.cathedral}
          fill
          priority
          overlay="heavy"
          sizes="100vw"
          imageClassName="opacity-90"
        />
      </motion.div>

      {/* CINEMATIC BACKGROUND LAYERS */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ y: bgY }}
        aria-hidden
      >
        {/* Radial cathedral glow */}
        <div
          className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[140vw] md:w-[1300px] h-[1100px] rounded-full"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(212,175,55,0.22) 0%, rgba(75,0,130,0.18) 35%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Vertical gold light beam */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-[60vh] opacity-50"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.6) 40%, transparent)' }}
        />
        {/* Soft purple glow bottom */}
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(75,0,130,0.35) 0%, transparent 65%)', filter: 'blur(60px)' }}
        />
        {/* Stars / particles — pure CSS */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20% 20%, rgba(245,230,167,0.6), transparent), ' +
            'radial-gradient(1px 1px at 80% 30%, rgba(245,230,167,0.4), transparent), ' +
            'radial-gradient(1px 1px at 35% 60%, rgba(255,255,255,0.5), transparent), ' +
            'radial-gradient(1.5px 1.5px at 70% 75%, rgba(212,175,55,0.5), transparent), ' +
            'radial-gradient(1px 1px at 50% 85%, rgba(255,255,255,0.4), transparent)',
          backgroundSize: '600px 600px',
        }} />
      </motion.div>

      {/* Subtle film grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.045] mix-blend-overlay"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ background: 'radial-gradient(ellipse at center, transparent 0%, transparent 55%, rgba(0,0,0,0.85) 100%)' }}
      />

      {/* LIVE PILL */}
      {isLive && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="absolute top-24 md:top-28 left-1/2 -translate-x-1/2 z-20"
        >
          <Link
            href="/live"
            className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-[11px] font-bold font-inter tracking-[0.15em] uppercase border backdrop-blur-xl transition-all hover:scale-105"
            style={{
              background: 'rgba(239,68,68,0.12)',
              borderColor: 'rgba(239,68,68,0.4)',
              color: '#FCA5A5',
              boxShadow: '0 0 30px rgba(239,68,68,0.2)',
            }}
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
            </span>
            En direct maintenant — Veillée Mahanaïm
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      )}

      {/* MAIN CONTENT */}
      <motion.div
        style={{ opacity: textOpacity, y: contentY }}
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 md:pt-32 pb-20 flex flex-col items-center text-center"
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-7"
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] md:text-[11px] font-bold tracking-[0.25em] uppercase font-inter border backdrop-blur-xl"
            style={{
              background: 'rgba(212,175,55,0.08)',
              borderColor: 'rgba(212,175,55,0.3)',
              color: '#F5E6A7',
              boxShadow: '0 0 30px rgba(212,175,55,0.12)',
            }}
          >
            <Sparkles className="w-3 h-3" />
            Bienvenue dans le Royaume de Dieu
            <Sparkles className="w-3 h-3" />
          </span>
        </motion.div>

        {/* HEADLINE — cinematic */}
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 tracking-tight relative"
        >
          <span className="block font-cinzel font-black text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.6)]"
            style={{ fontSize: 'clamp(3rem, 9vw, 7rem)', lineHeight: 0.95, letterSpacing: '-0.025em' }}>
            La Chapelle
          </span>
          <span className="block font-cinzel font-black text-cinematic-gold"
            style={{ fontSize: 'clamp(3rem, 9vw, 7rem)', lineHeight: 0.95, letterSpacing: '-0.025em' }}>
            Internationale
          </span>
          <span
            className="block mt-3 font-cormorant font-light italic"
            style={{
              fontSize: 'clamp(1.6rem, 4.2vw, 3.2rem)',
              lineHeight: 1.2,
              color: 'rgba(245,230,216,0.7)',
              letterSpacing: '0.01em',
            }}
          >
            des Élus du Royaume
          </span>
        </motion.h1>

        {/* SUBTITLE */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="font-inter leading-relaxed mb-4 mx-auto"
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'rgba(245,230,216,0.55)',
            maxWidth: '640px',
          }}
        >
          Une Église Ouverte au Monde — rejoignez des milliers de croyants dans
          une expérience spirituelle digitale unique, à toute heure et toute saison.
        </motion.p>

        {/* ROTATING TAGLINE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="h-8 flex items-center justify-center gap-2 mb-10 text-sm md:text-base font-inter"
          style={{ color: 'rgba(245,230,216,0.5)' }}
        >
          <span>Venez</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={wordIndex}
              initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
              transition={{ duration: 0.5 }}
              className="font-semibold text-cinematic-gold"
            >
              {ROTATING_WORDS[wordIndex]}
            </motion.span>
          </AnimatePresence>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-7 w-full sm:w-auto"
        >
          <Link
            href="/rejoindre"
            onClick={() => events.ctaClick('rejoindre_hero')}
            className="btn-gold-cinematic group w-full sm:w-auto"
          >
            Rejoindre la Chapelle
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/live"
            onClick={() => events.ctaClick('live_hero')}
            className="btn-glass-cinematic group w-full sm:w-auto"
          >
            <span className="relative flex w-6 h-6 items-center justify-center rounded-full bg-red-500/90 flex-shrink-0">
              <Play className="w-2.5 h-2.5 text-white fill-white ml-0.5" />
            </span>
            Voir le Live
          </Link>
        </motion.div>

        {/* SOCIAL PROOF */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[11px] font-inter mb-12"
          style={{ color: 'rgba(245,230,216,0.35)', letterSpacing: '0.08em' }}
        >
          ★ ★ ★ ★ ★ &nbsp;·&nbsp; 127 000+ membres &nbsp;·&nbsp; 120 nations &nbsp;·&nbsp; Accès gratuit
        </motion.p>

        {/* STATS — premium glass cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl"
        >
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
                whileHover={{ y: -4 }}
                className="group relative rounded-2xl p-4 sm:p-5 text-center overflow-hidden transition-all duration-500 cursor-default"
                style={{
                  background: 'linear-gradient(140deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 40px rgba(0,0,0,0.3)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${stat.color}1A, transparent 70%)` }}
                />
                <div
                  className="relative w-9 h-9 rounded-xl mx-auto mb-2.5 flex items-center justify-center"
                  style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25` }}
                >
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div className="relative font-cinzel font-black text-2xl sm:text-3xl mb-0.5"
                  style={{ color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  {stat.value}
                </div>
                <div className="relative text-[11px] font-inter uppercase tracking-wider"
                  style={{ color: 'rgba(245,230,216,0.5)' }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Floating nation badges — desktop only, premium feel */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none" aria-hidden>
          {FLOATING_BADGES.map((badge, i) => (
            <motion.div
              key={badge.label}
              className="absolute"
              style={{
                top: `${20 + (i % 2) * 50}%`,
                left: i < 2 ? '5%' : 'auto',
                right: i >= 2 ? '5%' : 'auto',
              }}
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 5 + i, repeat: Infinity, delay: badge.delay, ease: 'easeInOut' }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl border shadow-lg"
                style={{
                  background: 'rgba(212,175,55,0.06)',
                  borderColor: 'rgba(212,175,55,0.18)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <span className="text-base">{badge.emoji}</span>
                <span className="font-inter text-[11px] font-medium" style={{ color: '#F5E6D8' }}>
                  {badge.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* SCROLL INDICATOR */}
      <motion.button
        type="button"
        onClick={() =>
          window.scrollTo({
            top: window.innerHeight - 64,
            behavior: 'matchMedia' in window && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          })
        }
        aria-label="Découvrir la suite"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="group absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10 cursor-pointer transition-colors hover:text-gold-light"
        style={{ color: 'rgba(245,230,216,0.4)' }}
      >
        <span className="text-[9px] font-inter tracking-[0.35em] uppercase">Découvrir</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="transition-transform group-hover:scale-110"
        >
          <ChevronDown className="w-4 h-4" style={{ color: '#D4AF37' }} />
        </motion.div>
      </motion.button>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#050308] pointer-events-none" />
    </section>
  )
}
