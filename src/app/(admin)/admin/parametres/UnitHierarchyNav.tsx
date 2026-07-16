'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Loader2, Building2, Globe2, MapPin, Church } from 'lucide-react'

export type HierarchyUnit = {
  id: string
  parent_id: string | null
  unit_type: string
  name: string
  slug: string
  status: string
  continent_code: string | null
  country_code: string | null
  city: string | null
  depth: number
  materialized_path: string
}

export type HierarchyActor = {
  userId: string
  highestRole: string | null
  isWorldScope: boolean
  homeUnitIds: string[]
}

type Props = {
  activeUnitId: string | null
  onSelect: (unit: HierarchyUnit) => void
  onActor?: (actor: HierarchyActor | null) => void
}

const TYPE_LABEL: Record<string, string> = {
  world_headquarters: 'Siège mondial',
  continental_zone: 'Zone continentale',
  national_central_church: 'Église centrale nationale',
  local_church: 'Église locale',
}

function TypeIcon({ type }: { type: string }) {
  if (type === 'world_headquarters') return <Globe2 className="w-3.5 h-3.5 text-gold" />
  if (type === 'continental_zone') return <MapPin className="w-3.5 h-3.5 text-sky-400" />
  if (type === 'national_central_church') return <Building2 className="w-3.5 h-3.5 text-emerald-400" />
  return <Church className="w-3.5 h-3.5 text-violet-400" />
}

export function UnitHierarchyNav({ activeUnitId, onSelect, onActor }: Props) {
  const [units, setUnits] = useState<HierarchyUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actor, setActor] = useState<HierarchyActor | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch('/api/admin/organization-hierarchy', { credentials: 'same-origin' })
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.ok) {
          if (!cancelled) {
            setError(j?.message || 'Chargement hiérarchie impossible.')
            setUnits([])
            setActor(null)
            onActor?.(null)
          }
          return
        }
        const list = (j.data?.units || []) as HierarchyUnit[]
        const act = j.data?.actor as HierarchyActor | undefined
        if (!cancelled) {
          setUnits(list)
          setActor(act || null)
          onActor?.(act || null)
          if (list.length && !activeUnitId) {
            const home = act?.homeUnitIds?.[0]
            const pick = list.find((u) => u.id === home) || list[0]
            if (pick) onSelect(pick)
          }
        }
      } catch {
        if (!cancelled) setError('Erreur réseau')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="card-royal flex items-center gap-2 text-sm text-pearl/50 py-6">
        <Loader2 className="w-4 h-4 animate-spin text-gold" />
        Chargement de la hiérarchie…
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-royal">
        <p className="text-[12px] text-danger font-inter">{error}</p>
        <p className="text-[11px] text-pearl/40 mt-2">
          Identité Supabase requise (en plus du cookie admin). Migration Lot 5 requise en base.
        </p>
      </div>
    )
  }

  return (
    <div className="card-royal">
      <h2 className="font-cinzel text-sm font-bold text-pearl mb-1.5 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-gold" />
        Hiérarchie mondiale
      </h2>
      {actor?.highestRole && (
        <p className="text-[11px] text-pearl/40 font-inter mb-3">
          Rôle : <span className="text-gold/90">{actor.highestRole}</span>
          {actor.isWorldScope ? ' · portée mondiale' : ''}
        </p>
      )}
      <ul className="space-y-1">
        {units.map((u) => {
          const active = u.id === activeUnitId
          return (
            <li key={u.id} style={{ paddingLeft: `${Math.min(u.depth, 3) * 12}px` }}>
              <button
                type="button"
                onClick={() => onSelect(u)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-sm transition-all"
                style={{
                  background: active ? 'rgba(212,175,55,0.12)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(212,175,55,0.35)' : 'transparent'}`,
                  color: active ? '#D4AF37' : 'rgba(255,255,255,0.65)',
                }}
              >
                <TypeIcon type={u.unit_type} />
                <span className="flex-1 font-inter truncate">{u.name}</span>
                <span className="text-[10px] text-pearl/35 shrink-0">
                  {TYPE_LABEL[u.unit_type] || u.unit_type}
                </span>
                {active && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </li>
          )
        })}
        {units.length === 0 && (
          <li className="text-[12px] text-pearl/40 font-inter py-2">Aucune unité accessible.</li>
        )}
      </ul>
    </div>
  )
}
