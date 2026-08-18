'use client'
/**
 * PODCAST-SPINE — Carte « Édition spéciale » (episode_type='special').
 * Traitement éditorial mis en valeur (écrin or/violet, cover large paysage, CTA
 * fort). La durée affichée vient de l'épisode ; le format 15–20 min est éditorial,
 * jamais une contrainte technique. Rendu UNIQUEMENT si un tel épisode existe
 * réellement (contrôlé par l'appelant). Lecture via le gate serveur (requestPlay).
 */
import { Play, Pause, Sparkles, Clock } from 'lucide-react'
import { PodcastCover } from './PodcastCover'

export interface SpecialEditionEpisode {
  id: string; title: string; description?: string; cover?: string | null
  duration?: string; accessLevel?: 'public' | 'member' | 'premium'; serie?: string | null
}

export function SpecialEditionCard({
  ep, onPlay, playing,
}: {
  ep: SpecialEditionEpisode
  onPlay: (ep: SpecialEditionEpisode) => void
  playing: boolean
}) {
  return (
    <section aria-label="Édition spéciale" className="mb-8">
      <div
        className="group relative overflow-hidden rounded-2xl md:rounded-3xl grid md:grid-cols-[220px_1fr] gap-0 md:gap-6 p-4 md:p-5 card-cinematic-gold"
        style={{ border: '1px solid rgba(212,175,55,0.3)' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(212,175,55,0.14), transparent 60%)' }}
          aria-hidden
        />
        {/* Cover paysage */}
        <div className="relative z-[1] w-full max-w-[220px] mx-auto md:mx-0 overflow-hidden rounded-xl [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.03]">
          <PodcastCover src={ep.cover} alt={ep.title} label={ep.title} sizes="220px" />
        </div>
        {/* Texte */}
        <div className="relative z-[1] flex flex-col justify-center mt-3 md:mt-0">
          <span
            className="inline-flex items-center gap-1.5 self-start text-[9px] font-inter font-bold tracking-widest uppercase px-2 py-0.5 rounded mb-2"
            style={{ background: 'rgba(212,175,55,0.16)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.4)' }}
          >
            <Sparkles className="w-2.5 h-2.5" aria-hidden />
            Édition spéciale{ep.duration ? ` · ${ep.duration}` : ''}
          </span>
          <h3 className="font-cinzel text-lg md:text-xl font-bold text-pearl leading-tight">{ep.title}</h3>
          {ep.description && (
            <p className="mt-1.5 font-inter text-sm leading-relaxed line-clamp-3" style={{ color: 'rgba(245,230,216,0.6)' }}>
              {ep.description}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onPlay(ep)}
              aria-label={playing ? 'Mettre en pause' : `Écouter l'édition spéciale ${ep.title}`}
              className="btn-gold-cinematic inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
              style={{ padding: '10px 20px', fontSize: '0.85rem' }}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" fill="currentColor" />}
              {playing ? 'En cours' : "Écouter l'édition spéciale"}
            </button>
            {ep.duration && (
              <span className="inline-flex items-center gap-1 font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
                <Clock className="w-3 h-3" aria-hidden /> {ep.duration}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
