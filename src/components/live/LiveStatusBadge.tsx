/**
 * LiveStatusBadge — pastille d'état d'un live (FR), style Citadelle.
 * Purement présentationnel : reçoit l'état déjà calculé (`resolveLiveState`).
 */
import type { LiveState } from '@/lib/live'

export interface LiveStatusBadgeProps {
  state: LiveState
  className?: string
}

/** Point rouge pulsant (réutilisé du bloc « EN DIRECT » existant du site). */
function PulsingDot() {
  return (
    <span className="relative flex w-2 h-2" aria-hidden>
      <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping" />
      <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
    </span>
  )
}

export function LiveStatusBadge({ state, className = '' }: LiveStatusBadgeProps) {
  if (state === 'live') {
    return (
      <span className={`chip-live ${className}`}>
        <PulsingDot />
        EN DIRECT
      </span>
    )
  }

  if (state === 'upcoming') {
    return <span className={`chip-gold ${className}`}>À VENIR</span>
  }

  if (state === 'replay') {
    return <span className={`chip-royal ${className}`}>REPLAY</span>
  }

  // 'ended' — pastille neutre (aucune classe chip-* dédiée n'existe pour cet état).
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-inter uppercase tracking-wider ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(245,230,216,0.6)' }}
    >
      TERMINÉ
    </span>
  )
}
