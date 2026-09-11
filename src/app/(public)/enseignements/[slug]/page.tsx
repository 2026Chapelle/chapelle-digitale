import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  LockKeyhole,
} from 'lucide-react'

import {
  getTeachingReadingBySlug,
} from '@/lib/teachings/teaching-access-server'

import {
  getSessionProfile,
} from '@/lib/member-auth'

import {
  supabaseAdmin,
} from '@/lib/supabase'

import {
  hasTeachingsPremiumAccess,
  isMemberStatus,
} from '@/lib/teachings/teaching-access'

export const dynamic = 'force-dynamic'

function youtubeEmbedUrl(
  value?: string | null,
) {
  if (!value) return null

  try {
    const url = new URL(value)

    let id = ''

    if (url.hostname === 'youtu.be') {
      id =
        url.pathname.replace(/^\/+/, '')
    }

    if (
      url.hostname.includes('youtube.com')
    ) {
      id =
        url.searchParams.get('v') || ''

      if (
        !id &&
        url.pathname.startsWith('/embed/')
      ) {
        id =
          url.pathname.split('/embed/')[1] || ''
      }

      if (
        !id &&
        url.pathname.startsWith('/live/')
      ) {
        id =
          url.pathname.split('/live/')[1] || ''
      }
    }

    id =
      id
        .split('/')[0]
        .split('?')[0]
        .trim()

    if (!id) return null

    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1`
  } catch {
    return null
  }
}

export default async function TeachingReadingPage({
  params,
}: {
  params: {
    slug: string
  }
}) {
  const session =
    await getSessionProfile()

  const authenticated =
    Boolean(session)

  const isMember =
    isMemberStatus(
      session?.profile?.membre_statut,
    )

  const hasPremiumEntitlement =
    authenticated && isMember
      ? await hasTeachingsPremiumAccess(
          supabaseAdmin,
          session?.uid,
        )
      : false

  const result =
    await getTeachingReadingBySlug(
      params.slug,
      {
        authenticated,
        isMember,
        hasPremiumEntitlement,
        isAdmin: false,
      },
    )

  if (
    !result.allowed ||
    !result.teaching
  ) {
    notFound()
  }

  const teaching =
    result.teaching

  const videoEmbed =
    youtubeEmbedUrl(
      teaching.videoUrl,
    )

  const series =
    result.context?.series

  const season =
    result.context?.season

  return (
    <main className="min-h-screen bg-abyss pt-24 pb-24">
      <div className="container-royal max-w-6xl">
        <Link
          href="/enseignements"
          className="inline-flex items-center gap-2 text-sm text-pearl/50 hover:text-gold transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          Bibliothèque du Royaume
        </Link>

        <header className="mb-8">
          {series && (
            <p className="text-xs uppercase tracking-[0.25em] text-gold/70 font-inter mb-3">
              {series.title}

              {season && (
                <>
                  {' · '}
                  Saison {season.season_number}
                  {season.title
                    ? ` — ${season.title}`
                    : ''}
                </>
              )}
            </p>
          )}

          <h1 className="font-cinzel text-3xl md:text-5xl font-bold text-pearl max-w-4xl leading-tight">
            {teaching.title}
          </h1>

          <p className="mt-4 text-sm text-pearl/45 font-inter">
            {teaching.speaker || ''}

            {teaching.scripture
              ? ` · ${teaching.scripture}`
              : ''}
          </p>
        </header>

        {videoEmbed && (
          <section className="mb-10">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              <iframe
                src={videoEmbed}
                title={teaching.title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </section>
        )}

        {!videoEmbed &&
          teaching.videoUrl && (
            <div className="mb-10 rounded-2xl border border-gold/15 bg-gold/[0.04] p-6 text-sm text-pearl/65">
              <LockKeyhole className="w-5 h-5 text-gold mb-3" />
              La vidéo n&apos;est pas disponible dans le lecteur intégré.
            </div>
          )}

        <section className="grid lg:grid-cols-[1fr_300px] gap-10">
          <div>
            {teaching.description && (
              <p className="text-lg text-pearl/70 font-inter leading-relaxed mb-8">
                {teaching.description}
              </p>
            )}

            {teaching.body && (
              <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 group">
                <summary className="cursor-pointer list-none inline-flex items-center gap-2 text-gold font-inter text-sm">
                  <BookOpen className="w-4 h-4" />
                  Lire l&apos;enseignement
                </summary>

                <div className="mt-5 whitespace-pre-wrap text-sm md:text-base text-pearl/70 font-inter leading-7">
                  {teaching.body}
                </div>
              </details>
            )}
          </div>

          {(series || season) && (
            <aside className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 h-fit">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 mb-3">
                Parcours d&apos;enseignement
              </p>

              {series && (
                <h2 className="font-cinzel font-bold text-pearl text-lg">
                  {series.title}
                </h2>
              )}

              {season && (
                <p className="mt-2 text-sm text-pearl/55">
                  Saison {season.season_number}
                  {season.title
                    ? ` · ${season.title}`
                    : ''}
                </p>
              )}
            </aside>
          )}
        </section>

        {(result.previous || result.next) && (
          <nav className="mt-14 pt-8 border-t border-white/10 grid md:grid-cols-2 gap-4">
            <div>
              {result.previous && (
                <Link
                  href={`/enseignements/${result.previous.slug}`}
                  className="card-cinematic p-5 flex items-center gap-3 hover:border-gold/30 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gold shrink-0" />

                  <span>
                    <span className="block text-[10px] uppercase tracking-wider text-pearl/35 mb-1">
                      Enseignement précédent
                    </span>

                    <span className="font-cinzel text-sm text-pearl">
                      {result.previous.title}
                    </span>
                  </span>
                </Link>
              )}
            </div>

            <div>
              {result.next && (
                <Link
                  href={`/enseignements/${result.next.slug}`}
                  className="card-cinematic p-5 flex items-center justify-between gap-3 hover:border-gold/30 transition-colors"
                >
                  <span>
                    <span className="block text-[10px] uppercase tracking-wider text-pearl/35 mb-1">
                      Enseignement suivant
                    </span>

                    <span className="font-cinzel text-sm text-pearl">
                      {result.next.title}
                    </span>
                  </span>

                  <ArrowRight className="w-5 h-5 text-gold shrink-0" />
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </main>
  )
}