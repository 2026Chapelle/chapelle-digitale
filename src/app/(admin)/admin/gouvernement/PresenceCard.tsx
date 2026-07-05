'use client'
import { useEffect, useState } from 'react'
import { CalendarCheck, UserCheck, Activity, Users, ClipboardList } from 'lucide-react'

interface PresenceOverview {
  global: { taux_presence: number; taux_assiduite: number; present: number; absent: number; excuse: number; total: number }
  nb_groupes: number
  nb_releves: number
}

/**
 * Carte « Assiduité aux réunions » (Chantier 4 — présences).
 * Composant CLIENT autonome : charge GET /api/admin/reunions?overview=1 (cookies same-origin)
 * et rend la synthèse. Strictement additif — n'altère aucune logique du cockpit existant.
 */
export default function PresenceCard() {
  const [data, setData] = useState<PresenceOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/admin/reunions?overview=1', { credentials: 'same-origin' })
        const j = await r.json()
        if (alive && j?.ok && j.data) setData(j.data as PresenceOverview)
      } catch { /* */ }
      if (alive) setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="card-royal">
      <h2 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-gold" /> Assiduité aux réunions
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl h-16" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      ) : !data || data.nb_releves === 0 ? (
        <div className="py-8 text-center">
          <p className="font-inter text-sm text-pearl/40">Présences non encore enregistrées</p>
          <p className="font-inter text-xs text-pearl/25 mt-1">La synthèse s'affichera dès le premier relevé de présence.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <PStat icon={UserCheck} label="Taux de présence" value={`${data.global.taux_presence}%`} color="#22C55E" />
          <PStat icon={Activity} label="Assiduité" value={`${data.global.taux_assiduite}%`} color="#D4AF37" />
          <PStat icon={Users} label="Groupes suivis" value={data.nb_groupes} />
          <PStat icon={ClipboardList} label="Relevés" value={data.nb_releves} />
        </div>
      )}
    </div>
  )
}

function PStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: string }) {
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
