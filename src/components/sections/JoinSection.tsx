'use client'
/**
 * SCÈNE 9 — CTA FINAL
 * Fond épuré. Un titre. Un bouton. Rien d'autre.
 */
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { events } from '@/lib/analytics'

export function JoinSection(_props: { block?: unknown } = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const reduce = useReducedMotion()

  return (
    <section ref={ref} className="relative overflow-hidden" aria-labelledby="final-cta-title">
      <div
        className="relative px-6"
        style={{
          paddingTop: 'clamp(6.5rem, 14vw, 11rem)',
          paddingBottom: 'clamp(7rem, 16vw, 12rem)',
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,100vw)] h-[min(360px,55vw)] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, rgba(30,58,138,0.05) 45%, transparent 72%)',
          }}
          aria-hidden
        />

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          <h2
            id="final-cta-title"
            className="font-cinzel font-black mb-12 text-cinematic-gold"
            style={{
              fontSize: 'clamp(1.85rem, 4.5vw, 3.1rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            Ta prochaine étape commence aujourd&apos;hui.
          </h2>

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
