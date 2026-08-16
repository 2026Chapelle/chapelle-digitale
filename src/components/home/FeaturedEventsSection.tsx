'use client'
/**
 * Section « Prochains rendez-vous » (V2.7-A.1) — carousel horizontal d'événements RÉELS
 * (cms_events). Règles : image d'affiche PROPRE (aucun texte ajouté par-dessus), texte
 * (titre/date/lieu/CTA) placé HORS de l'image, sous la carte. Grandes images larges.
 * Défilement auto gauche → droite avec pause au survol/focus, contrôles préc./suiv.,
 * et respect de prefers-reduced-motion (auto-défilement désactivé). Aucun événement fictif.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { selectHomeEvents } from '@/lib/cms/featured'

interface HomeEvent {
  id: string
  slug: string | null
  title: string
  starts_at: string | null
  location: string | null
  is_online: boolean | null
  cover_url: string | null
  cta_href: string | null
}

const fmtShortDate = (iso: string | null) => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) } catch { return '' }
}

export function FeaturedEventsSection() {
  const [events, setEvents] = useState<HomeEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  // V2.10-A perf : l'auto-défilement ne tourne que lorsque le carousel est à l'écran.
  const [onScreen, setOnScreen] = useState(false)

  useEffect(() => {
    let alive = true
    async function run() {
      if (IS_DEMO_MODE) { setLoaded(true); return }
      try {
        const nowIso = new Date().toISOString()
        // Publiés & futurs (filtre préservé). On récupère un pool puis on applique la
        // sélection V2.9-B : vedettes (is_featured) d'abord triées par sort_order, sinon
        // repli auto (starts_at asc). La sélection partielle n'est jamais complétée.
        const { data } = await supabase.from('cms_events')
          .select('id, slug, title, starts_at, location, is_online, cover_url, cta_href, status, is_featured, sort_order')
          .eq('status', 'published')
          .gte('starts_at', nowIso)
          .order('starts_at', { ascending: true })
          .limit(20)
        const selected = selectHomeEvents(Array.isArray(data) ? (data as any[]) : [], 6, 8)
        if (alive) setEvents(selected as HomeEvent[])
      } catch { if (alive) setEvents([]) }
      if (alive) setLoaded(true)
    }
    run()
    return () => { alive = false }
  }, [])

  // Observe la visibilité du carousel (perf : ne pas animer/hydrater le timer hors écran).
  useEffect(() => {
    const el = trackRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setOnScreen(true); return }
    const io = new IntersectionObserver((entries) => setOnScreen(entries[0]?.isIntersecting ?? false), { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Défilement auto gauche → droite (pause survol/focus, hors écran, ou reduced-motion).
  useEffect(() => {
    const el = trackRef.current
    if (!el || events.length < 2 || !onScreen) return
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = window.setInterval(() => {
      if (paused) return
      const card = el.querySelector('[data-ev-card]') as HTMLElement | null
      const step = card ? card.offsetWidth + 24 : 360
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: 'smooth' })
    }, 4000)
    return () => window.clearInterval(id)
  }, [events.length, paused, onScreen])

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector('[data-ev-card]') as HTMLElement | null
    const step = card ? card.offsetWidth + 24 : 360
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const hasEvents = events.length > 0

  return (
    <section className="py-24 sm:py-32">
      <div className="container-royal">
        <div className="flex items-end justify-between gap-4 mb-14 flex-wrap">
          <div className="max-w-xl">
            <p className="section-label-dark mb-5">
              <CalendarDays className="w-3 h-3" /> Agenda
            </p>
            <h2 className="heading-cinematic-lg mb-4">
              Des moments
              <span className="block text-cinematic-gold">à vivre ensemble</span>
            </h2>
            <p className="font-inter text-pearl/50 leading-relaxed max-w-md">
              Prière, enseignement, communion.
            </p>
          </div>
          {hasEvents && events.length > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => scrollBy(-1)} aria-label="Précédent" className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 bg-white/[0.03] text-pearl/70 hover:text-gold hover:bg-white/[0.07] transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => scrollBy(1)} aria-label="Suivant" className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 bg-white/[0.03] text-pearl/70 hover:text-gold hover:bg-white/[0.07] transition-colors"><ChevronRight className="w-5 h-5" /></button>
            </div>
          )}
        </div>

        {loaded && !hasEvents ? (
          <div className="card-royal text-center py-16 max-w-xl mx-auto">
            <Calendar className="w-8 h-8 mx-auto mb-3 text-pearl/30" />
            <p className="font-cinzel text-lg text-pearl/60">Les prochains événements seront bientôt annoncés.</p>
          </div>
        ) : (
          <div
            ref={trackRef}
            onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-3 -mx-2 px-2 scrollbar-none"
            style={{ scrollbarWidth: 'none' }}
          >
            {(hasEvents ? events : Array.from({ length: 3 })).map((ev, i) => {
              const e = ev as HomeEvent | undefined
              const href = e?.slug ? `/evenements/${e.slug}` : (e?.cta_href || '/evenements')
              return (
                <Link key={e?.id || i} href={hasEvents ? href : '/evenements'} data-ev-card
                  className="group snap-start shrink-0 w-[86%] sm:w-[460px] rounded-2xl overflow-hidden border border-white/8 hover:border-gold/25 bg-white/[0.02] transition-colors">
                  {/* Affiche PROPRE — aucune écriture ajoutée par-dessus */}
                  <div className="relative w-full aspect-[16/9] overflow-hidden bg-white/[0.03]">
                    {e?.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.cover_url} alt={e.title || ''} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(420px 240px at 50% 40%, rgba(212,175,55,0.2), transparent 60%), linear-gradient(120deg, #0d0918, #050308)' }}>
                        <Calendar className="w-9 h-9 text-gold/40" />
                      </div>
                    )}
                  </div>
                  {/* Texte HORS image */}
                  <div className="p-5">
                    {e?.starts_at && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-inter font-semibold px-2.5 py-1 rounded-full mb-2.5" style={{ background: 'rgba(212,175,55,0.14)', color: '#D4AF37' }}>
                        <Calendar className="w-3 h-3" /> {fmtShortDate(e.starts_at)}
                      </span>
                    )}
                    <h3 className="font-cinzel font-bold text-pearl text-lg leading-snug mb-1.5 line-clamp-2">{e?.title || 'Événement'}</h3>
                    {(e?.location || e?.is_online) && (
                      <p className="text-[13px] font-inter text-pearl/55 inline-flex items-center gap-1 mb-3"><MapPin className="w-3.5 h-3.5" /> {e?.location || 'En ligne'}</p>
                    )}
                    <span className="text-sm font-inter font-semibold text-gold inline-flex items-center gap-1 group-hover:gap-2 transition-all">Réserver ma place <ArrowRight className="w-4 h-4" /></span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/evenements" className="text-sm font-inter text-pearl/60 hover:text-gold inline-flex items-center gap-1.5 transition-colors">
            Voir tout l&apos;agenda <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
