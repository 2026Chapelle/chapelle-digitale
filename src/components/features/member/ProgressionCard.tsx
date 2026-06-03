'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Lock, ArrowRight, Compass, Target } from 'lucide-react'
import { PARCOURS_DISCIPLE } from '@/lib/constants'
import { useAuth } from '@/components/providers/AuthProvider'

/* ============================================================
   ProgressionCard — progression visible du membre.
   Le membre voit où il en est dans le parcours Visiteur→Pasteur,
   sa prochaine étape et l'action concrète pour avancer.
   Données réelles (profiles.parcours_disciple_etape).
   ============================================================ */

export function ProgressionCard() {
  const { profile } = useAuth()
  const len = PARCOURS_DISCIPLE.length
  const etapeIdx = Math.min(Math.max(Number(profile?.parcours_disciple_etape ?? 0), 0), len - 1)
  const etape = PARCOURS_DISCIPLE[etapeIdx]
  const suivante = etapeIdx < len - 1 ? PARCOURS_DISCIPLE[etapeIdx + 1] : null
  const pct = Math.round((etapeIdx / (len - 1)) * 100)

  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-cinzel text-sm font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
          <Compass className="w-4 h-4" style={{ color: '#D4AF37' }} /> Mon parcours de transformation
        </h2>
        <span className="font-inter text-xs font-semibold" style={{ color: '#D4AF37' }}>{pct}%</span>
      </div>

      {/* Étapes Visiteur → Pasteur */}
      <div className="relative mb-5">
        <div className="absolute top-4 left-3 right-3 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute top-4 left-3 h-px transition-all duration-700"
          style={{ width: `calc(${pct}% - 1.5rem)`, background: 'linear-gradient(90deg, #4B0082, #D4AF37)' }} />
        <div className="relative flex items-center justify-between">
          {PARCOURS_DISCIPLE.map((p, i) => {
            const past = i < etapeIdx
            const current = i === etapeIdx
            return (
              <div key={p.etape} className="flex flex-col items-center gap-1.5" title={p.nom} style={{ flex: 1 }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-cinzel font-black text-[10px] transition-all duration-500"
                  style={{
                    background: past ? `${p.couleur}CC` : current ? `${p.couleur}22` : 'rgba(255,255,255,0.05)',
                    color: past ? '#1A0F00' : current ? p.couleur : 'rgba(255,255,255,0.25)',
                    border: current ? `1.5px solid ${p.couleur}` : '1px solid transparent',
                    boxShadow: current ? `0 0 14px ${p.couleur}55` : 'none',
                  }}>
                  {past ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i > etapeIdx ? <Lock className="w-3 h-3" /> : i + 1}
                </div>
                <span className="font-inter text-[8px] uppercase tracking-wide text-center hidden sm:block"
                  style={{ color: current ? p.couleur : 'rgba(255,255,255,0.25)', maxWidth: 56, lineHeight: 1.1 }}>
                  {p.nom}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Étape actuelle + prochaine */}
      <div className="rounded-xl p-4 mb-3" style={{ background: `${etape.couleur}10`, border: `1px solid ${etape.couleur}28` }}>
        <p className="font-inter text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Vous êtes</p>
        <p className="font-cinzel text-lg font-bold mb-1" style={{ color: etape.couleur }}>{etape.nom}</p>
        <p className="font-inter text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{etape.description}</p>
      </div>

      {suivante ? (
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(212,175,55,0.7)' }} />
          <p className="font-inter text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Prochaine étape : <span className="font-semibold" style={{ color: suivante.couleur }}>{suivante.nom}</span>
          </p>
        </div>
      ) : (
        <p className="font-inter text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Vous êtes envoyé pour multiplier. 🌍</p>
      )}

      <Link href="/member/dashboard/parcours"
        className="inline-flex items-center gap-2 w-full justify-center py-3 rounded-xl font-inter text-sm font-semibold transition-all hover:gap-3"
        style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
        Continuer mon parcours
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
