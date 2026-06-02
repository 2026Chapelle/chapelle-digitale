'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Bell, BookOpen, Calendar, Radio, Play, GraduationCap, Sparkles, Heart,
  CheckCheck, Loader2, type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

interface Notif { id: string; type: string; title: string; summary: string; date: string; href: string; image?: string | null }

const ICONS: Record<string, LucideIcon> = {
  formation: BookOpen, evenement: Calendar, live: Radio, replay: Play,
  enseignement: GraduationCap, temoignage: Sparkles, priere: Heart,
}
const COLORS: Record<string, string> = {
  formation: '#8B5CF6', evenement: '#22C55E', live: '#EF4444', replay: '#F59E0B',
  enseignement: '#8B5CF6', temoignage: '#D4AF37', priere: '#EC4899',
}
const STORAGE_KEY = 'notif_read_member'
const FILTERS = ['Toutes', 'Non lues'] as const
type Filter = typeof FILTERS[number]

function relTime(iso: string): string {
  try {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (m < 1) return "à l'instant"
    if (m < 60) return `il y a ${m} min`
    const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`
    const j = Math.round(h / 24); if (j < 7) return `il y a ${j} j`
    return new Date(iso).toLocaleDateString('fr-FR')
  } catch { return '' }
}
function groupKey(iso: string): 'today' | 'week' | 'earlier' {
  const h = (Date.now() - new Date(iso).getTime()) / 3600000
  if (h < 24) return 'today'; if (h < 168) return 'week'; return 'earlier'
}
const GROUP_LABELS = { today: "Aujourd'hui", week: 'Cette semaine', earlier: 'Plus ancien' }

export default function NotificationsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Notif[]>([])
  const [read, setRead] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('Toutes')

  useEffect(() => {
    try { const v = window.localStorage.getItem(STORAGE_KEY); setRead(new Set(v ? JSON.parse(v) : [])) } catch { /* */ }
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/member/notifications', { credentials: 'same-origin' })
        const j = await r.json()
        if (!cancelled && j.ok && Array.isArray(j.data)) setItems(j.data)
      } catch { /* */ }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const persist = useCallback((next: Set<string>) => {
    setRead(new Set(next))
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next))) } catch { /* */ }
  }, [])

  const unreadCount = items.filter((n) => !read.has(n.id)).length
  const markAll = () => { const n = new Set(read); items.forEach((i) => n.add(i.id)); persist(n) }
  const openNotif = (n: Notif) => { const s = new Set(read); s.add(n.id); persist(s); router.push(n.href) }

  const filtered = items.filter((n) => filter === 'Toutes' || !read.has(n.id))
  const grouped = useMemo(() => {
    const map: Record<string, Notif[]> = { today: [], week: [], earlier: [] }
    for (const n of filtered) map[groupKey(n.date)].push(n)
    return map
  }, [filtered])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Espace Membre"
          title={<span className="inline-flex items-center gap-3 flex-wrap">Notifications{unreadCount > 0 && <span className="badge-gold !text-xs">{unreadCount} non lues</span>}</span>}
          description="Activité de votre communauté, formations, événements et prières."
          actions={
            <button onClick={markAll} disabled={unreadCount === 0}
              className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              <CheckCheck className="w-4 h-4" /> Tout marquer comme lu
            </button>
          }
        />

        <div className="flex gap-2 flex-wrap mb-6">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-xl text-sm font-inter font-medium transition-all border ${filter === f ? 'bg-gold text-black border-transparent' : 'bg-pearl/5 text-pearl/50 border-pearl/10 hover:bg-pearl/10'}`}>
              {f}{f === 'Non lues' && unreadCount > 0 && <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 bg-gold text-black">{unreadCount}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-16 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-pearl/5 border border-pearl/10">
              <Bell className="w-6 h-6 text-pearl/30" />
            </div>
            <p className="font-inter text-pearl/40 text-sm">Aucune notification pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(['today', 'week', 'earlier'] as const).map((group) => {
              const list = grouped[group]
              if (list.length === 0) return null
              return (
                <div key={group}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-pearl/40 font-inter font-semibold">{GROUP_LABELS[group]}</div>
                    <div className="h-px flex-1 bg-pearl/5" />
                    <span className="text-[10px] text-pearl/30 font-inter">{list.length}</span>
                  </div>
                  <div className="space-y-2">
                    {list.map((n, i) => {
                      const Icon = ICONS[n.type] || Bell
                      const color = COLORS[n.type] || '#D4AF37'
                      const isUnread = !read.has(n.id)
                      return (
                        <motion.button
                          key={n.id}
                          initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 + i * 0.03 }}
                          onClick={() => openNotif(n)}
                          className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all relative overflow-hidden ${isUnread ? 'border-pearl/10 bg-pearl/[0.05]' : 'border-pearl/5 hover:bg-pearl/[0.02]'}`}
                        >
                          {isUnread && <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r" style={{ background: color }} />}
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}28` }}>
                            <Icon className="w-5 h-5" style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-inter font-semibold text-pearl truncate">{n.title}</p>
                              {isUnread && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#EF4444' }} />}
                            </div>
                            <p className="text-xs text-pearl/50 font-inter truncate">{n.summary}</p>
                            <p className="text-[10px] text-pearl/30 font-inter mt-0.5">{relTime(n.date)}</p>
                          </div>
                        </motion.button>
                      )
                    })}
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
