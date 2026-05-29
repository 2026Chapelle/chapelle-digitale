'use client'
import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Play, Users, Globe, Tv, ChevronDown, Sparkles } from 'lucide-react'
import { events } from '@/lib/analytics'

/* ============================================================
   HERO — « Charbon & Lumière »
   Charbon profond × gris cassé lumineux × or royal.
   Vitrail de lumière vectoriel (rayons + poussière d'or).
   Aucune image externe · aucun bleu · animations légères.
   ============================================================ */

const STATS = [
  { value: '127K', label: 'Membres actifs', icon: Users, accent: '#D4AF37' },
  { value: '120+', label: 'Nations', icon: Globe, accent: '#EBE7DD' },
  { value: '500+', label: 'Cultes en direct', icon: Tv, accent: '#F5E6A7' },
]

const ROTATING_WORDS = [
  'transformé par Sa Présence',
  'relevé par Sa Grâce',
  'envoyé vers les Nations',
  'établi dans Sa Gloire',
]

const FLOATING_BADGES = [
  { emoji: '🇨🇩', label: 'Kinshasa', delay: 0 },
  { emoji: '🇫🇷', label: 'Paris', delay: 0.4 },
  { emoji: '🇨🇦', label: 'Montréal', delay: 0.8 },
  { emoji: '🇨🇮', label: 'Abidjan', delay: 1.2 },
]

