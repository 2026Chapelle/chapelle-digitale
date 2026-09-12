import Image from 'next/image'
import Link from 'next/link'

import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Layers3,
} from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'
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
    <main className="min-h-screen bg-abyss pt-28 pb-24">
      <div className="container-royal">
        <PageHeader
          eyebrow="Bibliothèque du Royaume"
          title={<>Ensei<span className="text-cinematic-gold">gnements</span></>}
          description="Explorez des séries d’enseignement, avancez saison après saison et approfondissez les principes du Royaume."
        />

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
