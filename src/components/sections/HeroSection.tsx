'use client'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { HERO_IMAGES } from '@/lib/images'
import { events } from '@/lib/analytics'

/* ============================================================
   HERO — Phase 3 · affiche iconique
   Peu de mots. Beaucoup de lumière. Espérance.
   CMS : subtitle / cta_label / cta_href.
   ============================================================ */

const EASE = [0.16, 1, 0.3, 1] as const

export function HeroSection({ block }: { block?: { subtitle?: string; cta_label?: string; cta_href?: string } } = {}) {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const bgY = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 100])
  const raysY = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 48])
  const contentY = useTransform(scrollY, [0, 400], [0, reduce ? 0 : -28])
  const textOpacity = useTransform(scrollY, [0, 380], [1, 0])

  const primaryHref = block?.cta_href || '/rejoindre'
  const primaryLabel = block?.cta_label || 'Commencer gratuitement'

  const scrollToDiscover = () => {
    const el = document.getElementById('decouvrir-citadelle')
    if (el) {
      el.scrollIntoView({
        behavior:
          typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        block: 'start',
      })
      return
    }
    window.scrollTo({
      top: window.innerHeight - 64,
      behavior:
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
    })
  }

  return (
    <section
      className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #131316 0%, #0C0C0F 55%, #08080A 100%)' }}
    >
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
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 38%, transparent 0%, rgba(8,8,10,0.55) 70%, #08080A 100%)' }}
        />
      </motion.div>

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

      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{ background: 'radial-gradient(ellipse at center, transparent 0%, transparent 52%, rgba(0,0,0,0.8) 100%)' }}
      />

      <motion.div
        style={{ opacity: textOpacity, y: contentY }}
        className="relative z-10 w-full max-w-4xl mx-auto px-6 sm:px-8 pt-32 md:pt-28 pb-28 flex flex-col items-center text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="mb-8 font-inter text-[11px] md:text-xs tracking-[0.35em] uppercase"
          style={{ color: 'rgba(235,217,160,0.55)' }}
        >
          Citadelle
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.1, ease: EASE }}
          className="mb-8 relative"
        >
          <span
            className="block font-cinzel font-black"
            style={{
              fontSize: 'clamp(2.5rem, 7.2vw, 5.1rem)',
              lineHeight: 1.06,
              letterSpacing: '-0.03em',
              color: '#F7F4EE',
              textShadow: '0 4px 56px rgba(0,0,0,0.4)',
            }}
          >
            Grandis avec Christ.
          </span>
          <span
            className="block font-cinzel font-black text-gradient-light-gold mt-2"
            style={{ fontSize: 'clamp(2.5rem, 7.2vw, 5.1rem)', lineHeight: 1.06, letterSpacing: '-0.03em' }}
          >
            Où que tu sois.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.28, ease: EASE }}
          className="font-inter leading-relaxed mb-14 mx-auto"
          style={{ fontSize: 'clamp(1rem, 1.7vw, 1.15rem)', color: 'rgba(235,231,221,0.42)', maxWidth: '22rem' }}
        >
          {block?.subtitle || 'Ta maison spirituelle, partout avec toi.'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.42, ease: EASE }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
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
            className="text-sm font-inter tracking-wide w-full sm:w-auto py-3 px-2 transition-colors"
            style={{ color: 'rgba(235,231,221,0.45)' }}
          >
            Découvrir Citadelle
          </button>
        </motion.div>
      </motion.div>

      <motion.button
        type="button"
        onClick={scrollToDiscover}
        aria-label="Découvrir Citadelle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
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

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#08080A] pointer-events-none" />
    </section>
  )
}
