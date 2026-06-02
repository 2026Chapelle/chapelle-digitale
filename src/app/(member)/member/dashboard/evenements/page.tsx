'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Clock, MapPin, Users, CalendarCheck, CalendarDays,
  Bell, Bookmark, Filter, LayoutGrid, List, Globe, Video, Sparkles, MessageCircle, Check, X,
} from 'lucide-react'
import { type EvenementMock } from '@/lib/mock/evenements'
import { PageHeader } from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'

/** Mappe un événement CMS réel (cms_events) vers le format d'affichage. */
function mapCmsEvent(ev: any, est_inscrit: boolean): EvenementMock {
  const start = ev.starts_at ? new Date(ev.starts_at) : null
  const end = ev.ends_at ? new Date(ev.ends_at) : null
  const hhmm = (d: Date | null) => (d ? d.toTimeString().slice(0, 5) : '')
  return {
    id: ev.id,
    titre: ev.title || 'Événement',
    description: ev.description || '',
    type: 'Culte',
    date: ev.starts_at ? String(ev.starts_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
    heure: hhmm(start),
    heure_fin: end ? hhmm(end) : undefined,
    lieu: ev.location || (ev.is_online ? 'En ligne' : '—'),
    en_ligne: !!ev.is_online,
    // Lien de diffusion DÉDIÉ (jamais /live) : ouvert seulement à partir de l'heure.
    lien_live: ev.lien_live || ev.cta_href || '',
    emoji: '📅',
    couleur: '#D4AF37',
    nb_inscrits: 0,
    plateforme: ev.platform || undefined,
    est_inscrit,
    est_passe: start ? start.getTime() < Date.now() : false,
    image: ev.cover_url || '',
    whatsapp: ev.whatsapp || '',
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

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const TYPE_COLORS: Record<string, string> = {
  Culte: '#D4AF37',
  Prière: '#8B5CF6',
  Formation: '#0EA5E9',
  Conférence: '#22C55E',
  Live: '#EC4899',
  Retraite: '#F59E0B',
}

const TYPES = ['Tout', 'Culte', 'Prière', 'Formation', 'Conférence', 'Live', 'Retraite'] as const
type FilterType = typeof TYPES[number]

const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d })()

function getWeekKey(d: Date) {
  // Lundi de la semaine au format "YYYY-MM-DD"
  const day = (d.getDay() + 6) % 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function formatWeekLabel(weekKey: string) {
  const monday = new Date(weekKey)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const sameMonth = monday.getMonth() === sunday.getMonth()
  if (sameMonth) {
    return `${monday.getDate()} – ${sunday.getDate()} ${MONTHS[monday.getMonth()].toLowerCase()}`
  }
  return `${monday.getDate()} ${MONTHS[monday.getMonth()].toLowerCase().slice(0, 4)}. – ${sunday.getDate()} ${MONTHS[sunday.getMonth()].toLowerCase().slice(0, 4)}.`
}

export default function EvenementsPage() {
  const { user, profile, isDemo } = useAuth()
  const [activeType, setActiveType] = useState<FilterType>('Tout')
  const [viewMode, setViewMode] = useState<'liste' | 'calendrier'>('liste')
  const [events, setEvents] = useState<EvenementMock[]>([])
  const [registered, setRegistered] = useState<Set<string>>(new Set())
  const [reminders, setReminders] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<EvenementMock | null>(null)

  // Événements RÉELS depuis cms_events (publiés) + mes inscriptions. Aucun mock.
  useEffect(() => {
    if (isDemo || IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        // select('*') : résilient si une colonne récente (ex. lien_live) n'est pas
        // encore migrée → la requête ne casse pas (sinon liste vide = 0 événement).
        const { data: evs } = await supabase.from('cms_events')
          .select('*')
          .eq('status', 'published').order('starts_at', { ascending: true })
        let regs: any[] = []
        if (user?.id) {
          const { data } = await supabase.from('event_registrations').select('event_id, type').eq('user_id', user.id)
          regs = data || []
        }
        if (cancelled) return
        const regIds = new Set(regs.filter((r) => r.type === 'inscription').map((r) => r.event_id))
        const remIds = new Set(regs.filter((r) => r.type === 'rappel').map((r) => r.event_id))
        setRegistered(regIds as Set<string>)
        setReminders(remIds as Set<string>)
        setEvents((evs || []).map((ev: any) => mapCmsEvent(ev, regIds.has(ev.id))))
      } catch { /* liste vide */ }
    })()
    return () => { cancelled = true }
  }, [isDemo, user])

  async function register(ev: EvenementMock, type: 'inscription' | 'rappel') {
    // Anti-doublon : ni double inscription, ni rappels multiples identiques.
    if (type === 'inscription' && registered.has(ev.id)) { toast('Vous êtes déjà inscrit à cet événement.'); return }
    if (type === 'rappel' && reminders.has(ev.id)) { toast('Rappel déjà activé pour cet événement.'); return }
    try {
      if (!IS_DEMO_MODE && !isDemo) {
        const { error } = await supabase.from('event_registrations').insert({
          event_id: ev.id, event_titre: ev.titre, user_id: user?.id ?? null,
          user_nom: profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() : (user?.email ?? ''),
          user_email: profile?.email ?? user?.email ?? '', type,
        })
        if (error) { toast.error("Échec de l'enregistrement."); return }
      }
      if (type === 'inscription') setRegistered((s) => new Set(s).add(ev.id))
      else setReminders((s) => new Set(s).add(ev.id))
      toast.success(type === 'rappel' ? 'Rappel activé 🔔' : 'Inscription confirmée ✓')
    } catch { toast.error('Erreur réseau') }
  }

  const filtered = useMemo(
    () => events.filter((e) => activeType === 'Tout' || e.type === activeType),
    [events, activeType],
  )

  const upcoming = useMemo(
    () =>
      filtered
        .filter((e) => !e.est_passe && new Date(e.date) >= TODAY)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [filtered],
  )
  const past = useMemo(
    () =>
      filtered
        .filter((e) => e.est_passe || new Date(e.date) < TODAY)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filtered],
  )

  const myEvents = upcoming.filter((e) => e.est_inscrit)
  const otherEvents = upcoming.filter((e) => !e.est_inscrit)

  // Group otherEvents by week
  const weeks = useMemo(() => {
    const map = new Map<string, EvenementMock[]>()
    for (const e of otherEvents) {
      const k = getWeekKey(new Date(e.date))
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [otherEvents])

  // Featured = prochain événement de ma liste, sinon prochain upcoming
  const featured = myEvents[0] ?? upcoming[0]

  const totalInscrits = registered.size
  const totalUpcoming = events.filter((e) => !e.est_passe && new Date(e.date) >= TODAY).length
  const totalOnline = events.filter((e) => e.en_ligne && !e.est_passe && new Date(e.date) >= TODAY).length

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const day = d.getDate()
    const dayName = DAYS[(d.getDay() + 6) % 7]
    return { day, dayName, month: MONTHS[d.getMonth()].slice(0, 4) }
  }

  const daysUntil = (dateStr: string) => {
    const d = new Date(dateStr)
    const ms = d.getTime() - TODAY.getTime()
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24))
    if (days === 0) return "Aujourd'hui"
    if (days === 1) return 'Demain'
    if (days < 7) return `Dans ${days} jours`
    if (days < 30) return `Dans ${Math.ceil(days / 7)} sem.`
    return `Dans ${Math.ceil(days / 30)} mois`
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Espace Membre"
          title={<>Mon <span className="text-cinematic-gold">Agenda</span></>}
          description="Cultes, veillées et formations à venir dans votre communauté."
        />

        {/* Stats trio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3 md:gap-4 mb-8"
        >
          {[
            { icon: CalendarDays, label: 'À venir', value: totalUpcoming, color: '#D4AF37' },
            { icon: CalendarCheck, label: 'Mes inscriptions', value: totalInscrits, color: '#22C55E' },
            { icon: Globe, label: 'En ligne', value: totalOnline, color: '#0EA5E9' },
          ].map((s) => (
            <div key={s.label} className="card-royal py-4 md:py-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}
                >
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <div className="font-cinzel text-xl md:text-2xl font-bold text-pearl leading-none">
                    {s.value}
                  </div>
                  <div className="text-[10px] md:text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">
                    {s.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Featured event */}
        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setSelected(featured)}
            role="button"
            tabIndex={0}
            className="card-royal mb-8 relative overflow-hidden cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${TYPE_COLORS[featured.type]}10 0%, rgba(15,8,32,0.6) 60%)`,
              borderColor: `${TYPE_COLORS[featured.type]}30`,
            }}
          >
            <div
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30"
              style={{ background: TYPE_COLORS[featured.type] }}
            />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              <div
                className="text-center rounded-2xl px-5 py-4 flex-shrink-0 self-start md:self-auto"
                style={{ background: `${TYPE_COLORS[featured.type]}20`, border: `1px solid ${TYPE_COLORS[featured.type]}40` }}
              >
                <div
                  className="text-[10px] font-semibold uppercase font-inter tracking-wider"
                  style={{ color: TYPE_COLORS[featured.type] }}
                >
                  {formatDate(featured.date).dayName}
                </div>
                <div className="font-cinzel text-4xl font-bold text-pearl leading-none my-1">
                  {formatDate(featured.date).day}
                </div>
                <div className="text-[10px] uppercase text-pearl/60 font-inter">
                  {formatDate(featured.date).month}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className="text-[10px] font-inter font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: `${TYPE_COLORS[featured.type]}25`, color: TYPE_COLORS[featured.type] }}
                  >
                    {featured.type}
                  </span>
                  {featured.est_inscrit && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-inter font-semibold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                      <CalendarCheck className="w-3 h-3" /> Inscrit
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] text-pearl/50 font-inter font-medium">
                    <Sparkles className="w-3 h-3 text-gold" />
                    {daysUntil(featured.date)}
                  </span>
                </div>
                <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl mb-2 leading-tight">
                  {featured.emoji} {featured.titre}
                </h2>
                <p className="text-sm text-pearl/55 font-inter leading-relaxed mb-4 line-clamp-2">
                  {featured.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-pearl/50 font-inter">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {featured.heure}{featured.heure_fin ? ` – ${featured.heure_fin}` : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {featured.lieu}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {featured.nb_inscrits.toLocaleString('fr-FR')} inscrits
                  </span>
                  {featured.en_ligne && (
                    <span className="inline-flex items-center gap-1.5 text-pearl/70">
                      <Video className="w-3.5 h-3.5 text-pink-400" /> En ligne
                    </span>
                  )}
                </div>
              </div>

              <div className="flex md:flex-col items-center md:items-end gap-2 flex-shrink-0">
                <button
                  onClick={(ev) => { ev.stopPropagation(); registered.has(featured.id)
                    ? (featured.lien_live && window.open(featured.lien_live, '_blank'))
                    : register(featured, 'inscription') }}
                  className={registered.has(featured.id) ? 'btn-royal text-xs px-4 py-2 whitespace-nowrap inline-flex items-center gap-1.5' : 'btn-gold text-xs px-4 py-2 whitespace-nowrap'}>
                  {registered.has(featured.id)
                    ? (featured.lien_live ? 'Rejoindre le live' : <><Check className="w-3.5 h-3.5" /> Déjà inscrit</>)
                    : "S'inscrire"}
                </button>
                <button onClick={(ev) => { ev.stopPropagation(); register(featured, 'rappel') }} disabled={reminders.has(featured.id)}
                  className="btn-royal text-xs px-3 py-2 flex items-center gap-1.5 disabled:opacity-60">
                  <Bell className="w-3.5 h-3.5" /> {reminders.has(featured.id) ? 'Rappel activé' : 'Rappel'}
                </button>
                {waLink(featured.whatsapp) && (
                  <a href={waLink(featured.whatsapp)!} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}
                    className="text-xs px-3 py-2 rounded-xl inline-flex items-center gap-1.5 font-inter font-semibold"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Toolbar: filters + view mode */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6"
        >
          <div className="flex gap-2 flex-wrap items-center">
            <Filter className="w-4 h-4 text-pearl/40 flex-shrink-0" />
            {TYPES.map((t) => {
              const isActive = activeType === t
              const color = t !== 'Tout' ? TYPE_COLORS[t] : '#D4AF37'
              return (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-inter font-medium transition-all border ${
                    isActive
                      ? 'text-black border-transparent'
                      : 'bg-pearl/5 text-pearl/55 border-pearl/10 hover:bg-pearl/10 hover:text-pearl/80'
                  }`}
                  style={isActive ? { background: color } : undefined}
                >
                  {t}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-pearl/5 border border-pearl/10 self-start lg:self-auto">
            <button
              onClick={() => setViewMode('liste')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-all ${
                viewMode === 'liste' ? 'bg-gold text-black' : 'text-pearl/50 hover:text-pearl'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Liste
            </button>
            <button
              onClick={() => setViewMode('calendrier')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-all ${
                viewMode === 'calendrier' ? 'bg-gold text-black' : 'text-pearl/50 hover:text-pearl'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Calendrier
            </button>
          </div>
        </motion.div>

        {viewMode === 'calendrier' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-royal mb-10"
          >
            <div className="flex items-center justify-between mb-4">
              <button className="p-2 rounded-xl hover:bg-pearl/10 transition-colors text-pearl/50 hover:text-pearl">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-cinzel text-lg font-bold text-pearl">
                {MONTHS[TODAY.getMonth()]} {TODAY.getFullYear()}
              </h2>
              <button className="p-2 rounded-xl hover:bg-pearl/10 transition-colors text-pearl/50 hover:text-pearl">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs text-pearl/30 font-inter py-1">{d}</div>
              ))}
            </div>

            {/* May 2026 starts on a Friday (index 4) */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1
                const dayEvents = upcoming.filter((e) => new Date(e.date).getDate() === day && new Date(e.date).getMonth() === TODAY.getMonth())
                const isToday = day === TODAY.getDate()
                const isInscrit = dayEvents.some((e) => e.est_inscrit)
                return (
                  <div
                    key={day}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-inter transition-all cursor-pointer relative ${
                      isToday
                        ? 'bg-gold text-black font-bold ring-2 ring-gold/40'
                        : dayEvents.length > 0
                        ? 'bg-pearl/10 text-pearl font-semibold hover:bg-pearl/20'
                        : 'text-pearl/30 hover:bg-pearl/5'
                    }`}
                  >
                    {day}
                    {dayEvents.length > 0 && !isToday && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((e, idx) => (
                          <div
                            key={idx}
                            className="w-1 h-1 rounded-full"
                            style={{ background: isInscrit && e.est_inscrit ? '#22C55E' : TYPE_COLORS[e.type] }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-pearl/5 text-[11px] font-inter text-pearl/50">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gold" /> Aujourd'hui
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Inscrit
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-pearl/40" /> Autre événement
              </span>
            </div>
          </motion.div>
        )}

        {/* My events */}
        {myEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-gold" />
                <h2 className="font-cinzel text-base font-bold text-pearl">Mes inscriptions</h2>
              </div>
              <span className="text-xs text-pearl/40 font-inter">{myEvents.length} {myEvents.length > 1 ? 'événements' : 'événement'}</span>
            </div>
            <div className="space-y-3">
              {myEvents.map((e, i) => (
                <EventRow key={e.id} e={e} i={i} formatDate={formatDate} daysUntil={daysUntil} registered={registered.has(e.id)} onRegister={register} onOpen={setSelected} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Other upcoming events grouped by week */}
        {weeks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2 mb-5">
              <CalendarDays className="w-4 h-4 text-pearl/60" />
              <h2 className="font-cinzel text-base font-bold text-pearl">
                {myEvents.length > 0 ? 'Autres événements' : 'Prochains événements'}
              </h2>
            </div>
            <div className="space-y-6">
              {weeks.map(([weekKey, items], wi) => (
                <div key={weekKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-pearl/40 font-inter font-semibold">
                      Semaine du {formatWeekLabel(weekKey)}
                    </div>
                    <div className="h-px flex-1 bg-pearl/5" />
                    <span className="text-[10px] text-pearl/30 font-inter">{items.length}</span>
                  </div>
                  <div className="space-y-3">
                    {items.map((e, i) => (
                      <EventRow
                        key={e.id}
                        e={e}
                        i={wi * 5 + i}
                        formatDate={formatDate}
                        daysUntil={daysUntil}
                        registered={registered.has(e.id)}
                        onRegister={register}
                        onOpen={setSelected}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {upcoming.length === 0 && (
          <div className="text-center py-20 card-royal">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gold/10 border border-gold/25">
              <CalendarDays className="w-7 h-7 text-gold" />
            </div>
            <p className="font-cinzel text-lg text-pearl/60">Aucun événement à venir</p>
            <p className="font-inter text-sm text-pearl/30 mt-1">Essayez de modifier vos filtres.</p>
          </div>
        )}

        {/* Past events */}
        {past.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <div className="flex items-center gap-2 mb-5">
              <h2 className="font-cinzel text-sm font-bold text-pearl/40 uppercase tracking-wider">Événements passés</h2>
              <div className="h-px flex-1 bg-pearl/5" />
              <span className="text-[10px] text-pearl/30 font-inter">{past.length}</span>
            </div>
            <div className="space-y-2">
              {past.map((e) => {
                const { day, dayName } = formatDate(e.date)
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-5 p-4 rounded-2xl bg-pearl/[0.02] border border-pearl/5 opacity-60 hover:opacity-80 transition-opacity"
                  >
                    <div className="text-center rounded-xl px-3 py-2 flex-shrink-0 min-w-[48px] bg-pearl/5">
                      <div className="text-[10px] text-pearl/30 font-inter">{dayName}</div>
                      <div className="font-cinzel text-lg font-bold text-pearl/40">{day}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{e.emoji}</span>
                        <h3 className="font-cinzel font-bold text-pearl/40 text-sm truncate">{e.titre}</h3>
                      </div>
                      <p className="text-xs text-pearl/25 font-inter mt-0.5">{e.heure} · {e.lieu}</p>
                    </div>
                    <span className="text-xs text-pearl/25 font-inter">Terminé</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Modale fiche détail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(ev) => ev.stopPropagation()}
              className="card-royal relative w-full max-w-2xl max-h-[88vh] overflow-y-auto p-0 overflow-x-hidden"
              style={{ borderColor: `${TYPE_COLORS[selected.type] ?? '#D4AF37'}40` }}
            >
              {/* Bouton fermer */}
              <button
                onClick={() => setSelected(null)}
                aria-label="Fermer"
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-xl flex items-center justify-center bg-black/40 backdrop-blur-md border border-pearl/15 text-pearl/80 hover:text-pearl hover:bg-black/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Hero */}
              {selected.image ? (
                <div className="relative w-full bg-black flex items-center justify-center" style={{ maxHeight: '70vh' }}>
                  {/* Affiche en TAILLE COMPLÈTE (sans recadrage) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.image} alt={selected.titre} className="w-full h-auto object-contain" style={{ maxHeight: '70vh' }} />
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 bg-gradient-to-t from-abyss via-abyss/60 to-transparent">
                    <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl leading-tight drop-shadow-lg">
                      {selected.emoji} {selected.titre}
                    </h2>
                  </div>
                </div>
              ) : (
                <div
                  className="relative w-full p-6 md:p-7 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${TYPE_COLORS[selected.type] ?? '#D4AF37'}30 0%, rgba(15,8,32,0.7) 70%)` }}
                >
                  <div
                    className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-30"
                    style={{ background: TYPE_COLORS[selected.type] ?? '#D4AF37' }}
                  />
                  <div className="relative flex items-center gap-3">
                    <span className="text-4xl">{selected.emoji}</span>
                    <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl leading-tight">
                      {selected.titre}
                    </h2>
                  </div>
                </div>
              )}

              {/* Corps */}
              <div className="p-5 md:p-6 space-y-5">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-inter font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: `${TYPE_COLORS[selected.type] ?? '#D4AF37'}25`, color: TYPE_COLORS[selected.type] ?? '#D4AF37' }}
                  >
                    {selected.type}
                  </span>
                  {registered.has(selected.id) && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-inter font-semibold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                      <CalendarCheck className="w-3 h-3" /> Inscrit
                    </span>
                  )}
                  {selected.en_ligne && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-pink-400 font-inter font-semibold px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20">
                      <Video className="w-3 h-3" /> En ligne
                    </span>
                  )}
                </div>

                {/* Infos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5 text-sm text-pearl/70 font-inter">
                    <CalendarDays className="w-4 h-4 text-gold flex-shrink-0" />
                    {new Date(selected.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-pearl/70 font-inter">
                    <Clock className="w-4 h-4 text-gold flex-shrink-0" />
                    {selected.heure}{selected.heure_fin ? ` – ${selected.heure_fin}` : ''}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-pearl/70 font-inter">
                    <MapPin className="w-4 h-4 text-gold flex-shrink-0" />
                    {selected.lieu}
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-pearl/70 font-inter">
                    <Users className="w-4 h-4 text-gold flex-shrink-0" />
                    {selected.nb_inscrits.toLocaleString('fr-FR')} inscrits
                  </div>
                </div>

                {/* Description */}
                {selected.description && (
                  <p className="text-sm text-pearl/60 font-inter leading-relaxed whitespace-pre-line border-t border-pearl/5 pt-4">
                    {selected.description}
                  </p>
                )}

                {/* Actions */}
                {(() => {
                  // Le direct n'est joignable qu'à partir de l'heure de début (lien dédié, jamais /live).
                  const startTime = new Date(`${selected.date}T${selected.heure || '00:00'}`)
                  const started = !isNaN(startTime.getTime()) && Date.now() >= startTime.getTime()
                  const dateLabel = new Date(selected.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
                  return (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {/* Inscription */}
                  <button
                    onClick={() => !registered.has(selected.id) && register(selected, 'inscription')}
                    disabled={registered.has(selected.id)}
                    className={registered.has(selected.id)
                      ? 'btn-royal text-sm px-5 py-2.5 inline-flex items-center gap-1.5 opacity-80'
                      : 'btn-gold text-sm px-5 py-2.5'}
                  >
                    {registered.has(selected.id) ? <><Check className="w-4 h-4" /> Inscrit</> : "S'inscrire"}
                  </button>

                  {/* Rejoindre le live : lien dédié, activé à l'heure seulement */}
                  {selected.en_ligne && selected.lien_live && (
                    started ? (
                      <a href={selected.lien_live} target="_blank" rel="noreferrer" className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-1.5">
                        <Video className="w-4 h-4" /> Rejoindre le live
                      </a>
                    ) : (
                      <span className="text-sm px-5 py-2.5 rounded-xl inline-flex items-center gap-1.5 font-inter font-semibold cursor-not-allowed"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(245,243,238,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Clock className="w-4 h-4" /> Direct disponible le {dateLabel}{selected.heure ? ` à ${selected.heure}` : ''}
                      </span>
                    )
                  )}
                  {waLink(selected.whatsapp) && (
                    <a href={waLink(selected.whatsapp)!} target="_blank" rel="noreferrer"
                      className="text-sm px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 font-inter font-semibold"
                      style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </a>
                  )}
                </div>
                  )
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EventRow({
  e,
  i,
  formatDate,
  daysUntil,
  registered,
  onRegister,
  onOpen,
}: {
  e: EvenementMock
  i: number
  formatDate: (d: string) => { day: number; dayName: string; month: string }
  daysUntil: (d: string) => string
  registered: boolean
  onRegister: (e: EvenementMock, type: 'inscription' | 'rappel') => void
  onOpen: (e: EvenementMock) => void
}) {
  const { day, dayName, month } = formatDate(e.date)
  const color = TYPE_COLORS[e.type] ?? '#D4AF37'
  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + i * 0.04 }}
      onClick={() => onOpen(e)}
      role="button"
      tabIndex={0}
      className="card-royal flex flex-col md:flex-row md:items-center gap-4 md:gap-5 hover:border-gold/20 transition-all group cursor-pointer"
    >
      {e.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.image} alt="" className="w-full md:w-28 h-28 md:h-20 rounded-xl object-cover flex-shrink-0" />
      )}
      <div
        className="text-center rounded-2xl px-3 py-3 flex-shrink-0 min-w-[64px] self-start md:self-auto"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <div className="text-[10px] font-semibold uppercase font-inter tracking-wider" style={{ color }}>
          {dayName}
        </div>
        <div className="font-cinzel text-2xl font-bold text-pearl leading-none">{day}</div>
        <div className="text-[9px] uppercase text-pearl/50 font-inter mt-0.5">{month}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-lg">{e.emoji}</span>
          <h3 className="font-cinzel font-bold text-pearl text-sm group-hover:text-gold transition-colors">
            {e.titre}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-pearl/45 font-inter">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {e.heure}{e.heure_fin ? ` – ${e.heure_fin}` : ''}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {e.lieu}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {e.nb_inscrits.toLocaleString('fr-FR')}
          </span>
          {e.capacite && (
            <span className="text-[10px] text-pearl/35 font-inter">
              {Math.round((e.nb_inscrits / e.capacite) * 100)}% pleine
            </span>
          )}
        </div>
      </div>

      <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-inter font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {e.type}
          </span>
          <span className="text-[10px] text-pearl/40 font-inter hidden md:inline">
            {daysUntil(e.date)}
          </span>
        </div>
        <button
          onClick={(ev) => { ev.stopPropagation(); registered
            ? (e.lien_live && window.open(e.lien_live, '_blank'))
            : onRegister(e, 'inscription') }}
          className={registered ? 'btn-royal text-xs px-3 py-1.5 inline-flex items-center gap-1.5' : 'btn-gold text-xs px-3 py-1.5'}
        >
          {registered
            ? (e.lien_live ? 'Rejoindre le live' : <><Check className="w-3.5 h-3.5" /> Déjà inscrit</>)
            : "S'inscrire"}
        </button>
        {waLink(e.whatsapp) && (
          <a href={waLink(e.whatsapp)!} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}
            className="text-[11px] px-2.5 py-1 rounded-lg inline-flex items-center gap-1 font-inter font-semibold"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </a>
        )}
      </div>
    </motion.div>
  )
}
