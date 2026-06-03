'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { TUNNEL_STAGES, type TunnelStageKey } from '@/lib/tunnel'
import { events } from '@/lib/analytics'

/* ============================================================
   JourneyPath — le chemin de transformation (Visiteur → Leader)
   Rend les 7 étapes du tunnel (tunnel.ts) en parcours premium.
   « Chaque visiteur sait immédiatement quoi faire ensuite. »
   ============================================================ */

interface JourneyPathProps {
  /** Étape courante à mettre en avant (facultatif). */
  currentKey?: TunnelStageKey
  /** Affiche le CTA de chaque étape. */
  showCtas?: boolean
  /** Variante compacte (cartes resserrées). */
  compact?: boolean
}

export function JourneyPath({ currentKey, showCtas = true, compact = false }: JourneyPathProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const currentIndex = currentKey ? TUNNEL_STAGES.find((s) => s.key === currentKey)?.index ?? -1 : -1

  return (
    <div ref={ref} className="relative">
      {/* Ligne de progression (desktop) */}
      <div className="hidden lg:block absolute top-[34px] left-[7%] right-[7%] h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), rgba(212,175,55,0.45), rgba(212,175,55,0.18), transparent)' }} />

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 ${compact ? 'gap-2.5' : 'gap-3'}`}>
        {TUNNEL_STAGES.map((stage, i) => {
          const isPast = currentIndex >= 0 && i < currentIndex
          const isCurrent = currentIndex === i
          const accent = isCurrent ? '#D4AF37' : stage.color
          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, y: 22 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className={`h-full flex flex-col items-center text-center rounded-2xl ${compact ? 'p-3.5' : 'p-4'} transition-all duration-500`}
                style={
                  isCurrent
                    ? { background: 'linear-gradient(140deg, rgba(212,175,55,0.14), rgba(212,175,55,0.03))', border: '1px solid rgba(212,175,55,0.4)', boxShadow: '0 0 30px rgba(212,175,55,0.16)' }
                    : { background: 'linear-gradient(140deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01))', border: '1px solid rgba(255,255,255,0.07)' }
                }>
                {/* Pastille étape */}
                <div className="relative mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-500"
                    style={{ background: `${accent}1F`, border: `1px solid ${accent}45`, boxShadow: isCurrent ? `0 0 20px ${accent}40` : 'none' }}>
                    <stage.icon className="w-5 h-5" style={{ color: accent }} />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-cinzel"
                    style={{ background: isPast || isCurrent ? 'linear-gradient(135deg, #F5E6A7, #D4AF37)' : 'rgba(255,255,255,0.1)', color: isPast || isCurrent ? '#1A0F00' : 'rgba(245,230,216,0.6)' }}>
                    {i + 1}
                  </span>
                </div>

                <h3 className="font-cinzel font-bold text-white text-sm mb-0.5">{stage.nom}</h3>
                <p className="font-inter text-[10px] uppercase tracking-wider mb-2" style={{ color: `${accent}` }}>{stage.role}</p>
                {!compact && (
                  <p className="font-inter text-xs leading-relaxed mb-3 flex-1" style={{ color: 'rgba(245,230,216,0.5)' }}>
                    {stage.promesse}
                  </p>
                )}

                {showCtas && (
                  <Link href={stage.href} onClick={() => events.ctaClick(`journey_${stage.key}`)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold font-inter mt-auto transition-all hover:gap-1.5"
                    style={{ color: isCurrent ? '#F5E6A7' : 'rgba(245,230,216,0.6)' }}>
                    {isCurrent ? 'Continuer' : stage.cta.length > 20 ? 'Découvrir' : stage.cta}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
