'use client'
/**
 * PODCAST-1 — Rail horizontal d'épisodes (carrousel scrollable) + carte média.
 * Réutilisé par « Pour toi », « À la une », « Nouveautés », « Populaire ». Mobile : scroll
 * tactile snap ; desktop : flèches discrètes. Une carte = COVER valorisée (~60-70 % de la
 * hauteur) + chip durée + play perceptible, puis titre / promesse CMS / série + accès.
 */
import { useRef } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { PodcastCover } from './PodcastCover'
import { PremiumBadge } from './PremiumBadge'
import { PlaylistMenuButton } from './PlaylistMenuButton'
import { ACCESS_LEVEL_LABELS } from '@/lib/podcast/editorial'

export interface RailEpisode {
  id: string
  title: string
  cover?: string | null
  serie?: string | null
  duration?: string
  /** Promesse courte (description CMS, déjà tronquée ~160c en amont). Optionnel : masqué si vide. */
  description?: string
  accessLevel?: 'public' | 'member' | 'premium'
  audioUrl?: string | null
}

/** Puce d'accès discrète (public/membre). Premium passe par <PremiumBadge> ailleurs. */
function AccessChip({ level }: { level: 'public' | 'member' }) {
  const isPublic = level === 'public'
  return (
    <span
      className="inline-flex items-center text-[9px] font-inter font-bold tracking-widest uppercase px-1.5 py-0.5 rounded flex-shrink-0"
      style={
        isPublic
          ? { background: 'rgba(74,222,128,0.14)', color: '#86efac', border: '1px solid rgba(74,222,128,0.3)' }
          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(245,230,216,0.6)', border: '1px solid rgba(255,255,255,0.12)' }
      }
    >
      {isPublic ? 'Gratuit' : ACCESS_LEVEL_LABELS.member}
    </span>
  )
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
    <div className="group relative w-48 sm:w-52 md:w-56 flex-shrink-0 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.4)]">
      {onAddToPlaylist && (
        <PlaylistMenuButton
          onClick={() => onAddToPlaylist(ep.id)}
          title={ep.title}
          className="absolute top-3 right-3 z-[5]"
        />
      )}
      <button
        type="button"
        onClick={() => onPlay(ep)}
        aria-label={playing ? 'Mettre en pause' : `Écouter ${ep.title}`}
        className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] rounded-xl"
      >
        {/* COVER — pièce maîtresse (aspect-square) : zoom + brightness au survol du group */}
        <div className="relative overflow-hidden rounded-xl [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.03] group-hover:[&_img]:brightness-110">
          <PodcastCover
            src={ep.cover}
            alt={ep.title}
            label={ep.serie || ep.title}
            sizes="(max-width: 640px) 192px, (max-width: 768px) 208px, 224px"
          />
          {premium && <PremiumBadge className="absolute top-2 left-2 z-[3]" />}
          {/* Chip durée (bas-droite) */}
          {ep.duration && (
            <span
              className="absolute bottom-2 right-2 z-[3] inline-flex items-center gap-1 text-[10px] font-inter font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(6,6,10,0.72)', color: 'rgba(245,230,216,0.9)', backdropFilter: 'blur(2px)' }}
            >
              <Clock className="w-2.5 h-2.5" aria-hidden />
              {ep.duration}
            </span>
          )}
          {/* Play — perceptible d'emblée (opacity-80), renforcé au survol / focus */}
          <span
            className="absolute bottom-2 left-2 z-[3] w-11 h-11 rounded-full flex items-center justify-center shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-105 group-focus-within:opacity-100 transition"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #b8952e)', color: '#1a1206' }}
            aria-hidden
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
          </span>
        </div>
        {/* Titre */}
        <h3 className="mt-2.5 px-0.5 font-inter text-sm font-semibold text-pearl leading-snug line-clamp-2">{ep.title}</h3>
        {/* Promesse CMS — masquée si vide (jamais fabriquée) */}
        {ep.description && (
          <p className="mt-1 px-0.5 font-inter text-[11px] leading-snug line-clamp-2" style={{ color: 'rgba(245,230,216,0.55)' }}>
            {ep.description}
          </p>
        )}
        {/* Méta : série (si présente) + accès (si pertinent) */}
        {(ep.serie || ep.accessLevel) && (
          <div className="mt-1.5 px-0.5 flex items-center gap-2 text-[11px] min-w-0">
            {ep.serie && <span className="truncate text-gold/70 font-medium min-w-0">{ep.serie}</span>}
            {premium ? (
              <PremiumBadge className="flex-shrink-0" />
            ) : (
              (ep.accessLevel === 'public' || ep.accessLevel === 'member') && <AccessChip level={ep.accessLevel} />
            )}
          </div>
        )}
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
