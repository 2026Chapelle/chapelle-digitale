'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

type Ev = {
  id: string
  action: string
  from_role: string | null
  to_role: string | null
  subject_user_id: string | null
  actor_user_id: string
  created_at: string
}

export function UnitGovernanceHistory({ unitId }: { unitId: string | null }) {
  const [events, setEvents] = useState<Ev[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!unitId) {
      setEvents([])
      return
    }
    setLoading(true)
    try {
      const r = await fetch(
        `/api/admin/organization-unit-governance-events?unitId=${encodeURIComponent(unitId)}`,
        { credentials: 'same-origin' },
      )
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.ok) setEvents(j.data?.events || [])
      else setEvents([])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [unitId])

  useEffect(() => {
    void load()
  }, [load])

  if (!unitId) return null

  return (
    <div className="card-royal space-y-3">
      <h3 className="font-cinzel text-sm text-pearl">Historique</h3>
      {loading && <Loader2 className="w-4 h-4 animate-spin text-gold" />}
      <ul className="space-y-2 text-[11px] font-inter text-pearl/60">
        {events.map((e) => (
          <li key={e.id} className="border-b border-white/[0.04] pb-2">
            <span className="text-gold/80">{e.action}</span>
            {e.from_role || e.to_role
              ? ` · ${e.from_role || '—'} → ${e.to_role || '—'}`
              : ''}
            <div className="text-pearl/30">
              {new Date(e.created_at).toLocaleString('fr-FR')}
              {e.subject_user_id ? ` · sujet ${e.subject_user_id.slice(0, 8)}…` : ''}
            </div>
          </li>
        ))}
        {!loading && events.length === 0 && (
          <li className="text-pearl/30">Aucun événement.</li>
        )}
      </ul>
    </div>
  )
}
