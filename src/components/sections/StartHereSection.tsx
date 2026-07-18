'use client'
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { TUNNEL_STAGES } from '@/lib/tunnel'
import { events } from '@/lib/analytics'

/**
 * Signature « Parcours » — montée Visiteur → Leader (données TUNNEL_STAGES réelles).
 * Composition d’ascension, pas une grille de cartes SaaS.
 * 7 étapes réelles du tunnel Citadelle.
 */

export function StartHereSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()
  const stages = TUNNEL_STAGES

  return (
    <section id="decouvrir-citadelle" ref={ref} className="section-cinematic scroll-mt-24">
      <div className="halo-gold w-[720px] h-[380px] -top-8 left-1/2 -translate-x-1/2 opacity-80" />

      <div className="container-cinematic max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14 md:mb-20"
        >
          <div className="section-label-dark justify-center">Le parcours</div>
          <h2 className="heading-cinematic-lg mb-5">
            Une direction
            <span className="block text-cinematic-gold">claire</span>
          </h2>
          <p
            className="font-inter text-base md:text-lg max-w-md mx-auto leading-relaxed"
            style={{ color: 'rgba(245,230,216,0.45)' }}
          >
            Du premier regard au leadership — étape par étape.
          </p>
        </motion.div>

        <div className="citadelle-path relative py-2">
          <div className="citadelle-path-spine" aria-hidden />

          <ol className="relative list-none p-0 m-0 space-y-5 md:space-y-8">
            {stages.map((stage, i) => {
              const side = i % 2 === 0 ? 'is-right' : 'is-left'
              return (
                <motion.li
                  key={stage.key}
                  initial={{ opacity: 0, y: reduce ? 0 : 18 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.55, delay: reduce ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="relative"
                >
                  <span className="citadelle-path-node" aria-hidden />
                  <Link
                    href={stage.href === '/' ? '/parcours' : stage.href}
                    onClick={() => events.ctaClick(`tunnel_${stage.key}`)}
                    className={`citadelle-path-step group block ${side}`}
                  >
                    <span
                      className="font-cinzel text-[10px] font-bold tracking-[0.28em] block mb-2"
                      style={{ color: 'rgba(212,175,55,0.5)' }}
                    >
                      {String(stage.index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-cinzel font-bold text-pearl text-lg mb-1.5">{stage.nom}</h3>
                    <p className="font-inter text-sm leading-relaxed mb-3" style={{ color: 'rgba(245,230,216,0.42)' }}>
                      {stage.promesse}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium font-inter text-gold/70 group-hover:text-gold group-hover:gap-2 transition-all">
                      {stage.cta}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </motion.li>
              )
            })}
          </ol>
        </div>

        <div className="text-center mt-14">
          <Link
            href="/parcours"
            onClick={() => events.ctaClick('voir_parcours_complet')}
            className="inline-flex items-center gap-2 text-sm font-inter transition-colors"
            style={{ color: 'rgba(235,231,221,0.4)' }}
          >
            Voir le parcours complet <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
