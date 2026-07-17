'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, Loader2, Building2, Globe2, MapPin, Church, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { expectedChildType, type OrganizationUnitType } from '@/core/erp/unit'

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
  /** Droit d'écriture (admin unitaire). Masque création enfant si faux. */
  canWrite?: boolean
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

export function UnitHierarchyNav({ activeUnitId, onSelect, onActor, canWrite = false }: Props) {
  const [units, setUnits] = useState<HierarchyUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actor, setActor] = useState<HierarchyActor | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createCity, setCreateCity] = useState('')
  const [createContinent, setCreateContinent] = useState('')
  const [createCountry, setCreateCountry] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [createOk, setCreateOk] = useState<string | null>(null)

  const activeUnit = units.find((u) => u.id === activeUnitId) || null
  const childType =
    activeUnit && canWrite
      ? expectedChildType(activeUnit.unit_type as OrganizationUnitType)
      : null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/organization-hierarchy', { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setError(j?.message || 'Chargement hiérarchie impossible.')
        setUnits([])
        setActor(null)
        onActor?.(null)
        return
      }
      const list = (j.data?.units || []) as HierarchyUnit[]
      const act = j.data?.actor as HierarchyActor | undefined
      setUnits(list)
      setActor(act || null)
      onActor?.(act || null)
      if (list.length && !activeUnitId) {
        const home = act?.homeUnitIds?.[0]
        const pick = list.find((u) => u.id === home) || list[0]
        if (pick) onSelect(pick)
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createChild(e: React.FormEvent) {
    e.preventDefault()
    if (!activeUnit || !childType || createBusy) return
    setCreateBusy(true)
    setCreateErr(null)
    setCreateOk(null)
    try {
      const body: Record<string, string> = {
        parent_id: activeUnit.id,
        unit_type: childType,
        name: createName.trim(),
      }
      if (childType === 'local_church' && createCity.trim()) {
        body.city = createCity.trim()
      }
      if (childType === 'continental_zone' && createContinent.trim()) {
        body.continent_code = createContinent.trim().toUpperCase()
      }
      if (childType === 'national_central_church' && createCountry.trim()) {
        body.country_code = createCountry.trim().toUpperCase()
      }
      const r = await fetch('/api/admin/organization-units', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        const msg = j?.message || 'Création refusée.'
        setCreateErr(msg)
        toast.error(msg)
      } else {
        const msg = `Unité « ${createName.trim()} » créée.`
        setCreateOk(msg)
        toast.success(msg)
        setCreateName('')
        setCreateCity('')
        setCreateContinent('')
        setCreateCountry('')
        setShowCreate(false)
        await load()
        if (j.data?.unit) {
          onSelect(j.data.unit as HierarchyUnit)
        }
      }
    } catch {
      setCreateErr('Erreur réseau')
      toast.error('Erreur réseau')
    } finally {
      setCreateBusy(false)
    }
  }

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
    <div className="card-royal space-y-3">
      <h2 className="font-cinzel text-sm font-bold text-pearl mb-1.5 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-gold" />
        Hiérarchie mondiale
      </h2>
      {actor?.highestRole && (
        <p className="text-[11px] text-pearl/40 font-inter mb-1">
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

      {/* Création unité enfant — jamais sous local_church (expectedChildType null) */}
      {activeUnit && childType && (
        <div className="border-t border-white/5 pt-3 space-y-2">
          {!showCreate ? (
            <button
              type="button"
              className="btn-gold-cinematic px-3 py-2 text-xs inline-flex items-center gap-1.5"
              onClick={() => {
                setShowCreate(true)
                setCreateErr(null)
                setCreateOk(null)
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle unité
            </button>
          ) : (
            <form onSubmit={createChild} className="space-y-2">
              <p className="text-[11px] font-inter text-pearl/50">
                Sous « {activeUnit.name} » → type enfant :{' '}
                <span className="text-gold/90">{TYPE_LABEL[childType] || childType}</span>
              </p>
              <input
                className="input-royal w-full text-xs font-inter"
                type="text"
                required
                maxLength={200}
                placeholder="Nom de l’unité"
                value={createName}
                disabled={createBusy}
                onChange={(e) => setCreateName(e.target.value)}
              />
              <input
                className="input-royal w-full text-xs font-inter opacity-70"
                type="text"
                readOnly
                value={TYPE_LABEL[childType] || childType}
                aria-label="Type d’unité (calculé)"
              />
              {childType === 'continental_zone' && (
                <input
                  className="input-royal w-full text-xs font-inter"
                  type="text"
                  maxLength={8}
                  placeholder="Code continent (ex. AF, EU)"
                  value={createContinent}
                  disabled={createBusy}
                  onChange={(e) => setCreateContinent(e.target.value)}
                />
              )}
              {childType === 'national_central_church' && (
                <input
                  className="input-royal w-full text-xs font-inter"
                  type="text"
                  maxLength={8}
                  placeholder="Code pays (ex. CI, FR)"
                  value={createCountry}
                  disabled={createBusy}
                  onChange={(e) => setCreateCountry(e.target.value)}
                />
              )}
              {childType === 'local_church' && (
                <input
                  className="input-royal w-full text-xs font-inter"
                  type="text"
                  maxLength={120}
                  placeholder="Ville (optionnel)"
                  value={createCity}
                  disabled={createBusy}
                  onChange={(e) => setCreateCity(e.target.value)}
                />
              )}
              {createErr && <p className="text-xs text-danger font-inter">{createErr}</p>}
              {createOk && <p className="text-xs text-green-400/80 font-inter">{createOk}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={createBusy || !createName.trim()}
                  className="btn-gold-cinematic px-3 py-2 text-xs disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  {createBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Créer'}
                </button>
                <button
                  type="button"
                  disabled={createBusy}
                  className="text-xs font-inter text-pearl/50 hover:text-pearl"
                  onClick={() => setShowCreate(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
