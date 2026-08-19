/**
 * LiveProgramCard — carte compacte pour un live (grille programme/replays).
 * Purement présentationnel : reçoit un `NormalizedLive` déjà résolu (état,
 * source, miniature). `onOpen` est optionnel et ne déclenche aucun effet réseau.
 */
import { Radio } from 'lucide-react'
import type { NormalizedLive } from '@/lib/live'
import { VideoThumbnail } from '@/components/video'
import { LiveStatusBadge } from './LiveStatusBadge'

export interface LiveProgramCardProps {
  live: NormalizedLive
  onOpen?: () => void
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

export function LiveProgramCard({ live, onOpen, className = '' }: LiveProgramCardProps) {
  const dateLabel = formatScheduledAt(live.scheduledAt)
  const interactive = Boolean(onOpen)

  const content = (
    <>
      <VideoThumbnail thumbnailUrl={live.thumbnailUrl} title={live.title} state={live.state} />
      <div className="px-0.5 pt-2.5 pb-1">
        <div className="mb-1.5">
          <LiveStatusBadge state={live.state} />
        </div>
        <h3 className="font-cinzel text-sm font-bold text-pearl line-clamp-2 group-hover:text-cinematic-gold transition-colors">
          {live.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
          {dateLabel && <span>{dateLabel}</span>}
          {live.platform && (
            <span className="inline-flex items-center gap-1">
              <Radio className="w-3 h-3 text-gold/70" aria-hidden />
              {live.platform}
            </span>
          )}
        </div>
      </div>
    </>
  )

  const baseClass = `group block w-full text-left rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.4)] ${className}`

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={`${baseClass} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]`}
      >
        {content}
      </button>
    )
  }

  return <div className={baseClass}>{content}</div>
}
