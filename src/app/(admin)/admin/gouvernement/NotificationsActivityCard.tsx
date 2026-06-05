'use client'
import { useEffect, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'

/**
 * Activité Notifications (Super Admin) — carte autonome qui interroge
 * /api/admin/notifications/stats. Additive : aucun impact sur le flux de données
 * du cockpit (même patron que PresenceCard / ConversionsCard).
 */
interface KV { label: string; count: number }
interface Stats {
  total_30j: number; last_24h: number; last_7j: number
  par_type: KV[]; par_audience: KV[]
  recentes: { type: string; audience: string; title: string; date: string }[]
}

const TYPE_LABEL: Record<string, string> = {
  don: 'Dons', priere: 'Prières', formation: 'Formations', achat: 'Achats',
  live: 'Lives', evenement: 'Événements', membre: 'Membres', systeme: 'Système', info: 'Infos', autre: 'Autres',
}
const fmtN = (n: number) => n.toLocaleString('fr-FR')
const fmtDate = (s: string) => { try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

export default function NotificationsActivityCard() {
  const [s, setS] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/admin/notifications/stats', { credentials: 'same-origin' })
        const j = await r.json()
        if (!cancelled && j.ok && !j.demo) setS(j)
      } catch { /* silencieux */ }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="card-cinematic p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-gold" />
        <h3 className="font-cinzel font-bold text-pearl">Activité Notifications</h3>
        <span className="text-[11px] text-pearl/35 font-inter ml-auto">30 derniers jours</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-6"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
      ) : !s ? (
        <p className="text-pearl/40 font-inter text-sm py-4">Aucune donnée disponible.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: '24 h', value: s.last_24h, color: '#22C55E' },
              { label: '7 jours', value: s.last_7j, color: '#0EA5E9' },
              { label: '30 jours', value: s.total_30j, color: '#D4AF37' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="font-cinzel font-black text-xl" style={{ color: k.color }}>{fmtN(k.value)}</div>
                <div className="text-[10px] text-pearl/40 font-inter mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {s.par_type.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {s.par_type.slice(0, 8).map((t) => (
                <span key={t.label} className="px-2.5 py-1 rounded-full text-[11px] font-inter"
                  style={{ background: 'rgba(212,175,55,0.10)', color: 'rgba(212,175,55,0.85)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  {TYPE_LABEL[t.label] || t.label} · {fmtN(t.count)}
                </span>
              ))}
            </div>
          )}

          {s.recentes.length > 0 && (
            <div className="space-y-1.5">
              {s.recentes.slice(0, 6).map((n, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-xs font-inter">
                  <span className="text-pearl/70 truncate">{n.title}</span>
                  <span className="text-pearl/30 flex-shrink-0">{fmtDate(n.date)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
