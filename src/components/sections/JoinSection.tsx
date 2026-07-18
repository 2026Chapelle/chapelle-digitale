'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { HERO_IMAGES } from '@/lib/images'
import { events } from '@/lib/analytics'

/**
 * Scène finale · Décision
 * Calme. Espace. Un seul bouton principal.
 * (Capture email retirée de la scène finale pour ne pas diluer la décision.)
 */

export function JoinSection(_props: { block?: unknown } = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="relative px-6" style={{ paddingTop: 'clamp(6rem, 14vw, 11rem)', paddingBottom: 'clamp(7rem, 16vw, 12rem)' }}>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(900px,100vw)] h-[min(500px,70vw)] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, rgba(30,58,138,0.06) 42%, transparent 70%)',
          }}
          aria-hidden
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          <div className="relative inline-block mb-10">
            <div
              className="absolute inset-0 rounded-full blur-3xl opacity-50"
              style={{ background: 'radial-gradient(circle, #D4AF37, transparent 70%)' }}
              aria-hidden
            />
            <Image
              src={HERO_IMAGES.crest.src}
              alt=""
              width={96}
              height={96}
              className="relative drop-shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            />
          </div>

          <p
            className="font-inter text-[11px] tracking-[0.4em] uppercase mb-8"
            style={{ color: 'rgba(235,217,160,0.45)' }}
          >
            Maintenant
          </p>

          <h2
            className="font-cinzel font-black mb-6 text-cinematic-gold"
            style={{ fontSize: 'clamp(1.85rem, 4.5vw, 3.1rem)', lineHeight: 1.15, letterSpacing: '-0.02em' }}
          >
            Ta prochaine étape commence aujourd&apos;hui.
          </h2>

          <p
            className="font-inter mx-auto mb-14 leading-relaxed"
            style={{ fontSize: '1rem', color: 'rgba(245,230,216,0.4)', maxWidth: '18rem' }}
          >
            Gratuit. Clair. À ton rythme.
          </p>

          <Link
            href="/rejoindre"
            onClick={() => events.ctaClick('rejoindre_finale')}
            className="btn-gold-cinematic group inline-flex"
            style={{ padding: '18px 48px', fontSize: '1rem' }}
          >
            Commencer gratuitement
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
