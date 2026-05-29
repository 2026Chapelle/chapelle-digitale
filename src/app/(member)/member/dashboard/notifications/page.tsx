'use client'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCheck, Circle, GraduationCap, Heart, Tv, Award, Calendar,
  Crown, Coins, Globe, Flame, BellOff, Bell, Settings, type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'

interface Notification {
  id: string
  icon: LucideIcon
  titre: string
  description?: string
  temps: string
  categorie: 'formations' | 'prières' | 'événements' | 'système'
  lue: boolean
  /** number of hours ago (used for grouping) */
  hoursAgo: number
}

const INITIAL_NOTIFS: Notification[] = [
  { id: '1',  icon: GraduationCap, titre: 'Module 5 complété — École de Prière',                description: '+50 XP gagnés. Vous avancez sur votre parcours disciple.', temps: 'Il y a 2h',    categorie: 'formations',  lue: false, hoursAgo: 2 },
  { id: '2',  icon: Heart,         titre: '45 personnes prient pour votre demande',             description: 'Votre demande « Famille en crise » mobilise la communauté.', temps: 'Il y a 5h',    categorie: 'prières',     lue: false, hoursAgo: 5 },
  { id: '3',  icon: Tv,            titre: 'Culte du Dimanche disponible en replay',             description: 'Message complet + chants de louange archivés.',           temps: 'Il y a 1j',    categorie: 'événements',  lue: false, hoursAgo: 24 },
  { id: '4',  icon: Award,         titre: 'Badge « Intercesseur » débloqué',                    description: 'Vous avez prié 30 jours consécutifs. Bravo !',           temps: 'Il y a 2j',    categorie: 'système',     lue: true,  hoursAgo: 48 },
  { id: '5',  icon: Calendar,      titre: 'Rappel — Nuit de Prière dans 2 jours',               description: 'Préparez votre cœur pour la Nuit d\'Intercession.',     temps: 'Il y a 3j',    categorie: 'événements',  lue: true,  hoursAgo: 72 },
  { id: '6',  icon: Crown,         titre: 'Nouveau message de votre leader',                    description: 'Pasteur Daniel souhaite échanger avec vous.',            temps: 'Il y a 4j',    categorie: 'système',     lue: true,  hoursAgo: 96 },
  { id: '7',  icon: GraduationCap, titre: 'Nouvelle formation disponible — Évangélisation',     description: 'Découvrez les 6 modules de cette formation phare.',      temps: 'Il y a 5j',    categorie: 'formations',  lue: true,  hoursAgo: 120 },
  { id: '8',  icon: Coins,         titre: 'Don reçu confirmé — merci pour votre générosité',    description: 'Reçu fiscal disponible dans vos paramètres.',           temps: 'Il y a 1 sem', categorie: 'système',     lue: true,  hoursAgo: 168 },
  { id: '9',  icon: Globe,         titre: 'Conférence Leadership 2026 — inscriptions ouvertes', description: 'Paris, 22 mai. Places limitées.',                       temps: 'Il y a 1 sem', categorie: 'événements',  lue: true,  hoursAgo: 168 },
  { id: '10', icon: Flame,         titre: 'Nuit de prière spéciale vendredi',                   description: 'Mobilisation pour les nations africaines.',              temps: 'Il y a 2 sem', categorie: 'prières',     lue: true,  hoursAgo: 336 },
]

const FILTERS = ['Toutes', 'Non lues', 'Formations', 'Prières', 'Événements', 'Système'] as const
type Filter = typeof FILTERS[number]

const CAT_COLORS: Record<string, string> = {
  formations: '#8B5CF6',
  'prières': '#EC4899',
  'événements': '#0EA5E9',
  'système': '#D4AF37',
}

const CAT_LABELS: Record<string, string> = {
  formations: 'Formations',
  'prières': 'Prières',
  'événements': 'Événements',
  'système': 'Système',
}

function groupKey(hoursAgo: number): 'today' | 'week' | 'earlier' {
  if (hoursAgo < 24) return 'today'
  if (hoursAgo < 168) return 'week'
  return 'earlier'
}

