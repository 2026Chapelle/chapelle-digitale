'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Calendar, MapPin, Users, Clock, ChevronRight, LayoutGrid, CalendarDays, ArrowRight } from 'lucide-react'

const EVENTS = [
  {
    id: '1',
    titre: 'Culte Principal',
    date: '2026-05-11',
    heure: '10:00',
    type: 'Culte',
    lieu: 'En ligne + Paris',
    description: 'Culte de dimanche avec le Pasteur Principal. Prédication, louange et prière collective.',
    color: '#D4AF37',
    emoji: '⛪',
    inscrits: 1240,
    gratuit: true,
  },
  {
    id: '2',
    titre: 'Veillée de Prière Nationale',
    date: '2026-05-15',
    heure: '22:00',
    type: 'Prière',
    lieu: 'En ligne — toutes nations',
    description: 'Veillée de prière pour les nations africaines. Intercession collective et prophétie.',
    color: '#8B5CF6',
    emoji: '🙏',
    inscrits: 845,
    gratuit: true,
  },
  {
    id: '3',
    titre: 'Séminaire Leadership CFIC',
    date: '2026-05-17',
    heure: '09:00',
    type: 'Formation',
    lieu: 'Paris + En ligne',
    description: 'Deux jours de formation intensive pour les leaders émergents. Avec certification.',
    color: '#0EA5E9',
    emoji: '🎓',
    inscrits: 320,
    gratuit: false,
  },
  {
    id: '4',
    titre: "Retraite Femmes d'Exceptions",
    date: '2026-05-24',
    heure: '08:00',
    type: 'Retraite',
    lieu: 'Paris, France',
    description: "Weekend de retraite spirituelle pour les femmes de la Chapelle. Identité, guérison et appel.",
    color: '#EC4899',
    emoji: '👑',
    inscrits: 156,
    gratuit: false,
  },
  {
    id: '5',
    titre: 'Concert de Louange & Adoration',
    date: '2026-06-01',
    heure: '19:00',
    type: 'Louange',
    lieu: 'Bruxelles, Belgique',
    description: "Soirée de louange et adoration avec les équipes musicales de la Chapelle en Belgique.",
    color: '#22C55E',
    emoji: '🎵',
    inscrits: 534,
    gratuit: true,
  },
  {
    id: '6',
    titre: 'Conférence — Foi & Finances',
    date: '2026-06-07',
    heure: '10:00',
    type: 'Conférence',
    lieu: 'En ligne',
    description: 'Conférence sur la gestion des finances selon les principes bibliques. Avec témoignages.',
    color: '#F59E0B',
    emoji: '💰',
    inscrits: 892,
    gratuit: true,
  },
]

const PAST_EVENTS = [
  {
    id: 'p1',
    titre: 'Culte de Pâques Mondial',
    date: '2026-04-20',
    heure: '10:00',
    type: 'Culte',
    lieu: 'En ligne + Paris',
    emoji: '✝️',
    inscrits: 3200,
    gratuit: true,
  },
  {
    id: 'p2',
    titre: 'Formation : Discipulat Avancé',
    date: '2026-04-12',
    heure: '09:00',
    type: 'Formation',
    lieu: 'En ligne',
    emoji: '📖',
    inscrits: 480,
    gratuit: false,
  },
]

const TYPES = ['Tout', 'Culte', 'Formation', 'Prière', 'Retraite', 'Louange', 'Conférence'] as const
type EventType = typeof TYPES[number]

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return {
    day: d.toLocaleDateString('fr-FR', { day: '2-digit' }),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    full: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  }
}

