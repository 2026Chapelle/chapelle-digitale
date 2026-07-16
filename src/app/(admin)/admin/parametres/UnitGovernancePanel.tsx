'use client'

import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { UnitMembershipsTable } from './UnitMembershipsTable'
import { UnitInviteForm } from './UnitInviteForm'
import { UnitGovernanceHistory } from './UnitGovernanceHistory'

export function UnitGovernancePanel({
  unitId,
  unitLabel,
}: {
  unitId: string | null
  unitLabel?: string
}) {
  const [perms, setPerms] = useState<Record<string, unknown> | null>(null)
  const [tick, setTick] = useState(0)

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

  return (
    <div className="space-y-4">
      <div className="card-royal">
        <h2 className="font-cinzel text-sm font-bold text-pearl mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gold" />
          Accès & nominations
        </h2>
        <p className="text-[11px] text-pearl/40 font-inter">
          {unitLabel || unitId || 'Aucune unité sélectionnée'}
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
      <UnitMembershipsTable unitId={unitId} onChanged={() => setTick((t) => t + 1)} />
      <UnitInviteForm unitId={unitId} assignableRoles={assignable} />
      <UnitGovernanceHistory unitId={unitId} />
    </div>
  )
}
