import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Layers, Headphones, Radio } from 'lucide-react'
import { PodcastHero } from '@/components/podcast/PodcastHero'
import { SeasonExplorer, type SeasonView } from '@/components/podcast/SeasonExplorer'
import { SeriesStartCta } from '@/components/podcast/SeriesStartCta'
import { siteUrl } from '@/lib/site-url'
import { ogImage } from '@/lib/og'
import {
  getSeriesBySlug, getShowById, getPublishedSeasonsForSeries, getPublishedEpisodesForSeries,
  groupEpisodesBySeason, resolveCover, seasonDisplayTitle, type SpineEpisode,
} from '@/lib/podcast/spine-public'

export const dynamic = 'force-dynamic'

const plural = (n: number, s: string) => `${n} ${s}${n > 1 ? 's' : ''}`

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const series = await getSeriesBySlug(params.slug)
  if (!series) return { title: 'Série introuvable | La Voix du Royaume' }
  const show = series.show_id ? await getShowById(series.show_id) : null
  const parent = show?.title || 'La Voix du Royaume'
  const title = `${series.title} | ${parent}`
  const description = series.short_description || undefined
  return {
    title,
    description,
    alternates: { canonical: siteUrl(`/podcast/series/${series.slug}`) },
    openGraph: {
      title, description, type: 'website',
      images: [ogImage({ eyebrow: 'Série', title: series.title, subtitle: parent })],
    },
  }
}

export default async function SeriesPage({
  params, searchParams,
}: {
  params: { slug: string }
  searchParams: { saison?: string }
}) {
  const series = await getSeriesBySlug(params.slug)
  if (!series) notFound()

  const [show, seasons, episodes] = await Promise.all([
    series.show_id ? getShowById(series.show_id) : Promise.resolve(null),
    getPublishedSeasonsForSeries(series.id),
    getPublishedEpisodesForSeries(series.id),
  ])

  const grouped = groupEpisodesBySeason(episodes)
  const seasonViews: SeasonView[] = seasons.map((s) => ({
    id: s.id,
    number: s.season_number,
    title: seasonDisplayTitle(s),
    shortDescription: s.short_description ?? null,
    description: s.description ?? null,
    cover: resolveCover(s, series, show),
  }))
  const episodesBySeason: Record<number, SpineEpisode[]> = {}
  for (const s of seasons) episodesBySeason[s.season_number] = grouped.get(s.id) ?? []

  const requested = Number(searchParams?.saison)
  const initialSaison = seasons.some((s) => s.season_number === requested)
    ? requested
    : (seasons[0]?.season_number ?? 1)

  // Hero SANS CTA lien : l'action primaire « Commencer la série » (lecture) est
  // rendue par SeriesStartCta ci-dessous ; la navigation vers l'émission reste
  // secondaire (fil d'Ariane + méta « Radio »).
  const heroConfig = {
    eyebrow: 'Série',
    title: series.title,
    description: series.short_description || series.description || null,
    image: resolveCover(null, series, show),
    ctaLabel: null,
    ctaHref: null,
  }
  // Premier chapitre (saison la plus basse) pour cibler « Commencer la série ».
  const firstSeasonEpisodes = seasons.length ? (episodesBySeason[seasons[0].season_number] ?? []) : []

  return (
    <div className="min-h-screen pb-40 pt-24 md:pt-28">
      <div className="max-w-6xl mx-auto">
        <div className="px-4 md:px-0 mb-4 flex items-center gap-2 text-sm font-inter">
          <Link href="/podcast" className="inline-flex items-center gap-2 text-pearl/50 hover:text-gold transition-colors">
            <ArrowLeft className="w-4 h-4" /> La Voix du Royaume
          </Link>
          {show && (
            <>
              <span className="text-pearl/25">/</span>
              <Link href={`/podcast/emissions/${show.slug}`} className="text-pearl/50 hover:text-gold transition-colors truncate">{show.title}</Link>
            </>
          )}
        </div>

        <PodcastHero hero={heroConfig} imageFit="contain" />

        {/* Action primaire : Commencer la série (lecture via gate serveur). */}
        {firstSeasonEpisodes.length > 0 && (
          <div className="px-4 md:px-0 -mt-4 mb-6">
            <SeriesStartCta episodes={firstSeasonEpisodes} />
          </div>
        )}

        {/* Émission parente + compteurs réels (navigation secondaire) */}
        <div className="px-4 md:px-0 mb-8 flex flex-wrap items-center gap-4 font-inter text-[13px]" style={{ color: 'rgba(245,230,216,0.5)' }}>
          {show && (
            <Link href={`/podcast/emissions/${show.slug}`} className="inline-flex items-center gap-1.5 hover:text-gold transition-colors">
              <Radio className="w-3.5 h-3.5 text-gold/70" aria-hidden /> {show.title}
            </Link>
          )}
          <span className="inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-gold/70" aria-hidden /> {plural(seasons.length, 'saison')}</span>
          <span className="inline-flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5 text-gold/70" aria-hidden /> {plural(episodes.length, 'épisode')}</span>
        </div>

        {/* À propos */}
        {series.description && series.description !== series.short_description && (
          <section className="px-4 md:px-0 mb-9" aria-label="À propos de la série">
            <p className="section-label-dark mb-3">À propos</p>
            <p className="font-inter text-sm md:text-base leading-relaxed max-w-3xl" style={{ color: 'rgba(245,230,216,0.6)' }}>
              {series.description}
            </p>
          </section>
        )}

        {/* Saisons + épisodes (île cliente) */}
        {seasons.length > 0 ? (
          <SeasonExplorer seasons={seasonViews} episodesBySeason={episodesBySeason} initialSaison={initialSaison} />
        ) : (
          <p className="px-4 md:px-0 font-inter text-sm py-8" style={{ color: 'rgba(245,230,216,0.4)' }}>Les saisons de cette série arrivent bientôt.</p>
        )}
      </div>
    </div>
  )
}
