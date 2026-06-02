'use client'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TUNNEL_STAGES, TUNNEL_BY_KEY, tunnelProgress, type TunnelStageKey } from '@/lib/tunnel'

interface TunnelProgressProps {
  /** Étape actuelle de l'utilisateur. */
  current: TunnelStageKey
  /** 'horizontal' (rail), 'vertical' (timeline) ou 'compact' (barre + label). */
  variant?: 'horizontal' | 'vertical' | 'compact'
  /** Rendre chaque étape cliquable vers sa page. */
  linked?: boolean
  className?: string
}

/**
 * Indicateur de progression du Tunnel Royal (7 étapes).
 * Réutilisé sur /parcours (public) et le dashboard membre.
 * Esthétique « Charbon & Lumière » : or royal, halos dorés.
 */
export function TunnelProgress({
  current,
  variant = 'horizontal',
  linked = false,
  className,
}: TunnelProgressProps) {
  const reduce = useReducedMotion()
  const currentIndex = TUNNEL_BY_KEY[current].index
  const pct = tunnelProgress(current)

  if (variant === 'compact') {
    const stage = TUNNEL_BY_KEY[current]
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2">
            <stage.icon className="w-4 h-4" style={{ color: stage.color }} />
            {stage.nom}
          </span>
          <span className="font-inter text-xs text-pearl/40">{pct}% du parcours</span>
        </div>
        <div className="progress-royal h-2">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #92721A, #D4AF37, #F5E6A7)' }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    )
  }

  if (variant === 'vertical') {
    return (
      <ol className={cn('relative', className)}>
        {TUNNEL_STAGES.map((stage, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          const Wrapper = (linked ? Link : 'div') as React.ElementType
          return (
            <li key={stage.key} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Rail */}
              {i < TUNNEL_STAGES.length - 1 && (
                <span
                  className="absolute left-[19px] top-10 bottom-0 w-px"
                  style={{ background: done ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)' }}
                />
              )}
              <Wrapper
                {...(linked ? { href: stage.href } : {})}
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative z-10 transition-all"
                style={{
                  background: active
                    ? 'linear-gradient(135deg, #F5E6A7, #D4AF37)'
                    : done
                      ? 'rgba(212,175,55,0.15)'
                      : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active || done ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: active ? '0 0 24px rgba(212,175,55,0.4)' : 'none',
                }}
              >
                {done ? (
                  <Check className="w-4 h-4 text-gold" />
                ) : (
                  <stage.icon
                    className="w-4 h-4"
                    style={{ color: active ? '#1A0F00' : stage.color }}
                  />
                )}
              </Wrapper>
              <div className="pt-1">
                <div
                  className="font-cinzel font-bold text-sm"
                  style={{ color: active ? '#F5E6A7' : done ? '#D4AF37' : 'rgba(255,255,255,0.6)' }}
                >
                  {stage.nom}
                </div>
                <div className="font-inter text-xs text-pearl/40 mt-0.5">{stage.role} — {stage.promesse}</div>
              </div>
            </li>
          )
        })}
      </ol>
    )
  }

  // horizontal (default)
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center">
        {TUNNEL_STAGES.map((stage, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          const Node = (linked ? Link : 'div') as React.ElementType
          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <Node
                  {...(linked ? { href: stage.href } : {})}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #F5E6A7, #D4AF37)'
                      : done
                        ? 'rgba(212,175,55,0.15)'
                        : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active || done ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: active ? '0 0 24px rgba(212,175,55,0.4)' : 'none',
                  }}
                >
                  {done ? (
                    <Check className="w-4 h-4 text-gold" />
                  ) : (
                    <stage.icon className="w-4 h-4" style={{ color: active ? '#1A0F00' : stage.color }} />
                  )}
                </Node>
                <span
                  className="font-inter text-[10px] sm:text-xs font-medium text-center hidden sm:block"
                  style={{ color: active ? '#F5E6A7' : done ? '#D4AF37' : 'rgba(255,255,255,0.4)' }}
                >
                  {stage.nom}
                </span>
              </div>
              {i < TUNNEL_STAGES.length - 1 && (
                <div className="flex-1 h-px mx-1 sm:mx-2 mb-6 sm:mb-7">
                  <div
                    className="h-full w-full"
                    style={{ background: done ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