export default function EvenementsPage() {
  const [activeType, setActiveType] = useState<EventType>('Tout')
  const [calendarView, setCalendarView] = useState(false)

  const filtered = EVENTS.filter(
    (e) => activeType === 'Tout' || e.type === activeType
  )

  const totalThisMonth = EVENTS.filter((e) => e.date.startsWith('2026-05')).length
  const freeEvents = EVENTS.filter((e) => e.gratuit).length

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="section-label-light mb-5">Agenda &amp; Événements</div>

          <h1 className="font-cinzel text-4xl md:text-5xl lg:text-6xl font-black mb-5 leading-tight"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #92721A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Prochains<br />Événements
          </h1>

          <p className="text-lg text-gray-500 font-inter max-w-2xl mb-8">
            Rejoignez nos rassemblements, cultes, formations et veillées — en ligne et en présentiel, partout dans le monde.
          </p>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center gap-8"
          >
            {[
              { value: totalThisMonth, label: 'événements ce mois', icon: '📅' },
              { value: '120+', label: 'nations participantes', icon: '🌍' },
              { value: freeEvents, label: 'événements gratuits', icon: '🎁' },
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
        </motion.div>
      </section>

      {/* ── Filter + View Toggle ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          {/* Type filters */}
          <div className="flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-4 py-1.5 rounded-full text-sm font-inter font-medium transition-all border ${
                  activeType === type
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-200 text-gray-600 bg-white hover:border-gray-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setCalendarView(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-semibold transition-all ${
                !calendarView ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grille
            </button>
            <button
              onClick={() => setCalendarView(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-semibold transition-all ${
                calendarView ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendrier
            </button>
          </div>
        </motion.div>
      </section>

      {/* ── Events Grid / Calendar ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-16">
        {!calendarView ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((event, i) => {
              const dateFmt = formatDate(event.date)
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                >
                  <div
                    className="bg-white rounded-2xl overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex"
                    style={{
                      border: '1px solid rgba(0,0,0,0.07)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* Colored left border accent */}
                    <div
                      className="w-1.5 flex-shrink-0 rounded-l-2xl"
                      style={{ background: event.color }}
                    />

                    <div className="flex-1 p-5">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        {/* Date badge */}
                        <div
                          className="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center"
                          style={{ background: `${event.color}15` }}
                        >
                          <span className="font-cinzel text-lg font-black leading-none" style={{ color: event.color }}>
                            {dateFmt.day}
                          </span>
                          <span className="text-[10px] font-inter font-semibold uppercase" style={{ color: event.color }}>
                            {dateFmt.month}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Type badge + gratuit tag */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span
                              className="text-[10px] font-inter font-bold px-2 py-0.5 rounded-full"
                              style={{ background: `${event.color}15`, color: event.color }}
                            >
                              {event.type}
                            </span>
                            {event.gratuit ? (
                              <span className="text-[10px] font-inter font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                                Gratuit
                              </span>
                            ) : (
                              <span className="text-[10px] font-inter font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                Premium
                              </span>
                            )}
                          </div>
                          <h3 className="font-cinzel font-bold text-gray-900 text-sm leading-snug group-hover:text-amber-700 transition-colors">
                            {event.emoji} {event.titre}
                          </h3>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-500 font-inter leading-relaxed mb-4 line-clamp-2">
                        {event.description}
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-inter mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {event.heure}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {event.lieu}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {event.inscrits.toLocaleString()} inscrits
                        </span>
                      </div>

                      {/* CTA */}
                      <button
                        className="inline-flex items-center gap-1.5 text-xs font-inter font-semibold px-4 py-2 rounded-full transition-all hover:gap-2.5"
                        style={{
                          background: `${event.color}15`,
                          color: event.color,
                        }}
                      >
                        S&apos;inscrire
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          /* Calendar View — simplified month display */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6"
            style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
          >
            {/* Month header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-cinzel text-lg font-bold text-gray-900">Mai — Juin 2026</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>

            {/* Day grid header */}
            <div className="grid grid-cols-7 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                <div key={d} className="text-center text-xs font-inter font-semibold text-gray-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* May 2026 grid — starts Friday (col 5) */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for Mon–Thu (May starts on Friday = index 4) */}
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1
                const dateStr = `2026-05-${String(day).padStart(2, '0')}`
                const dayEvents = filtered.filter((e) => e.date === dateStr)
                return (
                  <div
                    key={day}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-inter transition-all ${
                      dayEvents.length > 0
                        ? 'bg-amber-50 cursor-pointer hover:bg-amber-100'
                        : 'text-gray-400'
                    }`}
                  >
                    <span className={dayEvents.length > 0 ? 'font-bold text-gray-800' : ''}>{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.map((e) => (
                          <div
                            key={e.id}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: e.color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Event legend */}
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
              <p className="text-xs font-inter font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Événements ce mois
              </p>
              {filtered.filter((e) => e.date.startsWith('2026-05')).map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
                  <span className="text-xs font-inter text-gray-700 font-medium">{e.titre}</span>
                  <span className="text-xs text-gray-400 ml-auto">{formatDate(e.date).day} mai</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📅</div>
            <p className="font-cinzel text-lg text-gray-400">Aucun événement dans cette catégorie</p>
          </div>
        )}
      </section>

      {/* ── Past Events ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-cinzel text-xl font-bold text-gray-400 mb-6 flex items-center gap-3">
            <span>Événements Passés</span>
            <div className="flex-1 h-px bg-gray-100" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PAST_EVENTS.map((event, i) => {
              const dateFmt = formatDate(event.date)
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + i * 0.08 }}
                >
                  <div
                    className="bg-white rounded-2xl p-5 flex items-center gap-4 opacity-60"
                    style={{
                      border: '1px solid rgba(0,0,0,0.06)',
                      boxShadow: '0 1px 6px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div className="w-11 h-11 rounded-xl bg-gray-100 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="font-cinzel text-base font-black text-gray-500 leading-none">{dateFmt.day}</span>
                      <span className="text-[9px] font-inter font-semibold uppercase text-gray-400">{dateFmt.month}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-inter px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{event.type}</span>
                      </div>
                      <p className="font-cinzel text-sm font-bold text-gray-500 line-clamp-1">
                        {event.emoji} {event.titre}
                      </p>
                      <p className="text-xs text-gray-400 font-inter mt-0.5">
                        <Users className="w-3 h-3 inline mr-1" />
                        {event.inscrits.toLocaleString()} participants
                      </p>
                    </div>
                    <span className="text-xs font-inter text-gray-400 flex-shrink-0">Terminé</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </section>

      {/* ── Final CTA Banner ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-3xl overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #111827 0%, #1F2937 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(ellipse at 20% 50%, #D4AF37 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, #4B0082 0%, transparent 60%)',
            }}
          />
          <div className="relative px-8 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="section-label-light mb-3" style={{ color: '#D4AF37' }}>
                Rejoignez la communauté
              </p>
              <h2 className="font-cinzel text-2xl md:text-3xl font-black text-white mb-2">
                Ne manquez aucun événement
              </h2>
              <p className="text-gray-400 font-inter text-sm max-w-md">
                Créez votre compte gratuitement et recevez des notifications pour chaque rassemblement.
              </p>
            </div>
            <Link
              href="/rejoindre"
              className="inline-flex items-center gap-2 font-inter font-semibold rounded-full px-8 py-4 flex-shrink-0 transition-all hover:gap-3 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #C49A20 100%)',
                color: '#1A0F00',
                boxShadow: '0 4px 20px rgba(212,175,55,0.35)',
              }}
            >
              S&apos;inscrire gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
