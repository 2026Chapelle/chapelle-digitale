/**
 * PODCAST-SPINE — Carte Série (lien vers /podcast/series/[slug]).
 * Réutilise l'idiome visuel de l'émission-rail : cover valorisée + titre Cinzel +
 * promesse CMS (masquée si vide) + counts calculés + affordance « Voir la série ».
 * Server-safe (Link + PodcastCover). Aucun UUID affiché.
 */
import Link from 'next/link'
import { Layers, Headphones, ArrowRight } from 'lucide-react'
import { PodcastCover } from './PodcastCover'

export interface SeriesCardProps {
  href: string
  title: string
  shortDescription?: string | null
  cover?: string | null
  showTitle?: string | null
  seasonsCount: number
  episodesCount: number
}

const plural = (n: number, s: string) => `${n} ${s}${n > 1 ? 's' : ''}`

export function SeriesCard({ href, title, shortDescription, cover, showTitle, seasonsCount, episodesCount }: SeriesCardProps) {
  return (
    <Link
      href={href}
      className="group block w-full rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
    >
      <div className="relative overflow-hidden rounded-xl [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.03] group-hover:[&_img]:brightness-110">
        <PodcastCover src={cover} alt={title} label={title} sizes="(max-width: 640px) 45vw, 240px" />
      </div>
      <div className="px-0.5 pt-2.5 pb-1">
        {showTitle && (
          <p className="font-inter text-[10px] uppercase tracking-widest text-gold/70 mb-1 truncate">{showTitle}</p>
        )}
        <h3 className="font-cinzel text-base font-bold text-pearl line-clamp-2 group-hover:text-cinematic-gold transition-colors">
          {title}
        </h3>
        {shortDescription && (
          <p className="mt-1 font-inter text-[11px] leading-snug line-clamp-2" style={{ color: 'rgba(245,230,216,0.55)' }}>
            {shortDescription}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
          <span className="inline-flex items-center gap-1"><Layers className="w-3 h-3 text-gold/70" aria-hidden /> {plural(seasonsCount, 'saison')}</span>
          <span className="inline-flex items-center gap-1"><Headphones className="w-3 h-3 text-gold/70" aria-hidden /> {plural(episodesCount, 'épisode')}</span>
        </div>
        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-inter font-semibold text-gold group-hover:gap-2.5 transition-all">
          Voir la série <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}
