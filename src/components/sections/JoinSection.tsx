'use client'
/**
 * SCÈNE 9 — CTA FINAL
 * Fond épuré. Un titre. Un bouton. Rien d'autre.
 */
import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { events } from '@/lib/analytics'
import {
  HOME_VIEWPORT,
  HOME_DELAY,
  revealInitial,
  revealVisible,
  revealTransition,
} from '@/lib/home-motion'

export function JoinSection(_props: { block?: unknown } = {}) {
  const ref = useRef<HTMLDivElement>(null)
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,100%)] h-[min(360px,55%)] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse, rgba(212,175,55,0.10) 0%, rgba(30,58,138,0.05) 45%, transparent 72%)',
          }}
          aria-hidden
        />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <motion.h2
            id="final-cta-title"
            initial={revealInitial(reduce)}
            whileInView={revealVisible()}
            viewport={HOME_VIEWPORT}
            transition={revealTransition(reduce, HOME_DELAY.title)}
            className="font-cinzel font-black mb-12 text-cinematic-gold"
            style={{
              fontSize: 'clamp(1.85rem, 4.5vw, 3.1rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            Ta prochaine étape commence aujourd&apos;hui.
          </motion.h2>

          <motion.div
            initial={revealInitial(reduce, { y: 36, scale: true })}
            whileInView={revealVisible({ scale: true })}
            viewport={HOME_VIEWPORT}
            transition={revealTransition(reduce, HOME_DELAY.cta)}
          >
            <Link
              href="/rejoindre"
              onClick={() => events.ctaClick('rejoindre_finale')}
              className="btn-gold-cinematic group inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
              style={{ padding: '18px 48px', fontSize: '1rem' }}
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
