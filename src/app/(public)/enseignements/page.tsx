import Image from 'next/image'

import {
  BookOpen,
  FileText,
  GraduationCap,
  Headphones,
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
  description: 'Prédications et enseignements de la Citadelle : vidéo, audio et texte.',
  alternates: {
    canonical: '/enseignements',
  },
}

const fmt = (iso?: string | null) => {
  if (!iso) return ''

  try {
    return new Date(iso).toLocaleDateString(
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
    <div className="min-h-screen bg-abyss pt-28 pb-20">
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
          description="Prédications et enseignements — à regarder, écouter ou lire."
        />

        {items.length === 0 ? (
          <div className="card-cinematic p-10 text-center">
            <GraduationCap className="w-8 h-8 text-gold/50 mx-auto mb-3" />

            <p className="text-pearl/50 font-inter">
              Aucun enseignement publié pour le moment. Revenez bientôt.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((t) => {
              const accessLevel =
                normalizeAccessLevel(
                  t.access_level,
                )

              const isProtected =
                accessLevel !== 'public'

              const cover =
                t.cover_url || ''

              const video =
                t.video_url || ''

              const audio =
                t.audio_url || ''

              const body =
                t.body || ''

              const description =
                t.description || ''

              return (
                <div
                  key={t.id}
                  className="card-cinematic overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[16/9] bg-white/5 overflow-hidden">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={t.title}
                        fill
                        sizes="(max-width:768px) 100vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <GraduationCap className="w-8 h-8 text-gold/30" />
                      </div>
                    )}

                    {isProtected && (
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-abyss/85 backdrop-blur px-2.5 py-1 text-[10px] uppercase tracking-wider text-pearl/80">
                        <LockKeyhole className="w-3 h-3 text-gold" />

                        {accessLevel === 'premium'
                          ? 'Premium'
                          : 'Membres'}
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    {t.category && (
                      <span className="text-[11px] uppercase tracking-wider text-gold/70 font-inter mb-2">
                        {t.category}
                      </span>
                    )}

                    <h2 className="font-cinzel font-bold text-pearl text-base mb-1 line-clamp-2">
                      {t.title}
                    </h2>

                    <p className="text-pearl/40 text-xs font-inter mb-3">
                      {t.speaker || ''}

                      {t.scripture
                        ? ` · ${t.scripture}`
                        : ''}

                      {t.published_at
                        ? ` · ${fmt(t.published_at)}`
                        : ''}
                    </p>

                    {!isProtected &&
                      description && (
                        <p className="text-pearl/60 text-sm font-inter leading-relaxed line-clamp-3 mb-4">
                          {description}
                        </p>
                      )}

                    {isProtected && (
                      <div className="mb-4 rounded-xl border border-white/5 bg-white/[0.025] p-3">
                        <p className="text-xs text-pearl/55 font-inter leading-relaxed">
                          {accessLevel === 'premium'
                            ? 'Cet enseignement est réservé aux membres disposant de l’accès Premium Enseignements.'
                            : 'Cet enseignement est réservé aux membres de Citadelle.'}
                        </p>
                      </div>
                    )}

                    {!isProtected &&
                      audio && (
                        <audio
                          controls
                          src={audio}
                          className="w-full mb-3"
                        >
                          Audio non supporté.
                        </audio>
                      )}

                    {!isProtected &&
                      body && (
                        <details className="mb-3 group">
                          <summary className="inline-flex items-center gap-1.5 text-xs font-inter text-gold/80 hover:text-gold cursor-pointer list-none">
                            <FileText className="w-3.5 h-3.5" />

                            Lire l&apos;enseignement
                          </summary>

                          <p className="mt-2 text-pearl/70 text-sm font-inter leading-relaxed whitespace-pre-wrap">
                            {body}
                          </p>
                        </details>
                      )}

                    <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-white/5">
                      {!isProtected &&
                        video && (
                          <a
                            href={video}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-gold-cinematic px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5" />

                            Regarder
                          </a>
                        )}

                      {!isProtected &&
                        audio && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-pearl/40 font-inter px-2 py-1">
                            <Headphones className="w-3.5 h-3.5" />

                            Audio
                          </span>
                        )}

                      {!isProtected &&
                        !video &&
                        !audio &&
                        body && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-pearl/40 font-inter px-2 py-1">
                            <BookOpen className="w-3.5 h-3.5" />

                            Texte
                          </span>
                        )}

                      {isProtected && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-gold/70 font-inter px-2 py-1">
                          <LockKeyhole className="w-3.5 h-3.5" />

                          {accessLevel === 'premium'
                            ? 'Accès Premium'
                            : 'Connexion membre requise'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}