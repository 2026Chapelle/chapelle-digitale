'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Bell, BookOpen, Calendar, Radio, Play, GraduationCap, Sparkles, Heart,
  UserPlus, Mail, CalendarCheck, DollarSign, CheckCheck, type LucideIcon,
} from 'lucide-react'

export interface NotifItem {
  id: string; type: string; title: string; summary: string; date: string; href: string; image?: string | null
}

const ICONS: Record<string, LucideIcon> = {
  formation: BookOpen, evenement: Calendar, live: Radio, replay: Play,
  enseignement: GraduationCap, temoignage: Sparkles, priere: Heart,
  membre: UserPlus, contact: Mail, inscription_evt: CalendarCheck, don: DollarSign,
}
const COLORS: Record<string, string> = {
  formation: '#8B5CF6', evenement: '#22C55E', live: '#EF4444', replay: '#F59E0B',
  enseignement: '#8B5CF6', temoignage: '#D4AF37', priere: '#EC4899',
  membre: '#0EA5E9', contact: '#0EA5E9', inscription_evt: '#22C55E', don: '#EAB308',
}

function relTime(iso: string): string {
  try {
    const d = new Date(iso).getTime()
    const diff = Date.now() - d
    const m = Math.round(diff / 60000)
    if (m < 1) return "à l'instant"
    if (m < 60) return `il y a ${m} min`
    const h = Math.round(m / 60)
    if (h < 24) return `il y a ${h} h`
    const j = Math.round(h / 24)
    if (j < 7) return `il y a ${j} j`
    return new Date(iso).toLocaleDateString('fr-FR')
  } catch { return '' }
}

function loadRead(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { const v = window.localStorage.getItem(key); return new Set(v ? (JSON.parse(v) as string[]) : []) } catch { return new Set() }
}

export function NotificationBell({ endpoint, storageKey, realtimeTable, markEndpoint }: { endpoint: string; storageKey: string; realtimeTable?: string; markEndpoint?: string }) {
  const [items, setItems] = useState<NotifItem[]>([])
  const [read, setRead] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [showAll, setShowAll] = useState(false) // false = seulement les non-lues
  const ref = useRef<HTMLDivElement>(null)
  const fetchRef = useRef<() => void>(() => {})

  useEffect(() => {
    const localRead = loadRead(storageKey)
    setRead(localRead); setHydrated(true)
    let cancelled = false
    const fetchNotifs = async () => {
      try {
        const r = await fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' })
        if (!r.ok) return
        const j = await r.json()
        if (cancelled || !j.ok || !Array.isArray(j.data)) return
        setItems(j.data)
        // État lu SERVEUR (multi-appareils) : fusion avec le cache local optimiste.
        if (Array.isArray(j.reads)) {
          setRead((prev) => { const merged = new Set(prev); j.reads.forEach((k: string) => merged.add(k)); return merged })
        }
      } catch { /* silencieux : ne bloque jamais l'ouverture */ }
    }
    fetchRef.current = fetchNotifs
    fetchNotifs()
    // Temps réel : abonnement Supabase Realtime si une table est fournie (push instantané) ;
    // sinon repli polling. Le poll reste comme filet (contenu dérivé / déconnexion WS).
    let channel: ReturnType<typeof supabase.channel> | null = null
    if (realtimeTable) {
      try {
        channel = supabase
          .channel(`notif-${realtimeTable}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: realtimeTable }, () => fetchRef.current())
          .subscribe()
      } catch { /* WS indispo → on garde le poll */ }
    }
    const interval = setInterval(fetchNotifs, realtimeTable ? 120000 : 45000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchNotifs() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true; clearInterval(interval); document.removeEventListener('visibilitychange', onVisible)
      if (channel) { try { supabase.removeChannel(channel) } catch { /* */ } }
    }
  }, [endpoint, storageKey, realtimeTable])

  // Persistance : localStorage (cache optimiste) + serveur (si markEndpoint).
  const persist = useCallback((next: Set<string>, changedKeys?: string[]) => {
    setRead(new Set(next))
    try { window.localStorage.setItem(storageKey, JSON.stringify(Array.from(next))) } catch { /* quota */ }
    if (markEndpoint && changedKeys && changedKeys.length) {
      try { fetch(markEndpoint, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keys: changedKeys }), keepalive: true }) } catch { /* */ }
    }
  }, [storageKey, markEndpoint])

  // Fermeture au clic extérieur.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const unread = hydrated ? items.filter((i) => !read.has(i.id)).length : 0
  // La cloche n'affiche que les NON-LUES (sauf bascule historique) → se vide après "tout marquer".
  const visible = hydrated && !showAll ? items.filter((i) => !read.has(i.id)) : items
  const markOne = (id: string) => { const n = new Set(read); n.add(id); persist(n, [id]) }
  const markAll = () => { const n = new Set(read); const changed = items.filter((i) => !n.has(i.id)).map((i) => i.id); items.forEach((i) => n.add(i.id)); persist(n, changed) }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-white/5"
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ background: '#EF4444', border: '2px solid #050505' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 mt-2 w-[320px] max-w-[92vw] rounded-2xl overflow-hidden z-[60]"
            style={{ background: 'rgba(10,0,20,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(212,175,55,0.15)', boxShadow: '0 20px 60px rgba(0,0,0,0.55)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="font-cinzel text-sm font-bold text-pearl">Notifications</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowAll((s) => !s)} className="text-[11px] font-inter text-pearl/45 hover:text-pearl/80">
                  {showAll ? 'Non lues' : 'Historique'}
                </button>
                {unread > 0 && (
                  <button onClick={markAll} className="inline-flex items-center gap-1 text-[11px] font-inter text-gold/80 hover:text-gold">
                    <CheckCheck className="w-3.5 h-3.5" /> Tout marquer comme lu
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {visible.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <CheckCheck className="w-7 h-7 mx-auto mb-3 text-gold/30" />
                  <p className="font-inter text-sm text-pearl/40">{showAll ? 'Aucune notification pour le moment' : 'Vous êtes à jour ✅'}</p>
                </div>
              ) : (
                visible.map((n) => {
                  const Icon = ICONS[n.type] || Bell
                  const color = COLORS[n.type] || '#D4AF37'
                  const isUnread = !read.has(n.id)
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => { markOne(n.id); setOpen(false) }}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03] border-b border-white/[0.03]"
                      style={{ background: isUnread ? 'rgba(212,175,55,0.05)' : 'transparent' }}
                    >
                      {n.image ? (
                        <span className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                          <Image src={n.image} alt="" fill sizes="36px" className="object-cover" />
                        </span>
                      ) : (
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${color}1A`, border: `1px solid ${color}33` }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-inter text-xs font-semibold text-pearl truncate">{n.title}</p>
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#EF4444' }} />}
                        </div>
                        <p className="font-inter text-[11px] text-pearl/50 truncate">{n.summary}</p>
                        <p className="font-inter text-[10px] text-pearl/30 mt-0.5">{relTime(n.date)}</p>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
