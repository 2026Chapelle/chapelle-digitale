/**
 * ReplayCard — carte replay (vignette + durée si disponible + bouton « Revoir »).
 * Purement présentationnel : `onOpen` est un callback optionnel (ouverture du
 * lecteur gérée par l'appelant, aucun appel réseau ici).
 */
import { Play, Calendar, Radio } from 'lucide-react'
import type { NormalizedLive } from '@/lib/live'
import { VideoThumbnail } from '@/components/video'

export interface ReplayCardProps {
  live: NormalizedLive
  onOpen?: () => void
  className?: string
}

/** Date FR courte (ex. « 24 août 2026 »), ou `null` si absente. */
function formatDate(date: Date | null): string | null {
  if (!date) return null
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
  } catch {
    return null
  }
}

/**
 * Durée du replay, si le back-office l'a renseignée sur la ligne brute
 * (champ non garanti par `RawCmsLive` — lecture défensive, jamais bloquante).
 */
function extractDuration(raw: NormalizedLive['raw']): string | null {
  const value = (raw as unknown as Record<string, unknown>)?.duration
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function ReplayCard({ live, onOpen, className = '' }: ReplayCardProps) {
  const dateLabel = formatDate(live.scheduledAt)
  const duration = extractDuration(live.raw)

  return (
    <div className={`group rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.35)] ${className}`}>
      <div className="relative">
        <VideoThumbnail thumbnailUrl={live.thumbnailUrl} title={live.title} state="replay" />
        {duration && (
          <span className="absolute bottom-2.5 right-2.5 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-lg font-mono">
            {duration}
          </span>
        )}
      </div>

      <div className="px-0.5 pt-2.5 pb-1">
        <h3 className="font-cinzel text-sm font-bold text-pearl line-clamp-2 group-hover:text-cinematic-gold transition-colors">
          {live.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
          {dateLabel && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gold/70" aria-hidden />
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
          onClick={onOpen}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-inter font-semibold transition-all hover:-translate-y-0.5"
          style={{ background: 'rgba(139,92,246,0.14)', color: '#C4B5FD', border: '1px solid rgba(139,92,246,0.3)' }}
        >
          <Play className="w-3.5 h-3.5" fill="currentColor" aria-hidden />
          Revoir
        </button>
      </div>
    </div>
  )
}
