'use client'
import { useEffect, useState } from 'react'
import { Megaphone, X } from 'lucide-react'

/**
 * Bannière d'annonces officielles — affiche les annonces actives correspondant
 * à l'audience du membre (filtrage serveur). Refermable (mémorisé en local).
 */
interface Announcement { id: string; titre: string; body?: string; level: string }

const STYLE: Record<string, { bg: string; border: string; fg: string }> = {
  critique: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.35)', fg: '#FCA5A5' },
  important: { bg: 'rgba(212,175,55,0.10)', border: 'rgba(212,175,55,0.35)', fg: '#F5E6A7' },
  info: { bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.30)', fg: '#7DD3FC' },
}

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    try { setDismissed(JSON.parse(localStorage.getItem('dismissed_announcements') || '[]')) } catch { /* */ }
    ;(async () => {
      try { const r = await fetch('/api/member/announcements', { credentials: 'same-origin' }); const j = await r.json(); if (j.ok) setItems(j.data || []) } catch { /* */ }
    })()
  }, [])

  const close = (id: string) => {
    const next = [...dismissed, id]
    setDismissed(next)
    try { localStorage.setItem('dismissed_announcements', JSON.stringify(next)) } catch { /* */ }
  }

  const visible = items.filter((a) => !dismissed.includes(a.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2 mb-5">
      {visible.map((a) => {
        const s = STYLE[a.level] || STYLE.info
        return (
          <div key={a.id} className="rounded-2xl px-4 py-3 flex items-start gap-3" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <Megaphone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.fg }} />
            <div className="flex-1 min-w-0">
              <p className="font-cinzel font-bold text-sm" style={{ color: s.fg }}>{a.titre}</p>
              {a.body && <p className="font-inter text-xs text-pearl/60 mt-0.5">{a.body}</p>}
            </div>
            <button onClick={() => close(a.id)} className="p-1 rounded-lg hover:bg-white/10 text-pearl/40 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        )
      })}
    </div>
  )
}
