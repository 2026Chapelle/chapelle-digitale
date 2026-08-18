import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Layers, Headphones } from 'lucide-react'
import { PodcastHero } from '@/components/podcast/PodcastHero'
import { SeriesCard } from '@/components/podcast/SeriesCard'
import { siteUrl } from '@/lib/site-url'
import { ogImage } from '@/lib/og'
import {
  getShowBySlug, getPublishedSeriesForShow, getPublishedEpisodesForShow,
  countPublishedSeasonsBySeriesIds, countEpisodesForSeries,
} from '@/lib/podcast/spine-public'

// SEO : rendu serveur, contenu live (patron /articles). Fully crawlable.
export const dynamic = 'force-dynamic'

const plural = (n: number, s: string) => `${n} ${s}${n > 1 ? 's' : ''}`

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const show = await getShowBySlug(params.slug)
  if (!show) return { title: 'Émission introuvable | La Voix du Royaume' }
  const title = `${show.title} | La Voix du Royaume`
  const description = show.short_description || undefined
  return {
    title,
    description,
    alternates: { canonical: siteUrl(`/podcast/emissions/${show.slug}`) },
    openGraph: {
      title, description, type: 'website',
      images: [ogImage({ eyebrow: 'Émission', title: show.title, subtitle: show.short_description || undefined })],
    },
  }
}

export default async function EmissionPage({ params }: { params: { slug: string } }) {
  const show = await getShowBySlug(params.slug)
  if (!show) notFound()

  const [seriesList, episodes] = await Promise.all([
    getPublishedSeriesForShow(show.id),
    getPublishedEpisodesForShow(show.id),
  ])
  const seasonCounts = await countPublishedSeasonsBySeriesIds(seriesList.map((s) => s.id))

  const firstSeries = seriesList[0] ?? null
  const heroConfig = {
    eyebrow: 'Émission',
    title: show.title,
    description: show.short_description || show.description || null,
    image: show.cover_url || null,
    ctaLabel: firstSeries ? 'Découvrir la série' : null,
    ctaHref: firstSeries ? `/podcast/series/${firstSeries.slug}` : null,
  }

  return (
    <div className="min-h-screen pb-40 pt-24 md:pt-28">
      <div className="max-w-6xl mx-auto">
        <div className="px-4 md:px-0 mb-4">
          <Link href="/podcast" className="inline-flex items-center gap-2 text-pearl/50 hover:text-gold text-sm font-inter transition-colors">
            <ArrowLeft className="w-4 h-4" /> La Voix du Royaume
          </Link>
        </div>

        <PodcastHero hero={heroConfig} />

        {/* Compteurs réels */}
        <div className="px-4 md:px-0 -mt-4 mb-10 flex items-center gap-4 font-inter text-[13px]" style={{ color: 'rgba(245,230,216,0.5)' }}>
          <span className="inline-flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-gold/70" aria-hidden /> {plural(seriesList.length, 'série')}</span>
          <span className="inline-flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5 text-gold/70" aria-hidden /> {plural(episodes.length, 'épisode')}</span>
        </div>

        {/* À propos */}
        {show.description && show.description !== show.short_description && (
          <section className="px-4 md:px-0 mb-10" aria-label="À propos de l'émission">
            <p className="section-label-dark mb-3">À propos de l'émission</p>
            <p className="font-inter text-sm md:text-base leading-relaxed max-w-3xl" style={{ color: 'rgba(245,230,216,0.6)' }}>
              {show.description}
            </p>
          </section>
        )}

        {/* Séries */}
        <section className="px-4 md:px-0" aria-label="Séries">
          <p className="section-label-dark mb-1">Parcours audio</p>
          <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl mb-5">Séries de l'émission</h2>
          {seriesList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {seriesList.map((se) => (
                <SeriesCard
                  key={se.id}
                  href={`/podcast/series/${se.slug}`}
                  title={se.title}
                  shortDescription={se.short_description}
                  cover={se.cover_url}
                  seasonsCount={seasonCounts[se.id] ?? 0}
                  episodesCount={countEpisodesForSeries(episodes, se.id)}
                />
              ))}
            </div>
          ) : (
            <p className="font-inter text-sm py-6" style={{ color: 'rgba(245,230,216,0.4)' }}>Les séries de cette émission arrivent bientôt.</p>
          )}
        </section>
      </div>
    </div>
  )
}
