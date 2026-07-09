'use client'
/**
 * Section « Prochains rendez-vous » (V2.7-A) — événements RÉELS depuis cms_events
 * (mêmes données que la page /evenements). Grandes cartes premium. État vide propre.
 * Aucun événement fictif : si rien à venir, message sobre.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, ArrowRight, CalendarDays } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'

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

const fmtDate = (iso: string | null) => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) } catch { return '' }
}
const fmtTime = (iso: string | null) => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export function FeaturedEventsSection() {
  const [events, setEvents] = useState<HomeEvent[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    async function run() {
      if (IS_DEMO_MODE) { setLoaded(true); return }
      try {
        const nowIso = new Date().toISOString()
        const { data } = await supabase.from('cms_events')
          .select('id, slug, title, starts_at, location, is_online, cover_url, cta_href, status')
          .eq('status', 'published')
          .gte('starts_at', nowIso)
          .order('starts_at', { ascending: true })
          .limit(3)
        if (alive) setEvents(Array.isArray(data) ? (data as HomeEvent[]) : [])
      } catch { if (alive) setEvents([]) }
      if (alive) setLoaded(true)
    }
    run()
    return () => { alive = false }
  }, [])

  return (
    <section className="py-20 sm:py-24">
      <div className="container-royal">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-inter mb-4" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
            <CalendarDays className="w-3.5 h-3.5" /> Agenda
          </div>
          <h2 className="font-cinzel font-bold text-2xl sm:text-3xl leading-tight mb-3">
            Prochains rendez-vous <span className="text-cinematic-gold">à ne pas manquer</span>
          </h2>
          <p className="font-inter text-pearl/60 leading-relaxed">Vivez des temps forts de prière, d&apos;enseignement, de communion et de transformation.</p>
        </div>

        {loaded && events.length === 0 ? (
          <div className="card-royal text-center py-14 max-w-xl mx-auto">
            <Calendar className="w-8 h-8 mx-auto mb-3 text-pearl/30" />
            <p className="font-cinzel text-lg text-pearl/60">Les prochains événements seront bientôt annoncés.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {(events.length ? events : Array.from({ length: 3 })).map((ev, i) => {
              const e = ev as HomeEvent | undefined
              const href = e?.slug ? `/evenements/${e.slug}` : (e?.cta_href || '/evenements')
              return (
                <Link key={e?.id || i} href={events.length ? href : '/evenements'}
                  className="group card-royal overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-300">
                  <div className="relative aspect-[16/10] overflow-hidden bg-white/[0.03]">
                    {e?.cover_url
                      ? <img src={e.cover_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      : <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(300px 160px at 50% 20%, rgba(212,175,55,0.18), transparent 60%)' }}><Calendar className="w-8 h-8 text-gold/40" /></div>}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(5,3,8,0.85) 100%)' }} />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    {e?.starts_at && <p className="text-[11px] font-inter text-gold/80 mb-1.5 inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtDate(e.starts_at)}{fmtTime(e.starts_at) && ` · ${fmtTime(e.starts_at)}`}</p>}
                    <h3 className="font-cinzel font-bold text-pearl text-base leading-snug mb-2 line-clamp-2">{e?.title || 'Événement'}</h3>
                    <p className="text-xs font-inter text-pearl/50 inline-flex items-center gap-1 mb-4"><MapPin className="w-3 h-3" /> {e?.location || (e?.is_online ? 'En ligne' : 'À préciser')}</p>
                    <span className="mt-auto text-xs font-inter font-semibold text-gold inline-flex items-center gap-1 group-hover:gap-2 transition-all">Participer <ArrowRight className="w-3.5 h-3.5" /></span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="text-center mt-10">
          <Link href="/evenements" className="text-sm font-inter text-pearl/60 hover:text-gold inline-flex items-center gap-1.5 transition-colors">
            Voir tout l&apos;agenda <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
