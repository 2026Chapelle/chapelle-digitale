import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, GraduationCap } from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { TeachingCatalogCard } from '@/components/teachings/TeachingCatalogCard'
import { listPublishedTeachingLibrary } from '@/lib/teachings/teaching-library-server'

export const dynamic = 'force-dynamic'

export default async function TeachingSeasonPage({
  params,
}: {
  params: {
    seriesSlug: string
    seasonKey: string
  }
}) {
  const match = params.seasonKey.match(/^saison-(\d+)$/)
  if (!match) notFound()

  const seasonNumber = Number(match[1])
  if (!Number.isInteger(seasonNumber) || seasonNumber < 1) notFound()

  const library = await listPublishedTeachingLibrary()
  const series = library.series.find((item) => item.slug === params.seriesSlug)
  if (!series) notFound()

  const season = series.seasons.find((item) => item.season_number === seasonNumber)
  if (!season) notFound()

  return (
    <main className="min-h-screen bg-abyss pt-28 pb-24">
      <div className="container-royal">
        <Link
          href={`/enseignements/series/${series.slug}`}
          className="mb-8 inline-flex items-center gap-2 text-sm text-pearl/45 hover:text-gold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {series.title}
        </Link>

        <PageHeader
          eyebrow={`${series.title} · Saison ${season.season_number}`}
          title={season.title || `Saison ${season.season_number}`}
          description={season.short_description || 'Une saison pour avancer dans la maturité et la compréhension du Royaume.'}
        />

        <section className="mt-12">
          {season.teachings.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-7">
              {season.teachings.map((teaching) => (
                <TeachingCatalogCard key={teaching.id} teaching={teaching} />
              ))}
            </div>
          ) : (
            <div className="card-cinematic p-10 text-center">
              <GraduationCap className="w-8 h-8 text-gold/45 mx-auto mb-3" />
              <p className="text-pearl/50 font-inter">
                Aucun enseignement publié dans cette saison pour le moment.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
