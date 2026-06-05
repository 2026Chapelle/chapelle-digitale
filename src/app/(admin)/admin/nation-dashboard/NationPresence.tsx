'use client'
import { useEffect, useState } from 'react'
import { Loader2, CalendarCheck } from 'lucide-react'

interface PresenceGlobal { taux_presence: number; taux_assiduite: number; present: number; total: number }
interface PresenceOverview { global: PresenceGlobal; nb_groupes: number; nb_releves: number }

/**
 * Carte d'assiduité (présence Chantier 4) pour la nation sélectionnée.
 * Ajout strictement additif : ce composant charge lui-même l'API overview
 * et se recharge quand `pays` change. Aucune donnée fictive.
 */
export default function NationPresence({ pays }: { pays?: string }) {
  const [data, setData] = useState<PresenceOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const url = `/api/admin/reunions?overview=1${pays ? `&pays=${encodeURIComponent(pays)}` : ''}`
    fetch(url, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok && j.data) setData(j.data) })
      .catch(() => { /* silencieux */ })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [pays])

  const empty = !data || data.nb_releves === 0

  return (
    <div className="card-cinematic p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#D4AF3718', border: '1px solid #D4AF3730' }}>
          <CalendarCheck className="w-4 h-4" style={{ color: '#D4AF37' }} />
        </div>
        <div>
          <div className="font-cinzel text-sm font-black text-pearl leading-none">Assiduité</div>
          <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">Présence · Chantier 4</div>
        </div>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-pearl/40 ml-1" />}
      </div>

      {empty ? (
        <div className="text-pearl/40 font-inter text-sm py-2">
          {loading ? 'Chargement…' : 'Aucun relevé de présence pour ce périmètre.'}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="font-cinzel text-2xl font-black text-pearl leading-none">{data!.global.taux_presence}%</div>
            <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">Taux de présence</div>
          </div>
          <div>
            <div className="font-cinzel text-2xl font-black text-pearl leading-none" style={{ color: '#D4AF37' }}>{data!.global.taux_assiduite}%</div>
            <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">Assiduité</div>
          </div>
          <div>
            <div className="font-cinzel text-2xl font-black text-pearl leading-none">{data!.nb_groupes.toLocaleString('fr-FR')}</div>
            <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">Groupes</div>
          </div>
        </div>
      )}
    </div>
  )
}