const GROUP_LABELS: Record<string, string> = {
  today: "Aujourd'hui",
  week: 'Cette semaine',
  earlier: 'Plus ancien',
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>(INITIAL_NOTIFS)
  const [activeFilter, setActiveFilter] = useState<Filter>('Toutes')

  const markAsRead = (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, lue: true } : n)))
  }

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, lue: true })))
  }

  const filtered = notifs.filter((n) => {
    if (activeFilter === 'Toutes') return true
    if (activeFilter === 'Non lues') return !n.lue
    if (activeFilter === 'Formations') return n.categorie === 'formations'
    if (activeFilter === 'Prières') return n.categorie === 'prières'
    if (activeFilter === 'Événements') return n.categorie === 'événements'
    if (activeFilter === 'Système') return n.categorie === 'système'
    return true
  })

  const unreadCount = notifs.filter((n) => !n.lue).length

  const grouped = useMemo(() => {
    const map: Record<string, Notification[]> = { today: [], week: [], earlier: [] }
    for (const n of filtered) {
      map[groupKey(n.hoursAgo)].push(n)
    }
    return map
  }, [filtered])

  const byCategory = useMemo(() => {
    const map: Record<string, { total: number; unread: number }> = {}
    for (const cat of Object.keys(CAT_COLORS)) {
      map[cat] = { total: 0, unread: 0 }
    }
    for (const n of notifs) {
      map[n.categorie].total++
      if (!n.lue) map[n.categorie].unread++
    }
    return map
  }, [notifs])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Espace Membre"
          title={
            <span className="inline-flex items-center gap-3 flex-wrap">
              Notifications
              {unreadCount > 0 && (
                <span className="badge-gold !text-xs">{unreadCount} non lues</span>
              )}
            </span>
          }
          description="Activité de votre communauté, rappels et accomplissements."
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/member/dashboard/parametres"
                className="btn-ghost flex items-center gap-2 text-sm"
              >
                <Settings className="w-4 h-4" />
                Préférences
              </Link>
              <button
                onClick={markAllRead}
                className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={unreadCount === 0}
              >
                <CheckCheck className="w-4 h-4" />
                Tout marquer comme lu
              </button>
            </div>
          }
        />

        {/* Category quick-stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6"
        >
          {Object.keys(CAT_COLORS).map((cat) => {
            const color = CAT_COLORS[cat]
            const { total, unread } = byCategory[cat]
            const isActive = activeFilter.toLowerCase() === CAT_LABELS[cat].toLowerCase()
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(CAT_LABELS[cat] as Filter)}
                className={`card-royal text-left transition-all hover:border-gold/20 ${
                  isActive ? 'border-gold/40' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                  >
                    <Bell className="w-4 h-4" style={{ color }} />
                  </div>
                  {unread > 0 && (
                    <span
                      className="text-[10px] font-inter font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: color, color: '#0B0717' }}
                    >
                      {unread}
                    </span>
                  )}
                </div>
                <div className="font-cinzel text-base font-bold text-pearl">{total}</div>
                <div className="text-[10px] uppercase tracking-wider text-pearl/45 font-inter mt-1">
                  {CAT_LABELS[cat]}
                </div>
              </button>
            )
          })}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 flex-wrap mb-6"
        >
          {FILTERS.map((f) => {
            const isActive = activeFilter === f
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-1.5 rounded-xl text-sm font-inter font-medium transition-all border ${
                  isActive
                    ? 'bg-gold text-black border-transparent'
                    : 'bg-pearl/5 text-pearl/50 border-pearl/10 hover:bg-pearl/10 hover:text-pearl/80'
                }`}
              >
                {f}
                {f === 'Non lues' && unreadCount > 0 && (
                  <span
                    className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 ${
                      isActive ? 'bg-black/15 text-black' : 'bg-gold text-black'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </motion.div>

        {/* Grouped list */}
        <div className="space-y-8">
          {(['today', 'week', 'earlier'] as const).map((group) => {
            const items = grouped[group]
            if (items.length === 0) return null
            return (
              <div key={group}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-pearl/40 font-inter font-semibold">
                    {GROUP_LABELS[group]}
                  </div>
                  <div className="h-px flex-1 bg-pearl/5" />
                  <span className="text-[10px] text-pearl/30 font-inter">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((n, i) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 + i * 0.03 }}
                      className={`flex items-start gap-4 p-4 rounded-2xl border transition-all group relative overflow-hidden ${
                        !n.lue
                          ? 'border-pearl/10 bg-pearl/[0.05]'
                          : 'border-pearl/5 bg-transparent hover:bg-pearl/[0.02]'
                      }`}
                    >
                      {!n.lue && (
                        <div
                          className="absolute left-0 top-3 bottom-3 w-1 rounded-r"
                          style={{ background: CAT_COLORS[n.categorie] }}
                        />
                      )}
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${CAT_COLORS[n.categorie] ?? '#D4AF37'}15`,
                          border: `1px solid ${CAT_COLORS[n.categorie] ?? '#D4AF37'}28`,
                        }}
                      >
                        <n.icon
                          className="w-5 h-5"
                          style={{ color: CAT_COLORS[n.categorie] ?? '#D4AF37' }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-inter ${
                            n.lue ? 'text-pearl/55' : 'text-pearl font-semibold'
                          }`}
                        >
                          {n.titre}
                        </p>
                        {n.description && (
                          <p className="text-xs text-pearl/40 font-inter mt-1 leading-relaxed">
                            {n.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-pearl/30 font-inter">{n.temps}</span>
                          <span
                            className="text-[10px] font-inter font-medium px-2 py-0.5 rounded-full"
                            style={{
                              background: `${CAT_COLORS[n.categorie] ?? '#D4AF37'}18`,
                              color: CAT_COLORS[n.categorie] ?? '#D4AF37',
                            }}
                          >
                            {CAT_LABELS[n.categorie]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!n.lue && (
                          <>
                            <Circle className="w-2.5 h-2.5 fill-gold text-gold flex-shrink-0" />
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="text-xs text-pearl/30 hover:text-pearl/70 font-inter transition-colors opacity-0 group-hover:opacity-100"
                            >
                              Marquer lu
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center py-20 card-royal">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}
              >
                <BellOff className="w-7 h-7 text-gold" />
              </div>
              <p className="font-cinzel text-lg text-pearl/60">Aucune notification</p>
              <p className="font-inter text-sm text-pearl/30 mt-1">
                Tout est à jour pour cette catégorie.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
