/**
 * UpcomingLiveCard — carte « à venir » : date, plateforme, CTA « Me rappeler ».
 * Purement présentationnel : `onRemind` est un callback optionnel fourni par
 * l'appelant (aucun appel réseau ici — le rappel réel est géré ailleurs).
 */
import { CalendarClock, Bell, Radio } from 'lucide-react'
import type { NormalizedLive } from '@/lib/live'
import { VideoThumbnail } from '@/components/video'
import { LiveStatusBadge } from './LiveStatusBadge'

export interface UpcomingLiveCardProps {
  live: NormalizedLive
  onRemind?: () => void
  className?: string
}

/** Date FR longue (ex. « dimanche 24 août, 10:30 »), ou `null` si absente. */
function formatScheduledAt(date: Date | null): string | null {
  if (!date) return null
  try {
    const formatted = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }).format(date)
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  } catch {
    return null
  }
}

export function UpcomingLiveCard({ live, onRemind, className = '' }: UpcomingLiveCardProps) {
  const dateLabel = formatScheduledAt(live.scheduledAt)

  return (
    <div className={`rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-2 transition-all duration-300 hover:border-[rgba(212,175,55,0.35)] ${className}`}>
      <VideoThumbnail thumbnailUrl={live.thumbnailUrl} title={live.title} state={live.state} />
      <div className="px-0.5 pt-2.5 pb-1">
        <div className="mb-1.5">
          <LiveStatusBadge state={live.state} />
        </div>
        <h3 className="font-cinzel text-sm font-bold text-pearl line-clamp-2">{live.title}</h3>

        <div className="mt-1.5 flex items-center gap-2 flex-wrap font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
          {dateLabel && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="w-3 h-3 text-gold/70" aria-hidden />
              {dateLabel}
            </span>
          )}
          {live.platform && (
            <span className="inline-flex items-center gap-1">
              <Radio className="w-3 h-3 text-gold/70" aria-hidden />
              {live.platform}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRemind}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-inter font-semibold transition-all hover:-translate-y-0.5"
          style={{ background: 'rgba(212,175,55,0.14)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          <Bell className="w-3.5 h-3.5" aria-hidden />
          Me rappeler
        </button>
      </div>
    </div>
  )
}
