'use client'
/**
 * PODCAST-SPINE — Sections « Nos émissions » et « Séries à découvrir » de /podcast,
 * alimentées par les VRAIES entités relationnelles (cms_podcast_shows /
 * cms_podcast_series publiées). Présentation ÉDITORIALE horizontale (distincte des
 * rails d'épisodes) : une carte cover + méta + CTA, en grille qui évolue de 1 à 2
 * colonnes. Counts CALCULÉS (jamais codés en dur). Fail-safe : rien ne s'affiche
 * tant qu'aucune entité publiée n'existe. Le catalogue legacy (épisodes non
 * rattachés) reste servi ailleurs sur /podcast.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Layers, Headphones, ArrowRight } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { PodcastCover } from './PodcastCover'

interface ShowRow { id: string; slug: string; title: string; short_description?: string | null; cover_url?: string | null }
interface SeriesRow { id: string; show_id: string; slug: string; title: string; short_description?: string | null; cover_url?: string | null }

const plural = (n: number, s: string) => `${n} ${s}${n > 1 ? 's' : ''}`

/** Carte éditoriale horizontale (émission ou série). Toute la carte est cliquable
 *  (un seul Link, aucun élément interactif imbriqué). Hover premium discret. */
function EditorialCard({
  href, cover, label, title, parentShow, description, meta, cta,
}: {
  href: string
  cover?: string | null
  label?: string | null
  title: string
  parentShow?: string | null
  description?: string | null
  meta: React.ReactNode
  cta: string
}) {
  return (
    <Link
      href={href}
      className="group flex gap-3.5 sm:gap-4 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.4)] hover:shadow-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
    >
      <div className="w-24 sm:w-32 md:w-40 flex-shrink-0 overflow-hidden rounded-xl [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.04] group-hover:[&_img]:brightness-110">
        <PodcastCover src={cover} alt={title} label={title} sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 160px" />
      </div>
      <div className="min-w-0 flex flex-col py-0.5">
        {label && <p className="font-inter text-[10px] uppercase tracking-widest text-gold/70 mb-1">{label}</p>}
        <h3 className="font-cinzel text-base md:text-lg font-bold text-pearl leading-tight line-clamp-2 group-hover:text-cinematic-gold transition-colors">
          {title}
        </h3>
        {parentShow && <p className="font-inter text-[11px] text-gold/60 mt-0.5 truncate">{parentShow}</p>}
        {description && (
          <p className="mt-1.5 font-inter text-[11px] sm:text-xs leading-snug line-clamp-2" style={{ color: 'rgba(245,230,216,0.55)' }}>
            {description}
          </p>
        )}
        <div className="mt-auto pt-2.5 flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2.5 font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>{meta}</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-inter font-semibold text-gold group-hover:gap-2.5 transition-all">
            {cta} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}

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
  const seriesForShow = (showId: string) => series.filter((se) => se.show_id === showId)
  const episodesForShow = (showId: string) => seriesForShow(showId).reduce((n, se) => n + (episodesBySeries[se.id] ?? 0), 0)

  // Grille éditoriale : 1 carte ≈ 50 % (md+), évolue naturellement vers 2 colonnes.
  const gridCls = 'grid grid-cols-1 md:grid-cols-2 gap-4'

  return (
    <>
      {shows.length > 0 && (
        <section className="mb-10 md:mb-14 px-4 md:px-0" aria-label="Nos émissions">
          <div className="mb-4">
            <p className="section-label-dark mb-1">Nos émissions</p>
            <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">Émissions</h2>
          </div>
          <div className={gridCls}>
            {shows.map((sh) => (
              <EditorialCard
                key={sh.id}
                href={`/podcast/emissions/${sh.slug}`}
                cover={sh.cover_url}
                title={sh.title}
                description={sh.short_description}
                meta={<>
                  <span className="inline-flex items-center gap-1"><Layers className="w-3 h-3 text-gold/70" aria-hidden /> {plural(seriesForShow(sh.id).length, 'série')}</span>
                  <span className="inline-flex items-center gap-1"><Headphones className="w-3 h-3 text-gold/70" aria-hidden /> {plural(episodesForShow(sh.id), 'épisode')}</span>
                </>}
                cta="Découvrir l'émission"
              />
            ))}
          </div>
        </section>
      )}

      {series.length > 0 && (
        <section className="mb-10 md:mb-14 px-4 md:px-0" aria-label="Séries à découvrir">
          <div className="mb-4">
            <p className="section-label-dark mb-1">Parcours audio</p>
            <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">Séries à découvrir</h2>
          </div>
          <div className={gridCls}>
            {series.map((se) => (
              <EditorialCard
                key={se.id}
                href={`/podcast/series/${se.slug}`}
                cover={se.cover_url}
                label="Série"
                title={se.title}
                parentShow={showTitleById.get(se.show_id) ?? null}
                description={se.short_description}
                meta={<>
                  <span className="inline-flex items-center gap-1"><Layers className="w-3 h-3 text-gold/70" aria-hidden /> {plural(seasonsBySeries[se.id] ?? 0, 'saison')}</span>
                  <span className="inline-flex items-center gap-1"><Headphones className="w-3 h-3 text-gold/70" aria-hidden /> {plural(episodesBySeries[se.id] ?? 0, 'épisode')}</span>
                </>}
                cta="Voir la série"
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
