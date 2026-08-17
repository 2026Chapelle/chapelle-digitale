'use client'
/**
 * PODCAST-1 — Rail « ÉMISSIONS ». Séries dérivées DYNAMIQUEMENT de `serie` (jamais codées
 * en dur). Cover de repli intelligente (dernière cover de la série). Clic → filtre le catalogue.
 */
import { useRef } from 'react'
import { ChevronLeft, ChevronRight, Headphones } from 'lucide-react'
import { PodcastCover } from './PodcastCover'
import type { Emission } from '@/lib/podcast/sections'

export function EmissionsRail({
  emissions,
  onSelect,
}: {
  emissions: Emission[]
  onSelect: (serie: string) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  if (!emissions.length) return null
  const nudge = (dir: -1 | 1) => {
    const el = scroller.current
    if (el) el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: 'smooth' })
  }
  return (
    <section className="mb-10 md:mb-14" aria-label="Émissions">
      <div className="flex items-end justify-between mb-4 px-4 md:px-0">
        <div>
          <p className="section-label-dark mb-1">Séries audio</p>
          <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">Émissions</h2>
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
        {emissions.map((em) => (
          <button
            key={em.serie}
            type="button"
            onClick={() => onSelect(em.serie)}
            className="group snap-start w-44 sm:w-48 md:w-52 flex-shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] rounded-xl"
            aria-label={`Voir l'émission ${em.serie}`}
          >
            <PodcastCover src={em.cover} alt={em.serie} label={em.serie} sizes="(max-width: 640px) 176px, (max-width: 768px) 192px, 208px" className="transition-transform group-hover:scale-[1.02]" />
            <h3 className="mt-2.5 font-cinzel text-base font-bold text-pearl leading-snug line-clamp-2 group-hover:text-cinematic-gold transition-colors">{em.serie}</h3>
            {em.description && (
              <p className="mt-1 font-inter text-[11px] leading-snug line-clamp-2" style={{ color: 'rgba(245,230,216,0.55)' }}>
                {em.description}
              </p>
            )}
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-inter" style={{ color: 'rgba(245,230,216,0.45)' }}>
              <Headphones className="w-3 h-3 text-gold/70" />
              {em.count} épisode{em.count > 1 ? 's' : ''}
            </p>
          </button>
        ))}
      </div>
    </section>
  )
}
