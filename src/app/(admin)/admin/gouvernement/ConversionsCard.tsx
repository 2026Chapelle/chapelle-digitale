'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, Repeat, ArrowRight, ShieldCheck, Users } from 'lucide-react'

interface Conversions {
  granularity: string
  conversions_over_time: { period: string; total: number; byStatut: Record<string, number> }[]
  top_transitions: { from: string; to: string; count: number }[]
  total_transitions: number
  nb_membres: number
  retention: number
}

const statutLabel = (s: string) => (s === '—' ? '—' : s.replace(/_/g, ' '))

/**
 * Carte « Conversions & progression » (P4 — exploitation de membre_statut_history).
 * Composant CLIENT autonome : GET /api/admin/conversions (cookies same-origin).
 * Strictement additif — n'altère aucune logique du cockpit gouvernement.
 */
export default function ConversionsCard() {
  const [data, setData] = useState<Conversions | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/admin/conversions', { credentials: 'same-origin' })
        const j = await r.json()
        if (alive && j?.ok && j.data) setData(j.data as Conversions)
      } catch { /* */ }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const recent = (data?.conversions_over_time || []).slice(-6)
  const maxTotal = Math.max(1, ...recent.map((p) => p.total))

  return (
    <div className="card-royal">
      <h2 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-gold" /> Conversions &amp; progression
      </h2>

      {loading ? (
        <div className="h-28 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }} />
      ) : !data || data.total_transitions === 0 ? (
        <div className="py-8 text-center">
          <p className="font-inter text-sm text-pearl/40">Aucune conversion de statut enregistrée</p>
          <p className="font-inter text-xs text-pearl/25 mt-1">L'historique s'alimente au fil des progressions de membres.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <CStat icon={ShieldCheck} label="Rétention (actifs)" value={`${data.retention}%`} color="#22C55E" />
            <CStat icon={Users} label="Membres suivis" value={data.nb_membres} />
            <CStat icon={Repeat} label="Transitions (12 mois)" value={data.total_transitions} color="#D4AF37" />
          </div>

          {/* Conversions par mois (total) */}
          {recent.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-inter text-pearl/40 mb-2">Conversions par mois</p>
              <div className="flex items-end gap-1.5 h-20">
                {recent.map((p) => (
                  <div key={p.period} className="flex-1 flex flex-col items-center gap-1" title={`${p.period} : ${p.total}`}>
                    <div className="w-full rounded-t" style={{ height: `${Math.round((p.total / maxTotal) * 100)}%`, minHeight: 3, background: 'rgba(212,175,55,0.5)' }} />
                    <span className="text-[9px] font-inter text-pearl/30">{p.period.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top transitions */}
          {data.top_transitions.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-inter text-pearl/40 mb-2">Transitions fréquentes</p>
              <div className="space-y-1">
                {data.top_transitions.slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-inter">
                    <span className="text-pearl/55">{statutLabel(t.from)}</span>
                    <ArrowRight className="w-3 h-3 text-pearl/25 flex-shrink-0" />
                    <span className="text-pearl/75">{statutLabel(t.to)}</span>
                    <span className="ml-auto text-[11px] font-semibold" style={{ color: '#D4AF37' }}>{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 flex-shrink-0" style={{ color: color || 'rgba(245,230,216,0.4)' }} />
        <span className="text-[10px] font-inter text-pearl/45 leading-tight">{label}</span>
      </div>
      <div className="font-cinzel text-lg font-black" style={{ color: color || '#F5E6A7' }}>
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </div>
    </div>
  )
}
