'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Calendar, MapPin, Clock, ChevronRight, ChevronLeft, LayoutGrid, CalendarDays,
  ArrowRight, Globe, Video, X, MessageCircle, Loader2,
} from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import ShareButtons from '@/components/ui/ShareButtons'

/**
 * Agenda public — 100 % données réelles (table cms_events, lignes publiées).
 * Aucune donnée fictive : sans événement, on affiche un état vide explicite.
 */

interface PublicEvent {
  id: string
  slug: string | null
  titre: string
  description: string
  startsAt: Date | null
  date: string // YYYY-MM-DD
  heure: string
  heureFin: string
  lieu: string
  enLigne: boolean
  image: string
  whatsapp: string
  ctaHref: string
  ctaLabel: string
  plateforme: string
  estPasse: boolean
}

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const FILTERS = ['Tout', 'En ligne', 'Présentiel'] as const
type Filter = typeof FILTERS[number]

const hhmm = (d: Date | null) => (d ? d.toTimeString().slice(0, 5) : '')

function mapEvent(ev: any): PublicEvent {
  const start = ev.starts_at ? new Date(ev.starts_at) : null
  const end = ev.ends_at ? new Date(ev.ends_at) : null
  return {
    id: ev.id,
    slug: ev.slug ?? null,
    titre: ev.title || 'Événement',
    description: ev.description || '',
    startsAt: start,
    date: ev.starts_at ? String(ev.starts_at).slice(0, 10) : '',
    heure: hhmm(start),
    heureFin: end ? hhmm(end) : '',
    lieu: ev.location || (ev.is_online ? 'En ligne' : '—'),
    enLigne: !!ev.is_online,
    image: ev.cover_url || '',
    whatsapp: ev.whatsapp || '',
    ctaHref: ev.cta_href || '',
    ctaLabel: ev.cta_label || "S'inscrire",
    plateforme: ev.platform || '',
    estPasse: start ? start.getTime() < Date.now() : false,
  }
}

