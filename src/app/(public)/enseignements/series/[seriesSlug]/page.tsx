import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Layers3,
} from 'lucide-react'

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
    <main className="min-h-screen bg-abyss pb-24">
      <section className="relative min-h-[500px] md:min-h-[580px] overflow-hidden flex items-center justify-center">
        {series.cover_url ? (
          <Image
            src={series.cover_url}
            alt={series.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : (
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,149,42,0.16),transparent_58%)]"
            aria-hidden="true"
          />
        )}

        <div
          className="absolute inset-0 bg-gradient-to-b from-abyss/55 via-abyss/70 to-abyss"
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,149,42,0.12),transparent_60%)]"
          aria-hidden="true"
        />

        <div className="container-royal relative z-10 pt-28 pb-20">
          <div className="absolute top-28 left-4 md:left-8">
            <Link
              href="/enseignements"
              className="inline-flex items-center gap-2 text-sm text-pearl/65 hover:text-gold transition-colors font-inter"
            >
              <ArrowLeft className="w-4 h-4" />
              Bibliothèque du Royaume
            </Link>
          </div>

          <div className="mx-auto max-w-5xl text-center pt-16">
            <div className="mb-7 flex items-center justify-center gap-4 md:gap-6">
              <span className="h-px w-10 md:w-20 bg-gradient-to-r from-transparent to-gold/60" />
              <span className="text-[11px] md:text-sm uppercase tracking-[0.28em] text-gold font-inter font-semibold">
                Série d’enseignement
              </span>
              <span className="h-px w-10 md:w-20 bg-gradient-to-l from-transparent to-gold/60" />
            </div>

            <h1 className="font-cinzel font-bold uppercase tracking-[-0.04em] leading-[0.92] text-[clamp(3rem,7vw,6.5rem)] text-pearl drop-shadow-[0_8px_30px_rgba(0,0,0,0.65)]">
              {series.title}
            </h1>

            <p className="mx-auto mt-8 max-w-3xl text-base md:text-xl text-pearl/80 font-inter leading-relaxed drop-shadow-[0_3px_14px_rgba(0,0,0,0.8)]">
              {series.short_description ||
                'Une série d’enseignement pour comprendre les principes du Royaume de Dieu, grandir en maturité et apprendre à vivre comme héritier responsable.'}
            </p>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-abyss"
          aria-hidden="true"
        />
      </section>

      <div className="container-royal pt-12 md:pt-14">
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
