'use client'
import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { TUNNEL_STAGES } from '@/lib/tunnel'
import { events } from '@/lib/analytics'

/**
 * Parcours de croissance — aventure réelle (TUNNEL_STAGES).
 * Pas une grille de 4 portes génériques : une progression Visiteur → Leader.
 */

export function StartHereSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()
  const stages = TUNNEL_STAGES

  return (
    <section id="decouvrir-citadelle" ref={ref} className="section-cinematic scroll-mt-24">
      <div className="halo-gold w-[800px] h-[420px] -top-10 left-1/2 -translate-x-1/2" />

      <div className="container-cinematic">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="section-label-dark justify-center">Parcours de croissance</div>
          <h2 className="heading-cinematic-lg mb-6">
            Une transformation
            <span className="block text-cinematic-gold">pas à pas</span>
          </h2>
          <p
            className="font-inter text-base md:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: 'rgba(245,230,216,0.48)' }}
          >
            Du premier regard au leadership — tu n&apos;avances jamais seul.
          </p>
        </motion.div>

        {/* Ligne de progression desktop */}
        <div className="relative max-w-5xl mx-auto">
          <div
            className="hidden md:block absolute top-10 left-[6%] right-[6%] h-px pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), rgba(212,175,55,0.55), rgba(212,175,55,0.25), transparent)',
            }}
            aria-hidden
          />

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0 m-0">
            {stages.map((stage, i) => (
              <motion.li
                key={stage.key}
                initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: reduce ? 0 : i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={stage.href === '/' ? '/parcours' : stage.href}
                  onClick={() => events.ctaClick(`tunnel_${stage.key}`)}
                  className="group relative flex h-full flex-col card-cinematic p-6"
                >
                  <span
                    className="font-cinzel text-[11px] font-bold tracking-[0.2em] mb-4"
                    style={{ color: 'rgba(212,175,55,0.55)' }}
                  >
                    {String(stage.index + 1).padStart(2, '0')}
                  </span>
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: `${stage.color}14` }}
                  >
                    <stage.icon className="w-5 h-5" style={{ color: stage.color }} aria-hidden />
                  </div>
                  <h3 className="font-cinzel font-bold text-pearl text-base mb-1">{stage.nom}</h3>
                  <p className="font-inter text-sm leading-relaxed flex-1 mb-4" style={{ color: 'rgba(245,230,216,0.45)' }}>
                    {stage.promesse}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium font-inter text-gold/80 group-hover:text-gold group-hover:gap-2 transition-all">
                    {stage.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </motion.li>
            ))}
          </ol>
        </div>

        <div className="text-center mt-10">
          <Link
            href="/parcours"
            onClick={() => events.ctaClick('voir_parcours_complet')}
            className="inline-flex items-center gap-2 text-sm font-inter text-pearl/60 hover:text-gold transition-colors"
          >
            Voir le parcours complet <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