/** Normalise un numéro/lien WhatsApp en URL cliquable. */
function waLink(v?: string): string | null {
  if (!v) return null
  const s = v.trim()
  if (/^https?:\/\//i.test(s)) return s
  const digits = s.replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return {
    day: d.toLocaleDateString('fr-FR', { day: '2-digit' }),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    full: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

export default function EvenementsPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>('Tout')
  const [calendarView, setCalendarView] = useState(false)
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<PublicEvent | null>(null)
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d })

  useEffect(() => {
    if (IS_DEMO_MODE) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('cms_events')
          .select('id, title, slug, description, starts_at, ends_at, location, is_online, cover_url, whatsapp, cta_href, cta_label, platform, status')
          .eq('status', 'published')
          .order('starts_at', { ascending: true })
        if (cancelled) return
        setEvents((data || []).map(mapEvent))
      } catch { /* liste vide */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const matchFilter = (e: PublicEvent) =>
    activeFilter === 'Tout' || (activeFilter === 'En ligne' ? e.enLigne : !e.enLigne)

  const upcoming = useMemo(
    () => events.filter((e) => !e.estPasse && matchFilter(e)),
    [events, activeFilter],
  )
  const past = useMemo(
    () => events.filter((e) => e.estPasse && matchFilter(e)).sort((a, b) => (b.startsAt?.getTime() ?? 0) - (a.startsAt?.getTime() ?? 0)),
    [events, activeFilter],
  )

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  // Grille calendrier du mois pointé par monthCursor.
  const calendar = useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7 // lundi = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { year, month, firstDay, daysInMonth }
  }, [monthCursor])

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-14">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="section-label-light mb-5">Agenda &amp; Événements</div>
          <h1 className="font-cinzel text-4xl md:text-5xl lg:text-6xl font-black mb-5 leading-tight"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #92721A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Prochains<br />Événements
          </h1>
          <p className="text-lg text-gray-500 font-inter max-w-2xl mb-8">
            Rejoignez nos rassemblements, cultes, formations et veillées — en ligne et en présentiel, partout dans le monde.
          </p>

          {!loading && events.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-8">
              {[
                { value: upcoming.length, label: 'événements à venir', icon: '📅' },
                { value: events.filter((e) => !e.estPasse && e.enLigne).length, label: 'en ligne', icon: '🌍' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <span className="text-2xl">{stat.icon}</span>
                  <div>
                    <div className="font-cinzel text-xl font-black text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-400 font-inter">{stat.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ── Filter + View Toggle ── */}
      {!loading && events.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-inter font-medium transition-all border ${
                    activeFilter === f ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-400'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
              <button onClick={() => setCalendarView(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-semibold transition-all ${!calendarView ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Grille
              </button>
              <button onClick={() => setCalendarView(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-semibold transition-all ${calendarView ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                <CalendarDays className="w-3.5 h-3.5" /> Calendrier
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Contenu ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-16">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-gold" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📅</div>
            <p className="font-cinzel text-xl text-gray-700 mb-2">Aucun événement disponible</p>
            <p className="font-inter text-sm text-gray-400">Les prochains rassemblements seront publiés ici très bientôt.</p>
          </div>
        ) : calendarView ? (
          <CalendarGrid
            calendar={calendar}
            monthCursor={monthCursor}
            setMonthCursor={setMonthCursor}
            events={upcoming.concat(past)}
            onOpen={setSelected}
          />
        ) : upcoming.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📅</div>
            <p className="font-cinzel text-lg text-gray-400">Aucun événement à venir dans cette catégorie</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcoming.map((event, i) => {
              const dateFmt = formatDate(event.date)
              return (
                <motion.div key={event.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.04 * (i % 4) }}>
                  <button onClick={() => setSelected(event)}
                    className="w-full text-left bg-white rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex"
                    style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <div className="w-1.5 flex-shrink-0 rounded-l-2xl" style={{ background: '#D4AF37' }} />
                    {event.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.image} alt="" className="w-28 h-auto object-cover flex-shrink-0 hidden sm:block" />
                    )}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center" style={{ background: '#D4AF3715' }}>
                          <span className="font-cinzel text-lg font-black leading-none" style={{ color: '#B8901F' }}>{dateFmt.day}</span>
                          <span className="text-[10px] font-inter font-semibold uppercase" style={{ color: '#B8901F' }}>{dateFmt.month}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {event.plateforme && (
                              <span className="text-[10px] font-inter font-bold px-2 py-0.5 rounded-full" style={{ background: '#4B008215', color: '#4B0082' }}>{event.plateforme}</span>
                            )}
                            <span className={`text-[10px] font-inter font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${event.enLigne ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {event.enLigne ? <><Video className="w-2.5 h-2.5" /> En ligne</> : <><MapPin className="w-2.5 h-2.5" /> Présentiel</>}
                            </span>
                          </div>
                          <h3 className="font-cinzel font-bold text-gray-900 text-sm leading-snug group-hover:text-amber-700 transition-colors">{event.titre}</h3>
                        </div>
                      </div>
                      {event.description && <p className="text-xs text-gray-500 font-inter leading-relaxed mb-4 line-clamp-2">{event.description}</p>}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-inter mb-4">
                        {event.heure && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.heure}</span>}
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.lieu}</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-inter font-semibold px-4 py-2 rounded-full transition-all group-hover:gap-2.5" style={{ background: '#D4AF3715', color: '#B8901F' }}>
                        Voir les détails <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Événements passés ── */}
      {!loading && past.length > 0 && !calendarView && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-16">
          <h2 className="font-cinzel text-xl font-bold text-gray-400 mb-6 flex items-center gap-3">
            <span>Événements passés</span><div className="flex-1 h-px bg-gray-100" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {past.slice(0, 6).map((event) => {
              const dateFmt = formatDate(event.date)
              return (
                <button key={event.id} onClick={() => setSelected(event)}
                  className="text-left bg-white rounded-2xl p-5 flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity"
                  style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="w-11 h-11 rounded-xl bg-gray-100 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="font-cinzel text-base font-black text-gray-500 leading-none">{dateFmt.day}</span>
                    <span className="text-[9px] font-inter font-semibold uppercase text-gray-400">{dateFmt.month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-cinzel text-sm font-bold text-gray-600 line-clamp-1">{event.titre}</p>
                    <p className="text-xs text-gray-400 font-inter mt-0.5">{event.lieu}</p>
                  </div>
                  <span className="text-xs font-inter text-gray-400 flex-shrink-0">Terminé</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ── CTA final ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
        <div className="rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)' }}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, #D4AF37 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, #4B0082 0%, transparent 60%)' }} />
          <div className="relative px-8 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="section-label-light mb-3" style={{ color: '#D4AF37' }}>Rejoignez la communauté</p>
              <h2 className="font-cinzel text-2xl md:text-3xl font-black text-white mb-2">Ne manquez aucun événement</h2>
              <p className="text-gray-400 font-inter text-sm max-w-md">Créez votre compte gratuitement et recevez des notifications pour chaque rassemblement.</p>
            </div>
            <Link href="/rejoindre" className="inline-flex items-center gap-2 font-inter font-semibold rounded-full px-8 py-4 flex-shrink-0 transition-all hover:gap-3 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #C49A20 100%)', color: '#1A0F00', boxShadow: '0 4px 20px rgba(212,175,55,0.35)' }}>
              S&apos;inscrire gratuitement <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Modale détail premium ── */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }} onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
              <button onClick={() => setSelected(null)} aria-label="Fermer"
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-xl flex items-center justify-center bg-white/90 backdrop-blur border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors">
                <X className="w-4 h-4" />
              </button>

              {selected.image ? (
                <div className="relative w-full h-52 md:h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.image} alt="" className="absolute inset-0 w-full h-full object-cover rounded-t-3xl" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent rounded-t-3xl" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                    <h2 className="font-cinzel text-xl md:text-2xl font-black text-white leading-tight drop-shadow-lg">{selected.titre}</h2>
                  </div>
                </div>
              ) : (
                <div className="relative w-full p-6 md:p-7 rounded-t-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #D4AF3720 0%, #4B008215 70%)' }}>
                  <h2 className="font-cinzel text-xl md:text-2xl font-black text-gray-900 leading-tight">{selected.titre}</h2>
                </div>
              )}

              <div className="p-5 md:p-6 space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                  {selected.plateforme && <span className="text-[10px] font-inter font-bold px-2.5 py-0.5 rounded-full" style={{ background: '#4B008215', color: '#4B0082' }}>{selected.plateforme}</span>}
                  <span className={`text-[10px] font-inter font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${selected.enLigne ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {selected.enLigne ? <><Video className="w-3 h-3" /> En ligne</> : <><Globe className="w-3 h-3" /> Présentiel</>}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selected.date && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 font-inter">
                      <CalendarDays className="w-4 h-4 text-gold flex-shrink-0" /> {formatDate(selected.date).full}
                    </div>
                  )}
                  {selected.heure && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 font-inter">
                      <Clock className="w-4 h-4 text-gold flex-shrink-0" /> {selected.heure}{selected.heureFin ? ` – ${selected.heureFin}` : ''}
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 font-inter">
                    <MapPin className="w-4 h-4 text-gold flex-shrink-0" /> {selected.lieu}
                  </div>
                </div>

                {selected.description && (
                  <p className="text-sm text-gray-600 font-inter leading-relaxed whitespace-pre-line border-t border-gray-100 pt-4">{selected.description}</p>
                )}

                {!selected.estPasse && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {selected.ctaHref ? (
                      <a href={selected.ctaHref} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 font-inter font-semibold rounded-full px-6 py-3 transition-all hover:gap-3"
                        style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
                        {selected.ctaLabel} <ArrowRight className="w-4 h-4" />
                      </a>
                    ) : (
                      <Link href="/rejoindre"
                        className="inline-flex items-center gap-2 font-inter font-semibold rounded-full px-6 py-3 transition-all hover:gap-3"
                        style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
                        S&apos;inscrire <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                    {waLink(selected.whatsapp) && (
                      <a href={waLink(selected.whatsapp)!} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm px-4 py-3 rounded-full font-inter font-semibold"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#16A34A', border: '1px solid rgba(34,197,94,0.3)' }}>
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4">
                  <ShareButtons url={shareUrl} title={selected.titre} text={selected.description?.slice(0, 120)} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Vue calendrier — mois dynamique, événements réels positionnés par date. */
function CalendarGrid({
  calendar, monthCursor, setMonthCursor, events, onOpen,
}: {
  calendar: { year: number; month: number; firstDay: number; daysInMonth: number }
  monthCursor: Date
  setMonthCursor: (d: Date) => void
  events: PublicEvent[]
  onOpen: (e: PublicEvent) => void
}) {
  const { year, month, firstDay, daysInMonth } = calendar
  const eventsByDay = useMemo(() => {
    const map = new Map<number, PublicEvent[]>()
    for (const e of events) {
      if (!e.startsAt) continue
      if (e.startsAt.getFullYear() === year && e.startsAt.getMonth() === month) {
        const d = e.startsAt.getDate()
        if (!map.has(d)) map.set(d, [])
        map.get(d)!.push(e)
      }
    }
    return map
  }, [events, year, month])

  const monthEvents = useMemo(
    () => events.filter((e) => e.startsAt && e.startsAt.getFullYear() === year && e.startsAt.getMonth() === month)
      .sort((a, b) => (a.startsAt!.getTime()) - (b.startsAt!.getTime())),
    [events, year, month],
  )

  const shift = (delta: number) => { const d = new Date(monthCursor); d.setMonth(d.getMonth() + delta); setMonthCursor(d) }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6" style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => shift(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="font-cinzel text-lg font-bold text-gray-900">{MONTHS[month]} {year}</h2>
        <button onClick={() => shift(1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => <div key={d} className="text-center text-xs font-inter font-semibold text-gray-400 py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayEvents = eventsByDay.get(day) || []
          const has = dayEvents.length > 0
          return (
            <button key={day} disabled={!has} onClick={() => has && onOpen(dayEvents[0])}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-inter transition-all ${has ? 'bg-amber-50 cursor-pointer hover:bg-amber-100' : 'text-gray-400'}`}>
              <span className={has ? 'font-bold text-gray-800' : ''}>{day}</span>
              {has && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e) => <div key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: e.enLigne ? '#0EA5E9' : '#D4AF37' }} />)}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {monthEvents.length > 0 ? (
        <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
          <p className="text-xs font-inter font-semibold text-gray-400 uppercase tracking-wider mb-3">Événements ce mois</p>
          {monthEvents.map((e) => (
            <button key={e.id} onClick={() => onOpen(e)} className="w-full flex items-center gap-3 text-left hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.enLigne ? '#0EA5E9' : '#D4AF37' }} />
              <span className="text-xs font-inter text-gray-700 font-medium truncate">{e.titre}</span>
              <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{formatDate(e.date).day} {formatDate(e.date).month}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-6 pt-4 border-t border-gray-100 text-center text-xs font-inter text-gray-400">Aucun événement ce mois-ci.</p>
      )}
    </motion.div>
  )
}
