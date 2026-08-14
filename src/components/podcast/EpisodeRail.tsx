'use client'
/**
 * PODCAST-1 — Rail horizontal d'épisodes (carrousel scrollable) + carte cover.
 * Réutilisé par « À la une » et « Nouveautés ». Mobile : scroll tactile ; desktop :
 * flèches discrètes. Une carte = cover valorisée + play intelligent + badge Premium.
 */
import { useRef } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { PodcastCover } from './PodcastCover'
import { PremiumBadge } from './PremiumBadge'
import { PlaylistMenuButton } from './PlaylistMenuButton'

export interface RailEpisode {
  id: string
  title: string
  cover?: string | null
  serie?: string | null
  duration?: string
  accessLevel?: 'public' | 'member' | 'premium'
  audioUrl?: string | null
}

export function EpisodeCoverCard({
  ep,
  onPlay,
  playing,
  onAddToPlaylist,
}: {
  ep: RailEpisode
  onPlay: (ep: RailEpisode) => void
  playing: boolean
  /** PODCAST-7 : si fourni (membre connecté), affiche le menu ⋯ « Ajouter à une playlist ». */
  onAddToPlaylist?: (episodeId: string) => void
}) {
  const premium = ep.accessLevel === 'premium'
  return (
    <div className="group relative w-40 sm:w-44 md:w-48 flex-shrink-0">
      {onAddToPlaylist && (
        <PlaylistMenuButton
          onClick={() => onAddToPlaylist(ep.id)}
          title={ep.title}
          className="absolute top-2 right-2 z-[4]"
        />
      )}
      <button
        type="button"
        onClick={() => onPlay(ep)}
        aria-label={`Écouter ${ep.title}`}
        className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] rounded-xl"
      >
        <div className="relative">
          <PodcastCover src={ep.cover} alt={ep.title} label={ep.serie || ep.title} sizes="192px" />
          {premium && <PremiumBadge className="absolute top-2 left-2 z-[3]" />}
          {/* Bouton lecture flottant (apparait au survol / focus) */}
          <span
            className="absolute bottom-2 right-2 z-[3] w-10 h-10 rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 transition-all"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #b8952e)', color: '#1a1206' }}
            aria-hidden
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
          </span>
        </div>
        <h3 className="mt-2.5 font-inter text-sm font-semibold text-pearl leading-snug line-clamp-2">{ep.title}</h3>
        <div className="mt-1 flex items-center gap-2 text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
          {ep.serie && <span className="truncate text-gold/70 font-medium">{ep.serie}</span>}
          {ep.duration && (
            <span className="inline-flex items-center gap-1 flex-shrink-0"><Clock className="w-3 h-3" />{ep.duration}</span>
          )}
        </div>
      </button>
    </div>
  )
}

export function EpisodeRail({
  title,
  episodes,
  onPlay,
  isPlaying,
  eyebrow,
  onAddToPlaylist,
}: {
  title: string
  eyebrow?: string
  episodes: RailEpisode[]
  onPlay: (ep: RailEpisode) => void
  isPlaying: (id: string) => boolean
  onAddToPlaylist?: (episodeId: string) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  if (!episodes.length) return null
  const nudge = (dir: -1 | 1) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: 'smooth' })
  }
  return (
    <section className="mb-10 md:mb-14" aria-label={title}>
      <div className="flex items-end justify-between mb-4 px-4 md:px-0">
        <div>
          {eyebrow && <p className="section-label-dark mb-1">{eyebrow}</p>}
          <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">{title}</h2>
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
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-4 md:px-0 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {episodes.map((ep) => (
          <div key={ep.id} className="snap-start">
            <EpisodeCoverCard ep={ep} onPlay={onPlay} playing={isPlaying(ep.id)} onAddToPlaylist={onAddToPlaylist} />
          </div>
        ))}
      </div>
    </section>
  )
}