const EASE = [0.16, 1, 0.3, 1] as const

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0)
  const { scrollY } = useScroll()
  const bgY = useTransform(scrollY, [0, 600], [0, 140])
  const raysY = useTransform(scrollY, [0, 600], [0, 60])
  const contentY = useTransform(scrollY, [0, 400], [0, -36])
  const textOpacity = useTransform(scrollY, [0, 360], [1, 0])

  useEffect(() => {
    const t = setInterval(() => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length), 3400)
    return () => clearInterval(t)
  }, [])

  return (
    <section
      className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #131316 0%, #0C0C0F 55%, #08080A 100%)' }}
    >
      {/* ============ FOND : VITRAIL DE LUMIÈRE ============ */}

      {/* Halo lumineux gris cassé descendant du haut (lumière de cathédrale) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ y: bgY }}
        aria-hidden
      >
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[150vw] md:w-[1400px] h-[1000px]"
          style={{
            background:
              'radial-gradient(ellipse 55% 50% at 50% 0%, rgba(236,232,222,0.20) 0%, rgba(236,232,222,0.07) 28%, transparent 62%)',
          }}
        />
        {/* Lueur or, ancrée sous le faisceau */}
        <div
          className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[90vw] md:w-[900px] h-[640px]"
          style={{
            background:
              'radial-gradient(ellipse 50% 50% at 50% 0%, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 40%, transparent 70%)',
          }}
        />
      </motion.div>

      {/* Rayons vectoriels (god rays) en éventail depuis le haut */}
      <motion.svg
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[160vw] md:w-[1500px] h-[85vh] pointer-events-none"
        viewBox="0 0 1000 800"
        preserveAspectRatio="xMidYMin slice"
        style={{ y: raysY }}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="rayLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F4F1E9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#F4F1E9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rayGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5E6A7" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g style={{ mixBlendMode: 'screen' }}>
          <polygon points="500,-40 470,820 530,820" fill="url(#rayGold)" opacity="0.9" />
          <polygon points="500,-40 380,820 450,820" fill="url(#rayLight)" />
          <polygon points="500,-40 620,820 550,820" fill="url(#rayLight)" />
          <polygon points="500,-40 250,820 350,820" fill="url(#rayLight)" opacity="0.6" />
          <polygon points="500,-40 750,820 650,820" fill="url(#rayLight)" opacity="0.6" />
          <polygon points="500,-40 120,820 230,820" fill="url(#rayLight)" opacity="0.35" />
          <polygon points="500,-40 880,820 770,820" fill="url(#rayLight)" opacity="0.35" />
        </g>
      </motion.svg>

      {/* Poussière d'or en suspension */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          y: bgY,
          backgroundImage:
            'radial-gradient(1.5px 1.5px at 18% 22%, rgba(245,230,167,0.7), transparent), ' +
            'radial-gradient(1px 1px at 78% 30%, rgba(244,241,233,0.6), transparent), ' +
            'radial-gradient(1.5px 1.5px at 33% 64%, rgba(212,175,55,0.6), transparent), ' +
            'radial-gradient(1px 1px at 66% 74%, rgba(244,241,233,0.5), transparent), ' +
            'radial-gradient(1.5px 1.5px at 50% 86%, rgba(245,230,167,0.5), transparent), ' +
            'radial-gradient(1px 1px at 88% 58%, rgba(212,175,55,0.45), transparent)',
          backgroundSize: '620px 620px',
        }}
        animate={{ backgroundPositionY: ['0px', '40px', '0px'] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />

      {/* Grain cinématique fin */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Vignette charbon */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ background: 'radial-gradient(ellipse at center, transparent 0%, transparent 52%, rgba(0,0,0,0.8) 100%)' }}
      />

      {/* ============ CONTENU ============ */}
      <motion.div
        style={{ opacity: textOpacity, y: contentY }}
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 md:pt-28 pb-20 flex flex-col items-center text-center"
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-7"
        >
          <span
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-[10px] md:text-[11px] font-bold tracking-[0.28em] uppercase font-inter border backdrop-blur-xl"
            style={{
              background: 'rgba(244,241,233,0.05)',
              borderColor: 'rgba(212,175,55,0.28)',
              color: '#EBE7DD',
              boxShadow: '0 0 30px rgba(212,175,55,0.10)',
            }}
          >
            <Sparkles className="w-3 h-3" style={{ color: '#D4AF37' }} />
            Une Église Ouverte au Monde · 120 nations
          </span>
        </motion.div>

        {/* HEADLINE */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.08, ease: EASE }}
          className="mb-6 relative"
        >
          <span
            className="block font-cinzel font-black drop-shadow-[0_2px_40px_rgba(0,0,0,0.5)]"
            style={{
              fontSize: 'clamp(3rem, 9.2vw, 7.2rem)',
              lineHeight: 0.94,
              letterSpacing: '-0.03em',
              color: '#F4F2ED',
            }}
          >
            La Chapelle
          </span>
          <span
            className="block font-cinzel font-black text-gradient-light-gold"
            style={{ fontSize: 'clamp(3rem, 9.2vw, 7.2rem)', lineHeight: 0.94, letterSpacing: '-0.03em' }}
          >
            Internationale
          </span>
          <span
            className="block mt-3 font-cormorant font-light italic"
            style={{
              fontSize: 'clamp(1.6rem, 4.2vw, 3.3rem)',
              lineHeight: 1.15,
              color: 'rgba(235,231,221,0.62)',
              letterSpacing: '0.01em',
            }}
          >
            des Élus du Royaume
          </span>
        </motion.h1>

        {/* Storytelling émotionnel */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: EASE }}
          className="font-cormorant italic mb-6"
          style={{ fontSize: 'clamp(1.05rem, 2.4vw, 1.45rem)', color: 'rgba(235,231,221,0.5)' }}
        >
          « Où que tu sois sur la terre, tu as une maison dans le Royaume. »
        </motion.p>

        {/* SUBTITLE */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
          className="font-inter leading-relaxed mb-4 mx-auto"
          style={{ fontSize: 'clamp(0.98rem, 1.9vw, 1.18rem)', color: 'rgba(235,231,221,0.48)', maxWidth: '600px' }}
        >
          Rejoignez des milliers de croyants dans une expérience spirituelle digitale unique —
          cultes en direct, formations, prière et communion, à toute heure.
        </motion.p>

        {/* ROTATING TAGLINE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42 }}
          className="h-8 flex items-center justify-center gap-2 mb-10 text-sm md:text-base font-inter"
          style={{ color: 'rgba(235,231,221,0.45)' }}
        >
          <span>Venez être</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={wordIndex}
              initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
              transition={{ duration: 0.5 }}
              className="font-semibold text-gradient-light-gold"
            >
              {ROTATING_WORDS[wordIndex]}
            </motion.span>
          </AnimatePresence>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.52, ease: EASE }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-7 w-full sm:w-auto"
        >
          <Link
            href="/rejoindre"
            onClick={() => events.ctaClick('rejoindre_hero')}
            className="btn-gold-cinematic group w-full sm:w-auto text-[0.97rem]"
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
              <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-60 animate-ping" />
              <Play className="relative w-2.5 h-2.5 text-white fill-white ml-0.5" />
            </span>
            Voir le culte en direct
          </Link>
        </motion.div>

        {/* SOCIAL PROOF */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.64 }}
          className="text-[11px] font-inter mb-12"
          style={{ color: 'rgba(235,231,221,0.34)', letterSpacing: '0.08em' }}
        >
          ★ ★ ★ ★ ★ &nbsp;·&nbsp; 127 000+ membres &nbsp;·&nbsp; 120 nations &nbsp;·&nbsp; Accès gratuit
        </motion.p>

        {/* STATS — cartes verre charbon */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.72, ease: EASE }}
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
                  background: 'linear-gradient(140deg, rgba(244,241,233,0.06) 0%, rgba(244,241,233,0.015) 100%)',
                  backdropFilter: 'blur(20px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                  border: '1px solid rgba(244,241,233,0.10)',
                  boxShadow: '0 1px 0 rgba(244,241,233,0.06) inset, 0 12px 40px rgba(0,0,0,0.35)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${stat.accent}18, transparent 70%)` }}
                />
                <div
                  className="relative w-9 h-9 rounded-xl mx-auto mb-2.5 flex items-center justify-center"
                  style={{ background: `${stat.accent}14`, border: `1px solid ${stat.accent}28` }}
                >
                  <stat.icon className="w-4 h-4" style={{ color: stat.accent }} />
                </div>
                <div
                  className="relative font-cinzel font-black text-2xl sm:text-3xl mb-0.5"
                  style={{ color: '#F4F2ED', letterSpacing: '-0.02em' }}
                >
                  {stat.value}
                </div>
                <div
                  className="relative text-[11px] font-inter uppercase tracking-wider"
                  style={{ color: 'rgba(235,231,221,0.48)' }}
                >
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Badges nations flottants — desktop */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none" aria-hidden>
          {FLOATING_BADGES.map((badge, i) => (
            <motion.div
              key={badge.label}
              className="absolute"
              style={{
                top: `${20 + (i % 2) * 50}%`,
                left: i < 2 ? '4%' : 'auto',
                right: i >= 2 ? '4%' : 'auto',
              }}
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 5 + i, repeat: Infinity, delay: badge.delay, ease: 'easeInOut' }}
            >
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl border"
                style={{
                  background: 'rgba(244,241,233,0.05)',
                  borderColor: 'rgba(212,175,55,0.20)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <span className="text-base">{badge.emoji}</span>
                <span className="font-inter text-[11px] font-medium" style={{ color: '#EBE7DD' }}>
                  {badge.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* SCROLL INDICATOR — bouton accessible */}
      <motion.button
        type="button"
        onClick={() =>
          window.scrollTo({
            top: window.innerHeight - 64,
            behavior:
              'matchMedia' in window && window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'auto'
                : 'smooth',
          })
        }
        aria-label="Découvrir la suite"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="group absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10 cursor-pointer transition-colors hover:text-gold-light"
        style={{ color: 'rgba(235,231,221,0.4)' }}
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

      {/* Fondu vers la section suivante */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#08080A] pointer-events-none" />
    </section>
  )
}
