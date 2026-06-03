'use client'
import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Play, ChevronDown, Sparkles } from 'lucide-react'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { HERO_IMAGES } from '@/lib/images'
import { events } from '@/lib/analytics'

/* ============================================================
   HERO — « Charbon & Lumière » (refonte premium)
   Vitrail de lumière vectoriel + photo de communauté incarnée.
   Un seul CTA dominant · bandeau de confiance · mobile-safe.
   Palette tenue : or royal × charbon × lumière. Aucun bleu.
   ============================================================ */

const ROTATING_WORDS = [
  'transformé par Sa Présence',
  'relevé par Sa Grâce',
  'envoyé vers les Nations',
  'établi dans Sa Gloire',
]

const TRUST_POINTS = ['Présente sur plusieurs continents', 'Accès 100 % gratuit', 'Prière 24/7']

const EASE = [0.16, 1, 0.3, 1] as const

export function HeroSection({ block }: { block?: { subtitle?: string; cta_label?: string; cta_href?: string } } = {}) {
  const [wordIndex, setWordIndex] = useState(0)
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const bgY = useTransform(scrollY, [0, 600], [0, 140])
  const raysY = useTransform(scrollY, [0, 600], [0, 60])
  const contentY = useTransform(scrollY, [0, 400], [0, -36])
  const textOpacity = useTransform(scrollY, [0, 360], [1, 0])

  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length), 3400)
    return () => clearInterval(t)
  }, [reduce])

  return (
    <section
      className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #131316 0%, #0C0C0F 55%, #08080A 100%)' }}
    >
      {/* ============ FOND : PHOTO INCARNÉE + VITRAIL ============ */}

      {/* Photo de communauté (incarnation) — fondue dans le charbon, sous le vitrail */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y: bgY }} aria-hidden>
        <div className="absolute inset-0 opacity-[0.32] md:opacity-[0.38]">
          <PremiumImage
            image={HERO_IMAGES.worship}
            preferRemote
            fill
            priority
            overlay="heavy"
            sizes="100vw"
            imageClassName="object-cover scale-105"
          />
        </div>
        {/* Re-fonte charbon par-dessus la photo pour garder la lisibilité du texte */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 38%, transparent 0%, rgba(8,8,10,0.55) 70%, #08080A 100%)' }}
        />
      </motion.div>

      {/* Halo lumineux gris cassé descendant du haut (lumière de cathédrale) */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y: bgY }} aria-hidden>
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[150vw] md:w-[1400px] h-[1000px]"
          style={{
            background:
              'radial-gradient(ellipse 55% 50% at 50% 0%, rgba(236,232,222,0.20) 0%, rgba(236,232,222,0.07) 28%, transparent 62%)',
          }}
        />
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
        animate={reduce ? { opacity: 0.6 } : { opacity: [0.5, 0.8, 0.5] }}
        transition={reduce ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
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
      {!reduce && (
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
      )}

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
        className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-24 pb-24 flex flex-col items-center text-center"
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mb-6"
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
            Une Église Ouverte au Monde
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
            style={{ fontSize: 'clamp(2.7rem, 8.6vw, 6.8rem)', lineHeight: 0.94, letterSpacing: '-0.03em', color: '#F4F2ED' }}
          >
            La Chapelle
          </span>
          <span
            className="block font-cinzel font-black text-gradient-light-gold"
            style={{ fontSize: 'clamp(2.7rem, 8.6vw, 6.8rem)', lineHeight: 0.94, letterSpacing: '-0.03em' }}
          >
            Internationale
          </span>
          <span
            className="block mt-3 font-cormorant font-light italic"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 3.1rem)', lineHeight: 1.15, color: 'rgba(235,231,221,0.62)', letterSpacing: '0.01em' }}
          >
            des Élus du Royaume
          </span>
        </motion.h1>

        {/* Storytelling émotionnel */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22, ease: EASE }}
          className="font-cormorant italic mb-5"
          style={{ fontSize: 'clamp(1.05rem, 2.4vw, 1.45rem)', color: 'rgba(235,231,221,0.55)' }}
        >
          « Où que tu sois sur la terre, tu as une maison dans le Royaume. »
        </motion.p>

        {/* SUBTITLE */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
          className="font-inter leading-relaxed mb-8 mx-auto"
          style={{ fontSize: 'clamp(0.98rem, 1.9vw, 1.18rem)', color: 'rgba(235,231,221,0.52)', maxWidth: '600px' }}
        >
          {block?.subtitle ||
            'Rejoignez des milliers de croyants dans une expérience spirituelle digitale unique — cultes en direct, formations, prière et communion, à toute heure.'}
        </motion.p>

        {/* CTAs — un seul CTA dominant */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.46, ease: EASE }}
          className="flex flex-col sm:flex-row items-center gap-3 mb-5 w-full sm:w-auto"
        >
          <Link
            href={block?.cta_href || '/rejoindre'}
            onClick={() => events.ctaClick('rejoindre_hero')}
            className="btn-gold-cinematic group w-full sm:w-auto"
            style={{ padding: '16px 38px', fontSize: '1rem' }}
          >
            {block?.cta_label || 'Rejoindre la Chapelle'}
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          <Link
            href="/live"
            onClick={() => events.ctaClick('live_hero')}
            className="btn-glass-cinematic group w-full sm:w-auto"
          >
            <span className="relative flex w-6 h-6 items-center justify-center rounded-full bg-red-500/90 flex-shrink-0">
              {!reduce && <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-60 animate-ping" />}
              <Play className="relative w-2.5 h-2.5 text-white fill-white ml-0.5" />
            </span>
            Voir le culte en direct
          </Link>
        </motion.div>

        {/* ROTATING TAGLINE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.58 }}
          className="h-7 flex items-center justify-center gap-2 mb-8 text-sm md:text-base font-inter"
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

        {/* TRUST BAR — preuve qualitative honnête */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] md:text-xs font-inter"
          style={{ color: 'rgba(235,231,221,0.4)', letterSpacing: '0.06em' }}
        >
          {TRUST_POINTS.map((point, i) => (
            <span key={point} className="inline-flex items-center gap-3">
              {i > 0 && <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(212,175,55,0.5)' }} />}
              {point}
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* SCROLL INDICATOR — bouton accessible */}
      <motion.button
        type="button"
        onClick={() =>
          window.scrollTo({
            top: window.innerHeight - 64,
            behavior:
              'matchMedia' in window && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          })
        }
        aria-label="Découvrir la suite"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="group absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10 cursor-pointer transition-colors hover:text-gold-light"
        style={{ color: 'rgba(235,231,221,0.4)' }}
      >
        <span className="text-[9px] font-inter tracking-[0.35em] uppercase">Découvrir</span>
        <motion.div
          animate={reduce ? {} : { y: [0, 8, 0] }}
          transition={reduce ? {} : { repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
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
