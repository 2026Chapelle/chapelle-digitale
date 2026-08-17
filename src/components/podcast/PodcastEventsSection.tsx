'use client'
/**
 * PODCAST — « EN CE MOMENT À LA CITADELLE ». Passerelle éditoriale depuis /podcast vers
 * la vie de l'Église : événements RÉELS (cms_events), jamais fictifs. Reprend le motif de
 * données de FeaturedEventsSection (mêmes colonnes, mêmes filtres publiés & futurs) et la
 * sélection pure `selectHomeEvents` : 1 événement principal + jusqu'à 2 secondaires.
 * Aucun événement futur → la section ne rend rien (pas de placeholder).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, MapPin, ArrowRight, Sparkles, Clock } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { selectHomeEvents } from '@/lib/cms/featured'

interface PodcastEvent {
  id: string
  slug: string | null
  title: string
  description: string | null
  starts_at: string | null
  location: string | null
  is_online: boolean | null
  cover_url: string | null
  cta_href: string | null
  status?: string | null
  is_featured?: boolean | null
  sort_order?: number | null
}

const fmtDateTime = (iso: string | null): string => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

const fmtDate = (iso: string | null): string => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return '' }
}

const fmtTime = (iso: string | null): string => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const hrefOf = (e: PodcastEvent): string =>
  e.slug ? `/evenements/${e.slug}` : (e.cta_href || '/evenements')

const clamp = (s: string | null, n = 150): string => {
  if (!s) return ''
  const t = s.trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}

export function PodcastEventsSection() {
  const [events, setEvents] = useState<PodcastEvent[]>([])

  useEffect(() => {
    if (IS_DEMO_MODE) return
    let alive = true
    ;(async () => {
      try {
        const nowIso = new Date().toISOString()
        // Publiés & futurs (filtre préservé), puis sélection éditoriale V2.9-B :
        // vedettes d'abord (sort_order), sinon repli starts_at asc. Jamais complétée.
        const { data } = await supabase.from('cms_events')
          .select('id, slug, title, description, starts_at, location, is_online, cover_url, cta_href, status, is_featured, sort_order')
          .eq('status', 'published')
          .gte('starts_at', nowIso)
          .order('starts_at', { ascending: true })
          .limit(20)
        // Sélection éditoriale ; on borne ensuite à 3 (1 principal + 2 secondaires) au rendu.
        const selected = selectHomeEvents(Array.isArray(data) ? (data as any[]) : [], 6, 3)
        if (alive) setEvents((selected as PodcastEvent[]).slice(0, 3))
      } catch { if (alive) setEvents([]) }
    })()
    return () => { alive = false }
  }, [])

  if (events.length === 0) return null

  const [main, ...rest] = events
  const secondary = rest.slice(0, 2)
  const isSingle = events.length === 1

  return (
    <section className="mb-12 md:mb-16 px-4 md:px-0" aria-label="En ce moment à la Citadelle">
      <div className="mb-5 md:mb-6">
        <p className="section-label-dark mb-1 inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" aria-hidden /> En ce moment à la Citadelle
        </p>
        <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">La vie de l&apos;Église</h2>
      </div>

      {isSingle ? (
        /* ── Événement unique → carte éditoriale pleine largeur (image | contenu) ── */
        <Link
          href={hrefOf(main)}
          className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-gold/30 bg-white/[0.02] transition-colors flex flex-col md:flex-row focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
          {/* Image — pleine largeur en mobile, ~57% à gauche en desktop */}
          <div className="relative w-full md:w-[57%] flex-shrink-0 aspect-[16/9] md:aspect-auto md:min-h-[340px] overflow-hidden bg-white/[0.03]">
            {main.cover_url ? (
              <Image
                src={main.cover_url}
                alt={main.title || 'Événement'}
                fill
                sizes="(max-width: 768px) 100vw, 57vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(480px 280px at 50% 40%, rgba(212,175,55,0.2), transparent 60%), linear-gradient(120deg, #0d0918, #050308)' }} aria-hidden>
                <Calendar className="w-12 h-12 text-gold/40" />
              </div>
            )}
          </div>
          {/* Contenu — ~43% à droite en desktop */}
          <div className="p-6 md:p-8 lg:p-10 flex flex-col justify-center flex-1 min-w-0">
            <span className="inline-flex w-fit items-center gap-1.5 text-[11px] font-inter font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full mb-3" style={{ background: 'rgba(212,175,55,0.14)', color: '#D4AF37' }}>
              <Sparkles className="w-3 h-3" aria-hidden /> Événement à venir
            </span>
            <h3 className="font-cinzel font-bold text-pearl text-2xl md:text-3xl leading-tight mb-3 line-clamp-3">{main.title || 'Événement'}</h3>
            {clamp(main.description, 200) && (
              <p className="font-inter text-sm md:text-[15px] leading-relaxed mb-5 line-clamp-3" style={{ color: 'rgba(245,230,216,0.62)' }}>{clamp(main.description, 200)}</p>
            )}
            <div className="flex flex-col gap-2 mb-6 text-[13px] md:text-sm font-inter text-pearl/70">
              {main.starts_at && (
                <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-gold/80 flex-shrink-0" aria-hidden /> {fmtDate(main.starts_at)}</span>
              )}
              {main.starts_at && fmtTime(main.starts_at) && (
                <span className="inline-flex items-center gap-2"><Clock className="w-4 h-4 text-gold/80 flex-shrink-0" aria-hidden /> {fmtTime(main.starts_at)}</span>
              )}
              {(main.location || main.is_online) && (
                <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-gold/80 flex-shrink-0" aria-hidden /> {main.location || 'En ligne'}</span>
              )}
            </div>
            <span className="text-sm font-inter font-semibold text-gold inline-flex items-center gap-1 group-hover:gap-2 transition-all">Voir l&apos;événement <ArrowRight className="w-4 h-4" aria-hidden /></span>
          </div>
        </Link>
      ) : (
        /* ── Plusieurs événements → 1 principal + 1-2 secondaires (grille préservée) ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
          {/* Événement principal */}
          <Link
            href={hrefOf(main)}
            className="group lg:col-span-2 relative rounded-2xl overflow-hidden border border-white/10 hover:border-gold/30 bg-white/[0.02] transition-colors flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <div className="relative w-full aspect-[16/9] overflow-hidden bg-white/[0.03]">
              {main.cover_url ? (
                <Image
                  src={main.cover_url}
                  alt={main.title || 'Événement'}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(420px 240px at 50% 40%, rgba(212,175,55,0.2), transparent 60%), linear-gradient(120deg, #0d0918, #050308)' }} aria-hidden>
                  <Calendar className="w-10 h-10 text-gold/40" />
                </div>
              )}
            </div>
            <div className="p-5 md:p-6 flex flex-col flex-1">
              {main.starts_at && (
                <span className="inline-flex w-fit items-center gap-1 text-[11px] font-inter font-semibold px-2.5 py-1 rounded-full mb-2.5" style={{ background: 'rgba(212,175,55,0.14)', color: '#D4AF37' }}>
                  <Calendar className="w-3 h-3" aria-hidden /> {fmtDateTime(main.starts_at)}
                </span>
              )}
              <h3 className="font-cinzel font-bold text-pearl text-lg md:text-xl leading-snug mb-1.5 line-clamp-2">{main.title || 'Événement'}</h3>
              {(main.location || main.is_online) && (
                <p className="text-[13px] font-inter text-pearl/55 inline-flex items-center gap-1 mb-2"><MapPin className="w-3.5 h-3.5" aria-hidden /> {main.location || 'En ligne'}</p>
              )}
              {clamp(main.description) && (
                <p className="font-inter text-sm leading-relaxed mb-4 line-clamp-2" style={{ color: 'rgba(245,230,216,0.6)' }}>{clamp(main.description)}</p>
              )}
              <span className="mt-auto text-sm font-inter font-semibold text-gold inline-flex items-center gap-1 group-hover:gap-2 transition-all">Voir l&apos;événement <ArrowRight className="w-4 h-4" aria-hidden /></span>
            </div>
          </Link>

          {/* Secondaires (max 2) */}
          <div className="flex flex-col gap-4 md:gap-5">
            {secondary.map((e) => (
              <Link
                key={e.id}
                href={hrefOf(e)}
                className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-gold/30 bg-white/[0.02] transition-colors flex sm:flex-row lg:flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <div className="relative w-32 sm:w-40 lg:w-full flex-shrink-0 aspect-[1/1] lg:aspect-[16/9] overflow-hidden bg-white/[0.03]">
                  {e.cover_url ? (
                    <Image
                      src={e.cover_url}
                      alt={e.title || 'Événement'}
                      fill
                      sizes="(max-width: 1024px) 40vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(120deg, #0d0918, #050308)' }} aria-hidden>
                      <Calendar className="w-7 h-7 text-gold/40" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col justify-center flex-1 min-w-0">
                  {e.starts_at && (
                    <span className="text-[11px] font-inter font-semibold text-gold/90 inline-flex items-center gap-1 mb-1.5"><Calendar className="w-3 h-3" aria-hidden /> {fmtDateTime(e.starts_at)}</span>
                  )}
                  <h3 className="font-cinzel font-bold text-pearl text-sm md:text-base leading-snug mb-1 line-clamp-2">{e.title || 'Événement'}</h3>
                  <span className="text-xs font-inter font-semibold text-gold inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">Voir l&apos;événement <ArrowRight className="w-3.5 h-3.5" aria-hidden /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
