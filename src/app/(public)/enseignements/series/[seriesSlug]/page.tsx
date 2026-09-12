import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Layers3,
} from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
import { TeachingCatalogCard } from '@/components/teachings/TeachingCatalogCard'
import { listPublishedTeachingLibrary } from '@/lib/teachings/teaching-library-server'

export const dynamic = 'force-dynamic'

export default async function TeachingSeriesPage({
  params,
}: {
  params: { seriesSlug: string }
}) {
  const library = await listPublishedTeachingLibrary()
  const series = library.series.find((item) => item.slug === params.seriesSlug)

  if (!series) notFound()

  return (
    <main className="min-h-screen bg-abyss pt-28 pb-24">
      <div className="container-royal">
        <Link
          href="/enseignements"
          className="mb-8 inline-flex items-center gap-2 text-sm text-pearl/45 hover:text-gold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Bibliothèque du Royaume
        </Link>

        <PageHeader
          eyebrow="Série d’enseignement"
          title={series.title}
          description={series.short_description || 'Une série pour comprendre, grandir et vivre les principes du Royaume.'}
        />

        {series.seasons.length > 0 && (
          <section className="mt-12">
            <div className="mb-7">
              <p className="text-[11px] uppercase tracking-[0.24em] text-gold font-inter mb-2">
                Progression
              </p>
              <h2 className="font-cinzel text-2xl md:text-3xl font-bold text-pearl">
                Saisons
              </h2>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-7">
              {series.seasons.map((season) => {
                const firstTeaching = season.teachings[0]
                const cover =
                  season.cover_url ||
                  firstTeaching?.cover_url ||
                  series.cover_url ||
                  null

                return (
                  <article key={season.id} className="card-cinematic overflow-hidden group">
                    <div className="relative aspect-[16/9] bg-white/5 overflow-hidden">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={season.title || `Saison ${season.season_number}`}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Layers3 className="w-10 h-10 text-gold/25" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/20 to-transparent" />
                      <div className="absolute left-5 bottom-4 text-[10px] uppercase tracking-[0.2em] text-gold">
                        Saison {season.season_number}
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="text-xs text-pearl/40 font-inter">
                        Saison {season.season_number}
                      </p>
                      <h3 className="mt-2 font-cinzel text-xl font-bold text-pearl">
                        {season.title || `Saison ${season.season_number}`}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-pearl/55 font-inter line-clamp-3">
                        {season.short_description ||
                          'Poursuivez cette progression d’enseignement et de maturité.'}
                      </p>
                      <p className="mt-4 text-xs text-pearl/40 font-inter">
                        {season.teachings.length} {season.teachings.length > 1 ? 'enseignements' : 'enseignement'}
                      </p>
                      <div className="mt-6 pt-5 border-t border-white/5">
                        <Link
                          href={`/enseignements/series/${series.slug}/saison-${season.season_number}`}
                          className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
                        >
                          Découvrir la saison
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {series.teachingsWithoutSeason.length > 0 && (
          <section className="mt-16">
            <div className="mb-7">
              <h2 className="font-cinzel text-2xl font-bold text-pearl flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-gold" />
                Enseignements hors saison
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-7">
              {series.teachingsWithoutSeason.map((teaching) => (
                <TeachingCatalogCard key={teaching.id} teaching={teaching} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
