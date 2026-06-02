'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, Bell, CheckCheck, Search, Archive, BookOpen, Calendar, Radio, Play,
  GraduationCap, Sparkles, Heart, UserPlus, Mail, CalendarCheck, DollarSign, type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

interface Notif { id: string; type: string; title: string; summary: string; date: string; href: string }
const ICONS: Record<string, LucideIcon> = { formation: BookOpen, evenement: Calendar, live: Radio, replay: Play, enseignement: GraduationCap, temoignage: Sparkles, priere: Heart, membre: UserPlus, contact: Mail, inscription_evt: CalendarCheck, don: DollarSign }
const COLORS: Record<string, string> = { formation: '#8B5CF6', evenement: '#22C55E', live: '#EF4444', priere: '#EC4899', membre: '#0EA5E9', contact: '#0EA5E9', inscription_evt: '#22C55E', don: '#EAB308', temoignage: '#D4AF37' }
const TYPES = [
  { v: '', l: 'Toutes' }, { v: 'don', l: 'Dons' }, { v: 'inscription_evt', l: 'Inscriptions' },
  { v: 'priere', l: 'Prières' }, { v: 'membre', l: 'Nouveaux membres' }, { v: 'contact', l: 'Messages' }, { v: 'temoignage', l: 'Témoignages' },
]
const lsGet = (k: string): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')) } catch { return new Set() } }
const lsSet = (k: string, s: Set<string>) => { try { localStorage.setItem(k, JSON.stringify(Array.from(s))) } catch { /* */ } }

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Notif[]>([])
  const [read, setRead] = useState<Set<string>>(new Set())
  const [archived, setArchived] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    setRead(lsGet('notif_read_admin')); setArchived(lsGet('notif_archived_admin'))
    ;(async () => {
      try { const r = await fetch('/api/admin/notifications', { credentials: 'same-origin' }); const j = await r.json(); if (j.ok && Array.isArray(j.data)) setItems(j.data) } catch { /* */ }
      setLoading(false)
    })()
  }, [])

  const markRead = (id: string) => { const n = new Set(read); n.add(id); setRead(n); lsSet('notif_read_admin', n) }
  const markAll = () => { const n = new Set(read); items.forEach((i) => n.add(i.id)); setRead(n); lsSet('notif_read_admin', n) }
  const archive = (id: string) => { const n = new Set(archived); n.add(id); setArchived(n); lsSet('notif_archived_admin', n) }

  const filtered = useMemo(() => items.filter((i) => {
    if (showArchived !== archived.has(i.id)) return false
    if (type && i.type !== type) return false
    if (search && !`${i.title} ${i.summary}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [items, type, search, showArchived, archived])

  const unread = items.filter((i) => !read.has(i.id) && !archived.has(i.id)).length

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Administration" title={<>Centre de <span className="text-cinematic-gold">notifications</span></>}
          description="Dons, commandes, inscriptions, prières, nouveaux membres — en temps réel." />

        <div className="card-cinematic p-4 mb-5 flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-inter text-pearl/50 mr-auto">{unread} non lue(s)</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pearl/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher" className="input-royal text-sm pl-9 w-44" />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input-royal text-sm">
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <button onClick={() => setShowArchived((s) => !s)} className={`text-xs font-inter px-3 py-2 rounded-lg border ${showArchived ? 'bg-gold text-black border-transparent' : 'bg-white/5 text-pearl/55 border-white/10'}`}>
            <Archive className="w-3.5 h-3.5 inline mr-1" />{showArchived ? 'Archivées' : 'Actives'}
          </button>
          {!showArchived && unread > 0 && <button onClick={markAll} className="btn-gold text-xs px-3 py-2 inline-flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5" /> Tout lire</button>}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">{showArchived ? 'Aucune notification archivée.' : 'Aucune notification — vous êtes à jour ✅'}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const Icon = ICONS[n.type] || Bell; const color = COLORS[n.type] || '#D4AF37'; const isUnread = !read.has(n.id)
              return (
                <div key={n.id} className="card-cinematic p-3.5 flex items-start gap-3" style={{ borderColor: isUnread ? `${color}30` : undefined }}>
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}1A`, border: `1px solid ${color}33` }}><Icon className="w-4 h-4" style={{ color }} /></span>
                  <Link href={n.href} onClick={() => markRead(n.id)} className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-inter text-sm font-semibold text-pearl truncate">{n.title}</p>
                      {isUnread && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#EF4444' }} />}
                    </div>
                    <p className="font-inter text-xs text-pearl/50 truncate">{n.summary}</p>
                    <p className="font-inter text-[10px] text-pearl/30 mt-0.5">{new Date(n.date).toLocaleString('fr-FR')}</p>
                  </Link>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isUnread && <button onClick={() => markRead(n.id)} title="Marquer comme lu" className="p-1.5 rounded-lg hover:bg-white/10 text-pearl/40 hover:text-gold"><CheckCheck className="w-3.5 h-3.5" /></button>}
                    {!archived.has(n.id) && <button onClick={() => archive(n.id)} title="Archiver" className="p-1.5 rounded-lg hover:bg-white/10 text-pearl/40"><Archive className="w-3.5 h-3.5" /></button>}
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
