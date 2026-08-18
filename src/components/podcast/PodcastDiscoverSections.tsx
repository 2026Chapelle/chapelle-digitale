'use client'
/**
 * PODCAST-SPINE — Sections « Émissions » et « Séries à découvrir » de /podcast,
 * alimentées par les VRAIES entités relationnelles (cms_podcast_shows /
 * cms_podcast_series publiées), et non plus par des épisodes groupés par texte.
 * Les counts (saisons / épisodes) sont CALCULÉS, jamais codés en dur. Fail-safe :
 * rien ne s'affiche tant qu'aucune entité publiée n'existe. Le catalogue legacy
 * (épisodes non rattachés, ex. « Les Mystères ») reste servi ailleurs sur /podcast.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { PodcastCover } from './PodcastCover'
import { SeriesCard } from './SeriesCard'

interface ShowRow { id: string; slug: string; title: string; short_description?: string | null; cover_url?: string | null }
interface SeriesRow { id: string; show_id: string; slug: string; title: string; short_description?: string | null; cover_url?: string | null }

export function PodcastDiscoverSections() {
  const [shows, setShows] = useState<ShowRow[]>([])
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [seasonsBySeries, setSeasonsBySeries] = useState<Record<string, number>>({})
  const [episodesBySeries, setEpisodesBySeries] = useState<Record<string, number>>({})

  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const [showsRes, seriesRes, seasonsRes, epsRes] = await Promise.all([
          supabase.from('cms_podcast_shows').select('id, slug, title, short_description, cover_url').eq('status', 'published').order('sort_order', { ascending: true }),
          supabase.from('cms_podcast_series').select('id, show_id, slug, title, short_description, cover_url').eq('status', 'published').order('sort_order', { ascending: true }),
          supabase.from('cms_podcast_seasons').select('series_id').eq('status', 'published'),
          supabase.from('cms_podcasts').select('series_id').eq('status', 'published').not('series_id', 'is', null),
        ])
        if (cancelled) return
        setShows((showsRes.data as ShowRow[]) ?? [])
        setSeries((seriesRes.data as SeriesRow[]) ?? [])
        const sc: Record<string, number> = {}
        for (const r of (seasonsRes.data as Array<{ series_id: string }> | null) ?? []) sc[r.series_id] = (sc[r.series_id] ?? 0) + 1
        setSeasonsBySeries(sc)
        const ec: Record<string, number> = {}
        for (const r of (epsRes.data as Array<{ series_id: string }> | null) ?? []) ec[r.series_id] = (ec[r.series_id] ?? 0) + 1
        setEpisodesBySeries(ec)
      } catch { /* fail-safe : sections masquées */ }
    })()
    return () => { cancelled = true }
  }, [])

  const showTitleById = new Map(shows.map((s) => [s.id, s.title]))

  return (
    <>
      {shows.length > 0 && (
        <section className="mb-10 md:mb-14" aria-label="Émissions">
          <div className="mb-4 px-4 md:px-0">
            <p className="section-label-dark mb-1">Nos émissions</p>
            <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">Émissions</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto snap-x px-4 md:px-0 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {shows.map((sh) => (
              <Link
                key={sh.id}
                href={`/podcast/emissions/${sh.slug}`}
                className="group snap-start w-44 sm:w-48 md:w-52 flex-shrink-0 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
              >
                <div className="relative overflow-hidden rounded-xl [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.03] group-hover:[&_img]:brightness-110">
                  <PodcastCover src={sh.cover_url} alt={sh.title} label={sh.title} sizes="(max-width: 640px) 176px, 208px" />
                </div>
                <div className="px-0.5 pt-2.5">
                  <h3 className="font-cinzel text-base font-bold text-pearl line-clamp-2 group-hover:text-cinematic-gold transition-colors">{sh.title}</h3>
                  {sh.short_description && (
                    <p className="mt-1 font-inter text-[11px] leading-snug line-clamp-2" style={{ color: 'rgba(245,230,216,0.55)' }}>{sh.short_description}</p>
                  )}
                  <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-inter font-semibold text-gold group-hover:gap-2.5 transition-all">
                    Voir l'émission <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {series.length > 0 && (
        <section className="mb-10 md:mb-14" aria-label="Séries à découvrir">
          <div className="mb-4 px-4 md:px-0">
            <p className="section-label-dark mb-1">Parcours audio</p>
            <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">Séries à découvrir</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto snap-x px-4 md:px-0 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {series.map((se) => (
              <div key={se.id} className="snap-start w-44 sm:w-48 md:w-52 flex-shrink-0">
                <SeriesCard
                  href={`/podcast/series/${se.slug}`}
                  title={se.title}
                  shortDescription={se.short_description}
                  cover={se.cover_url}
                  showTitle={showTitleById.get(se.show_id) ?? null}
                  seasonsCount={seasonsBySeries[se.id] ?? 0}
                  episodesCount={episodesBySeries[se.id] ?? 0}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
