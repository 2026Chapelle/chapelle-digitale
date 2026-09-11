import Image from 'next/image'
import Link from 'next/link'

import {
  BookOpen,
  GraduationCap,
  LockKeyhole,
  Play,
} from 'lucide-react'

import { PageHeader } from '@/components/ui/PageHeader'

import {
  listPublishedTeachingCatalog,
} from '@/lib/teachings/teaching-access-server'

import {
  normalizeAccessLevel,
} from '@/lib/teachings/teaching-access'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Enseignements — Citadelle du Royaume',
  description:
    'Prédications et enseignements de la Citadelle : vidéo, audio et texte.',
  alternates: {
    canonical: '/enseignements',
  },
}

const fmt = (
  iso?: string | null,
) => {
  if (!iso) return ''

  try {
    return new Date(
      iso,
    ).toLocaleDateString(
      'fr-FR',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      },
    )
  } catch {
    return ''
  }
}

export default async function EnseignementsPage() {
  const items =
    await listPublishedTeachingCatalog()

  return (
    <main className="min-h-screen bg-abyss pt-28 pb-24">
      <div className="container-royal">
        <PageHeader
          eyebrow="Bibliothèque du Royaume"
          title={
            <>
              Ensei
              <span className="text-cinematic-gold">
                gnements
              </span>
            </>
          }
          description="Des enseignements pour comprendre, grandir et vivre les principes du Royaume."
        />

        {items.length === 0 ? (
          <div className="card-cinematic p-10 text-center">
            <GraduationCap className="w-8 h-8 text-gold/50 mx-auto mb-3" />

            <p className="text-pearl/50 font-inter">
              Aucun enseignement publié pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-7">
            {items.map((teaching) => {
              const accessLevel =
                normalizeAccessLevel(
                  teaching.access_level,
                )

              const isProtected =
                accessLevel !== 'public'

              const slug =
                teaching.slug?.trim() || ''

              const canOpen =
                !isProtected && Boolean(slug)

              return (
                <article
                  key={teaching.id}
                  className="card-cinematic overflow-hidden flex flex-col group"
                >
                  <div className="relative aspect-[16/9] bg-white/5 overflow-hidden">
                    {teaching.cover_url ? (
                      <Image
                        src={teaching.cover_url}
                        alt={teaching.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <GraduationCap className="w-10 h-10 text-gold/25" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-abyss/70 via-transparent to-transparent" />

                    {isProtected && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-abyss/85 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-wider text-pearl/85">
                        <LockKeyhole className="w-3 h-3 text-gold" />

                        {accessLevel === 'premium'
                          ? 'Premium'
                          : 'Membres'}
                      </div>
                    )}

                    {teaching.series_title && (
                      <div className="absolute left-4 bottom-4">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-gold font-inter">
                          {teaching.series_title}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    {(teaching.season_number ||
                      teaching.season_title) && (
                      <p className="text-[11px] text-pearl/40 font-inter mb-2">
                        {teaching.season_number
                          ? `Saison ${teaching.season_number}`
                          : ''}

                        {teaching.season_title
                          ? ` · ${teaching.season_title}`
                          : ''}
                      </p>
                    )}

                    <h2 className="font-cinzel font-bold text-pearl text-lg leading-snug mb-2 line-clamp-2">
                      {teaching.title}
                    </h2>

                    <p className="text-pearl/40 text-xs font-inter mb-4">
                      {teaching.scripture || ''}

                      {teaching.scripture &&
                      teaching.speaker
                        ? ' · '
                        : ''}

                      {teaching.speaker || ''}
                    </p>

                    {!isProtected &&
                      teaching.description && (
                        <p className="text-pearl/60 text-sm font-inter leading-relaxed line-clamp-2 mb-5">
                          {teaching.description}
                        </p>
                      )}

                    {isProtected && (
                      <p className="text-pearl/50 text-sm font-inter leading-relaxed mb-5">
                        {accessLevel === 'premium'
                          ? 'Réservé aux membres disposant de l’accès Premium Enseignements.'
                          : 'Réservé aux membres de Citadelle.'}
                      </p>
                    )}

                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                      {canOpen ? (
                        <Link
                          href={`/enseignements/${slug}`}
                          className="btn-gold-cinematic px-4 py-2 text-xs inline-flex items-center gap-2"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Regarder
                        </Link>
                      ) : isProtected ? (
                        <span className="inline-flex items-center gap-2 text-xs text-gold/70 font-inter">
                          <LockKeyhole className="w-3.5 h-3.5" />

                          {accessLevel === 'premium'
                            ? 'Accès Premium'
                            : 'Connexion membre requise'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-xs text-pearl/40 font-inter">
                          <BookOpen className="w-3.5 h-3.5" />
                          Bientôt disponible
                        </span>
                      )}

                      {teaching.published_at && (
                        <span className="text-[10px] text-pearl/30 font-inter">
                          {fmt(
                            teaching.published_at,
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}