'use client'
/**
 * PODCAST-2 — Section « Continuer l'écoute ». Affiche UNIQUEMENT des épisodes réellement
 * commencés et non terminés (données serveur audio_progress) — aucune progression simulée.
 */
import { useRef } from 'react'
import { Play, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { PodcastCover } from './PodcastCover'
import { PremiumBadge } from './PremiumBadge'
import { PlaylistMenuButton } from './PlaylistMenuButton'
import type { RailEpisode } from './EpisodeRail'

export interface ContinueCard extends RailEpisode {
  positionSeconds: number
  percent: number
  remainingSeconds: number
}

function fmtRemaining(s: number): string {
  if (s <= 0) return ''
  const m = Math.round(s / 60)
  if (m < 1) return 'moins d’1 min restante'
  return `${m} min restante${m > 1 ? 's' : ''}`
}

export function ContinueListening({
  items,
  onResume,
  isPlaying,
  onAddToPlaylist,
}: {
  items: ContinueCard[]
  onResume: (ep: ContinueCard) => void
  isPlaying: (id: string) => boolean
  /** PODCAST-7 : menu ⋯ « Ajouter à une playlist » (membre) — n'affecte pas audio_progress. */
  onAddToPlaylist?: (episodeId: string) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  if (!items.length) return null
  const nudge = (dir: -1 | 1) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: 'smooth' })
  }
  return (
    <section className="mb-10 md:mb-14" aria-label="Continuer l'écoute">
      <div className="flex items-end justify-between mb-4 px-4 md:px-0">
        <div>
          <p className="section-label-dark mb-1">Reprendre</p>
          <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">Continuer l’écoute</h2>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button type="button" onClick={() => nudge(-1)} aria-label="Précédent"
            className="w-9 h-9 rounded-full flex items-center justify-center text-pearl/60 hover:text-gold transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => nudge(1)} aria-label="Suivant"
            className="w-9 h-9 rounded-full flex items-center justify-center text-pearl/60 hover:text-gold transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x px-4 md:px-0 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((ep) => {
          const playing = isPlaying(ep.id)
          const pct = Math.round(Math.min(1, Math.max(0, ep.percent)) * 100)
          return (
            <div key={ep.id} className="group relative snap-start w-52 sm:w-56 md:w-60 flex-shrink-0">
              {onAddToPlaylist && (
                <PlaylistMenuButton onClick={() => onAddToPlaylist(ep.id)} title={ep.title} className="absolute top-2 right-2 z-[4]" />
              )}
              <button
                type="button"
                onClick={() => onResume(ep)}
                aria-label={`Reprendre ${ep.title}`}
                className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] rounded-xl"
              >
                <div className="relative">
                  <PodcastCover src={ep.cover} alt={ep.title} label={ep.serie || ep.title} sizes="(max-width: 640px) 208px, (max-width: 768px) 224px, 240px" />
                  {ep.accessLevel === 'premium' && <PremiumBadge className="absolute top-2 left-2 z-[3]" />}
                  <span className="absolute bottom-2 right-2 z-[3] w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #b8952e)', color: '#1a1206' }} aria-hidden>
                    {playing ? <Play className="w-5 h-5" fill="currentColor" /> : <RotateCcw className="w-5 h-5" />}
                  </span>
                </div>
                {/* Barre de progression RÉELLE */}
                <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}
                  role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #D4AF37, #F5E6A7)' }} />
                </div>
                <h3 className="mt-2 font-inter text-sm font-semibold text-pearl leading-snug line-clamp-1">{ep.title}</h3>
                <div className="mt-0.5 flex items-center justify-between text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
                  {ep.serie && <span className="truncate text-gold/70 font-medium">{ep.serie}</span>}
                  {ep.remainingSeconds > 0 && <span className="flex-shrink-0">{fmtRemaining(ep.remainingSeconds)}</span>}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
