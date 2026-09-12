import Image from 'next/image'
import Link from 'next/link'

import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers3,
} from 'lucide-react'

import { TeachingCatalogCard } from '@/components/teachings/TeachingCatalogCard'
import { listPublishedTeachingLibrary } from '@/lib/teachings/teaching-library-server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Enseignements — Citadelle du Royaume',
  description: 'Bibliothèque d’enseignements de la Citadelle : séries, saisons et enseignements.',
  alternates: { canonical: '/enseignements' },
}

export default async function EnseignementsPage() {
  const library = await listPublishedTeachingLibrary()
  const hasContent = library.series.length > 0 || library.standalone.length > 0

  return (
    <main className="min-h-screen bg-abyss pb-24">
      <section className="relative min-h-[560px] md:min-h-[640px] overflow-hidden flex items-center justify-center pt-24">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(196,149,42,0.17),transparent_58%)]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-abyss" />
        </div>

        <div className="container-royal relative z-10">
          <div className="mx-auto max-w-6xl text-center">
            <div className="mb-8 flex items-center justify-center gap-4 md:gap-6">
              <span className="h-px w-10 md:w-20 bg-gradient-to-r from-transparent to-gold/55" />

              <span className="inline-flex items-center gap-2 text-[11px] md:text-sm uppercase tracking-[0.3em] text-gold font-inter font-semibold">
                <GraduationCap className="w-4 h-4" />
                Bibliothèque du Royaume
              </span>

              <span className="h-px w-10 md:w-20 bg-gradient-to-l from-transparent to-gold/55" />
            </div>

            <h1 className="font-cinzel font-bold uppercase tracking-[-0.045em] leading-[0.88]">
              <span className="block text-[clamp(3.4rem,8.2vw,8.2rem)] text-pearl">
                Enseignements
              </span>

              <span className="mt-3 block text-[clamp(3rem,7.2vw,7.2rem)] text-cinematic-gold">
                du Royaume
              </span>
            </h1>

            <p className="mx-auto mt-10 max-w-3xl text-base md:text-xl lg:text-2xl text-pearl/55 font-inter leading-relaxed">
              Explorez des séries d’enseignement, avancez saison après saison
              et approfondissez les principes du Royaume.
            </p>
          </div>
        </div>
      </section>

      <div className="container-royal pt-12 md:pt-16">
        {!hasContent ? (
          <div className="card-cinematic p-10 text-center">
            <GraduationCap className="w-8 h-8 text-gold/50 mx-auto mb-3" />
            <p className="text-pearl/50 font-inter">
              Aucun enseignement publié pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {library.series.length > 0 && (
              <section>
                <div className="mb-7">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gold font-inter mb-2">
                    Parcours éditoriaux
                  </p>
                  <h2 className="font-cinzel text-2xl md:text-3xl font-bold text-pearl">
                    Séries d’enseignement
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm md:text-base text-pearl/55 font-inter leading-relaxed">
                    Chaque série rassemble plusieurs saisons autour d’une même progression spirituelle.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-7">
                  {library.series.map((series) => {
                    const firstTeaching =
                      series.seasons.flatMap((season) => season.teachings)[0] ||
                      series.teachingsWithoutSeason[0]

                    const cover =
                      series.cover_url ||
                      firstTeaching?.cover_url ||
                      null

                    const seasonCount = series.seasons.length

                    return (
                      <article key={series.id} className="card-cinematic overflow-hidden group">
                        <div className="relative aspect-[16/9] bg-white/5 overflow-hidden">
                          {cover ? (
                            <Image
                              src={cover}
                              alt={series.title}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Layers3 className="w-11 h-11 text-gold/25" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/15 to-transparent" />
                          <div className="absolute left-5 bottom-4 text-[10px] uppercase tracking-[0.2em] text-gold">
                            Série d’enseignement
                          </div>
                        </div>

                        <div className="p-6">
                          <h3 className="font-cinzel text-xl font-bold text-pearl">
                            {series.title}
                          </h3>
                          <p className="mt-3 text-sm leading-relaxed text-pearl/55 font-inter line-clamp-3">
                            {series.short_description ||
                              'Une série pour grandir dans la compréhension et la pratique des principes du Royaume.'}
                          </p>
                          <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-pearl/45 font-inter">
                            <span>{seasonCount} {seasonCount > 1 ? 'saisons' : 'saison'}</span>
                            <span>•</span>
                            <span>{series.teachingCount} {series.teachingCount > 1 ? 'enseignements' : 'enseignement'}</span>
                          </div>
                          <div className="mt-6 pt-5 border-t border-white/5">
                            <Link
                              href={`/enseignements/series/${series.slug}`}
                              className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors font-inter"
                            >
                              Explorer la série
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

            {library.standalone.length > 0 && (
              <section>
                <div className="mb-7">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-gold font-inter mb-2">
                    Bibliothèque
                  </p>
                  <h2 className="font-cinzel text-2xl md:text-3xl font-bold text-pearl flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-gold" />
                    Enseignements indépendants
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-7">
                  {library.standalone.map((teaching) => (
                    <TeachingCatalogCard key={teaching.id} teaching={teaching} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
