'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Shield, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { UnitMembershipsTable } from './UnitMembershipsTable'
import { UnitInviteForm } from './UnitInviteForm'
import { UnitGovernanceHistory } from './UnitGovernanceHistory'
import { MemberSearchSelect } from './MemberSearchSelect'

const FALLBACK_ROLES = [
  'world_admin',
  'zone_admin',
  'national_admin',
  'local_admin',
  'staff',
  'member',
  'viewer',
] as const

function roleFitsUnitType(role: string, unitType: string | undefined): boolean {
  if (!unitType) return true
  if (role === 'world_super_admin' || role === 'world_admin') return unitType === 'world_headquarters'
  if (role === 'zone_admin') return unitType === 'continental_zone'
  if (role === 'national_admin') return unitType === 'national_central_church'
  if (role === 'local_admin') return unitType === 'local_church'
  return role === 'staff' || role === 'member' || role === 'viewer'
}

export function UnitGovernancePanel({
  unitId,
  unitLabel,
  unitType,
  canWrite: canWriteProp,
}: {
  unitId: string | null
  unitLabel?: string
  unitType?: string
  canWrite?: boolean
}) {
  const [perms, setPerms] = useState<Record<string, unknown> | null>(null)
  const [tick, setTick] = useState(0)
  const [nomUserId, setNomUserId] = useState('')
  const [nomRole, setNomRole] = useState('member')
  const [nomBusy, setNomBusy] = useState(false)
  const [nomMsg, setNomMsg] = useState<string | null>(null)
  const [nomErr, setNomErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/admin/organization-unit-effective-permissions', {
          credentials: 'same-origin',
        })
        const j = await r.json().catch(() => ({}))
        if (!cancelled && r.ok && j?.ok) setPerms(j.data?.permissions || null)
      } catch {
        if (!cancelled) setPerms(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tick])

  const assignable = Array.isArray(perms?.assignableRoles)
    ? (perms!.assignableRoles as string[])
    : undefined

  const actorUserId =
    typeof perms?.actorUserId === 'string' ? (perms.actorUserId as string) : null
  const actorHighestRole =
    typeof perms?.highestRole === 'string' ? (perms.highestRole as string) : null

  const canWrite =
    canWriteProp !== undefined
      ? canWriteProp
      : Boolean(assignable && assignable.length > 0)

  const roles = useMemo(() => {
    const base = (assignable && assignable.length > 0 ? assignable : [...FALLBACK_ROLES]).filter(
      (r) => r !== 'world_super_admin',
    )
    return base.filter((r) => roleFitsUnitType(r, unitType))
  }, [assignable, unitType])

  const showNominate = canWrite && roles.length > 0 && !!unitId

  useEffect(() => {
    if (roles.length && !roles.includes(nomRole)) {
      setNomRole(roles[0])
    }
  }, [roles, nomRole])

  async function nominate(e: React.FormEvent) {
    e.preventDefault()
    if (!unitId || nomBusy || !nomUserId) return
    setNomBusy(true)
    setNomMsg(null)
    setNomErr(null)
    try {
      const r = await fetch('/api/admin/organization-unit-memberships', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_unit_id: unitId,
          user_id: nomUserId.trim(),
          unit_role: nomRole,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        const message = j?.message || 'Nomination refusée.'
        setNomErr(message)
        toast.error(message)
      } else {
        setNomMsg('Nomination enregistrée.')
        toast.success('Nomination enregistrée.')
        setNomUserId('')
        setTick((t) => t + 1)
      }
    } catch {
      setNomErr('Erreur réseau')
      toast.error('Erreur réseau')
    } finally {
      setNomBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-royal">
        <h2 className="font-cinzel text-sm font-bold text-pearl mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold" />
          Accès & nominations
        </h2>
        <p className="text-[11px] text-pearl/40 font-inter">
          {unitLabel || unitId || 'Aucune unité sélectionnée'}
          {unitType ? ` · ${unitType}` : ''}
        </p>
        {perms && (
          <div className="mt-3 text-[11px] font-inter text-pearl/50 space-y-1">
            <div>
              Rôle acteur :{' '}
              <span className="text-pearl/80">{String(perms.highestRole || '—')}</span>
            </div>
            <div>
              Scope mondial : {perms.isWorldScope ? 'oui' : 'non'} · Unités accessibles :{' '}
              {String(perms.accessibleUnitCount ?? '—')}
            </div>
            <div>
              Rôles attribuables :{' '}
              {(Array.isArray(perms.assignableRoles) ? perms.assignableRoles : []).join(', ') ||
                '—'}
            </div>
          </div>
        )}
      </div>

      {showNominate && (
        <form onSubmit={nominate} className="card-royal space-y-3">
          <h3 className="font-cinzel text-sm text-pearl flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-gold" />
            Nominer un membre
          </h3>
          <MemberSearchSelect
            value={nomUserId}
            onChange={setNomUserId}
            disabled={nomBusy}
          />
          <select
            className="input-royal w-full text-xs font-inter"
            value={nomRole}
            disabled={nomBusy}
            onChange={(e) => setNomRole(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {nomErr && <p className="text-xs text-danger font-inter">{nomErr}</p>}
          {nomMsg && <p className="text-xs text-green-400/80 font-inter">{nomMsg}</p>}
          <button
            type="submit"
            disabled={nomBusy || !nomUserId}
            className="btn-gold-cinematic px-4 py-2 text-sm disabled:opacity-50"
          >
            {nomBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Nominer'}
          </button>
        </form>
      )}

      <UnitMembershipsTable
        key={`mem-${unitId}-${tick}`}
        unitId={unitId}
        unitLabel={unitLabel}
        unitType={unitType}
        assignableRoles={assignable}
        canWrite={canWrite}
        actorUserId={actorUserId}
        actorHighestRole={actorHighestRole}
        onChanged={() => setTick((t) => t + 1)}
      />
      <UnitInviteForm
        unitId={unitId}
        unitType={unitType}
        assignableRoles={assignable}
        canWrite={canWrite}
        onChanged={() => setTick((t) => t + 1)}
      />
      <UnitGovernanceHistory unitId={unitId} key={`hist-${tick}`} />
    </div>
  )
}
