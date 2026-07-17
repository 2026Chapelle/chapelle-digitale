'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmAction } from './ConfirmAction'

type Profile = {
  id: string
  prenom?: string | null
  nom?: string | null
  email?: string | null
} | null

type Row = {
  id: string
  user_id: string
  unit_role: string
  status: string
  is_primary: boolean
  profile?: Profile
}

type UnitOpt = { id: string; name: string }

const FALLBACK_ROLES = [
  'world_admin',
  'zone_admin',
  'national_admin',
  'local_admin',
  'staff',
  'member',
  'viewer',
] as const

/** Dupliqué pur client (unit-governance-rules tire unit-access serveur). */
const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  member: 2,
  staff: 3,
  local_admin: 4,
  national_admin: 5,
  zone_admin: 6,
  world_admin: 7,
  world_super_admin: 8,
}

function roleRank(role: string | null | undefined): number {
  if (!role || !(role in ROLE_RANK)) return 0
  return ROLE_RANK[role]
}

function canManageSubjectRole(actorRole: string | null | undefined, subjectRole: string): boolean {
  if (!actorRole) return false
  const ar = roleRank(actorRole)
  const sr = roleRank(subjectRole)
  if (sr > ar) return false
  if (sr === ar && actorRole !== 'world_super_admin') return false
  return true
}

function roleFitsUnitType(role: string, unitType: string | undefined): boolean {
  if (!unitType) return true
  if (role === 'world_super_admin' || role === 'world_admin') return unitType === 'world_headquarters'
  if (role === 'zone_admin') return unitType === 'continental_zone'
  if (role === 'national_admin') return unitType === 'national_central_church'
  if (role === 'local_admin') return unitType === 'local_church'
  return role === 'staff' || role === 'member' || role === 'viewer'
}

function isSelfSensitiveDemotion(
  actorId: string | null | undefined,
  subjectId: string,
  fromRole: string,
): boolean {
  if (!actorId || actorId !== subjectId) return false
  return roleRank(fromRole) >= 4
}

function displayName(row: Row): string {
  const p = row.profile
  if (p) {
    const name = [p.prenom, p.nom].filter(Boolean).join(' ').trim()
    if (name) return name
    if (p.email) return p.email
  }
  return row.user_id.slice(0, 8) + '…'
}

function displayEmail(row: Row): string {
  return row.profile?.email || ''
}

type ConfirmState =
  | null
  | {
      kind: 'suspend' | 'remove' | 'transfer'
      row: Row
      toUnitId?: string
      toUnitName?: string
    }

export function UnitMembershipsTable({
  unitId,
  unitLabel,
  unitType,
  onChanged,
  assignableRoles,
  canWrite = false,
  actorUserId,
  actorHighestRole,
}: {
  unitId: string | null
  unitLabel?: string
  unitType?: string
  onChanged?: () => void
  assignableRoles?: string[]
  canWrite?: boolean
  actorUserId?: string | null
  actorHighestRole?: string | null
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [units, setUnits] = useState<UnitOpt[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({})
  const [transferDraft, setTransferDraft] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  const roles = useMemo(() => {
    const base = (assignableRoles && assignableRoles.length > 0
      ? assignableRoles
      : [...FALLBACK_ROLES]
    ).filter((r) => r !== 'world_super_admin')
    return base.filter((r) => roleFitsUnitType(r, unitType))
  }, [assignableRoles, unitType])

  const load = useCallback(async () => {
    if (!unitId) {
      setRows([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(
        `/api/admin/organization-unit-memberships?unitId=${encodeURIComponent(unitId)}`,
        { credentials: 'same-origin' },
      )
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setError(j?.message || 'Chargement impossible.')
        setRows([])
      } else {
        const list = (j.data?.memberships || []) as Row[]
        setRows(list)
        setRoleDraft((prev) => {
          const next = { ...prev }
          for (const m of list) {
            if (!next[m.id]) next[m.id] = m.unit_role
          }
          return next
        })
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [unitId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/admin/organization-units', { credentials: 'same-origin' })
        const j = await r.json().catch(() => ({}))
        if (!cancelled && r.ok && j?.ok) {
          const list = (j.data?.units || []) as { id: string; name: string }[]
          setUnits(list.map((u) => ({ id: u.id, name: u.name || u.id.slice(0, 8) })))
        }
      } catch {
        if (!cancelled) setUnits([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function canActOn(row: Row): boolean {
    if (!canWrite) return false
    if (!canManageSubjectRole(actorHighestRole, row.unit_role)) return false
    if (
      row.unit_role === 'world_super_admin' &&
      actorHighestRole !== 'world_super_admin'
    ) {
      return false
    }
    return true
  }

  function hideDestructiveSelf(row: Row): boolean {
    return isSelfSensitiveDemotion(actorUserId, row.user_id, row.unit_role)
  }

  async function patch(id: string, body: Record<string, unknown>, successMsg: string) {
    if (busy) return
    setBusy(id)
    setError(null)
    try {
      const r = await fetch(`/api/admin/organization-unit-memberships/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        const msg = j?.message || 'Action refusée.'
        setError(msg)
        toast.error(msg)
      } else {
        toast.success(successMsg)
        await load()
        onChanged?.()
      }
    } catch {
      setError('Erreur réseau')
      toast.error('Erreur réseau')
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  async function changeRole(id: string) {
    const role = roleDraft[id]
    if (!role || busy) return
    await patch(id, { unit_role: role }, 'Rôle mis à jour.')
  }

  async function doTransfer(id: string, to: string) {
    if (!to || busy) return
    setBusy(id)
    setError(null)
    try {
      const r = await fetch(`/api/admin/organization-unit-memberships/${id}/transfer`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_unit_id: to }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        const msg = j?.message || 'Transfert refusé.'
        setError(msg)
        toast.error(msg)
      } else {
        toast.success('Membre transféré.')
        await load()
        onChanged?.()
      }
    } catch {
      setError('Erreur réseau')
      toast.error('Erreur réseau')
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  if (!unitId) {
    return <p className="text-xs text-pearl/40 font-inter">Sélectionnez une unité.</p>
  }

  const transferTargets = units.filter((u) => u.id !== unitId)

  const confirmDescription = (() => {
    if (!confirm) return ''
    const person = displayName(confirm.row)
    const email = displayEmail(confirm.row)
    const who = email ? `${person} (${email})` : person
    const src = unitLabel || unitId
    if (confirm.kind === 'suspend') {
      return `Suspendre ${who} sur l’unité « ${src} » ?\nLa personne perdra l’accès actif jusqu’à réactivation.`
    }
    if (confirm.kind === 'remove') {
      return `Retirer définitivement ${who} de l’unité « ${src} » ?\nCette action retire l’affectation (statut removed).`
    }
    return `Transférer ${who} de « ${src} » vers « ${confirm.toUnitName || confirm.toUnitId} » ?\nL’affectation source sera déplacée vers l’unité cible.`
  })()

  return (
    <div className="card-royal space-y-3">
      <h3 className="font-cinzel text-sm text-pearl">Affectations</h3>
      {loading && <Loader2 className="w-4 h-4 animate-spin text-gold" />}
      {error && <p className="text-xs text-danger font-inter">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-inter text-pearl/70">
          <thead>
            <tr className="text-left text-pearl/40 border-b border-white/5">
              <th className="py-2 pr-2">Membre</th>
              <th className="py-2 pr-2">Rôle</th>
              <th className="py-2 pr-2">Statut</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const act = canActOn(row)
              const selfBlock = hideDestructiveSelf(row)
              return (
                <tr key={row.id} className="border-b border-white/[0.03] align-top">
                  <td className="py-2 pr-2">
                    <div className="text-pearl/85 font-medium">{displayName(row)}</div>
                    {displayEmail(row) ? (
                      <div className="text-[10px] text-pearl/40">{displayEmail(row)}</div>
                    ) : (
                      <div className="text-[10px] text-pearl/25 font-mono">
                        {row.user_id.slice(0, 8)}…
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex flex-col gap-1 min-w-[9rem]">
                      <span>{row.unit_role}</span>
                      {row.status === 'active' && act && !selfBlock && (
                        <div className="flex flex-wrap items-center gap-1">
                          <select
                            className="input-royal text-[10px] py-1"
                            value={roleDraft[row.id] ?? row.unit_role}
                            disabled={!!busy}
                            onChange={(e) =>
                              setRoleDraft((d) => ({ ...d, [row.id]: e.target.value }))
                            }
                          >
                            {Array.from(new Set([row.unit_role, ...roles])).map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={
                              !!busy || (roleDraft[row.id] ?? row.unit_role) === row.unit_role
                            }
                            className="btn-gold-cinematic px-2 py-1 text-[10px] disabled:opacity-40"
                            onClick={() => void changeRole(row.id)}
                          >
                            Changer
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    {row.status}
                    {row.is_primary ? ' · primary' : ''}
                  </td>
                  <td className="py-2 space-y-1">
                    {row.status === 'active' && act && (
                      <>
                        {!selfBlock && (
                          <div className="space-x-1">
                            <button
                              type="button"
                              disabled={!!busy}
                              className="text-amber-400/80 hover:text-amber-300 disabled:opacity-40"
                              onClick={() => setConfirm({ kind: 'suspend', row })}
                            >
                              Suspendre
                            </button>
                            <button
                              type="button"
                              disabled={!!busy}
                              className="text-danger/80 hover:text-danger disabled:opacity-40"
                              onClick={() => setConfirm({ kind: 'remove', row })}
                            >
                              Retirer
                            </button>
                          </div>
                        )}
                        {!selfBlock && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <select
                              className="input-royal text-[10px] py-1 max-w-[10rem]"
                              value={transferDraft[row.id] || ''}
                              disabled={!!busy || transferTargets.length === 0}
                              onChange={(e) =>
                                setTransferDraft((d) => ({ ...d, [row.id]: e.target.value }))
                              }
                            >
                              <option value="">Transférer vers…</option>
                              {transferTargets.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!!busy || !transferDraft[row.id]}
                              className="btn-gold-cinematic px-2 py-1 text-[10px] disabled:opacity-40"
                              onClick={() => {
                                const to = transferDraft[row.id]
                                if (!to) {
                                  setError('Sélectionnez une unité de destination.')
                                  return
                                }
                                const toUnit = units.find((u) => u.id === to)
                                setConfirm({
                                  kind: 'transfer',
                                  row,
                                  toUnitId: to,
                                  toUnitName: toUnit?.name,
                                })
                              }}
                            >
                              Transférer
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {row.status === 'suspended' && act && !selfBlock && (
                      <button
                        type="button"
                        disabled={!!busy}
                        className="text-green-400/80 disabled:opacity-40"
                        onClick={() => void patch(row.id, { status: 'active' }, 'Membre réactivé.')}
                      >
                        Réactiver
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-pearl/30">
                  Aucune affectation active.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmAction
        open={!!confirm}
        title={
          confirm?.kind === 'suspend'
            ? 'Confirmer la suspension'
            : confirm?.kind === 'remove'
              ? 'Confirmer le retrait'
              : 'Confirmer le transfert'
        }
        description={confirmDescription}
        danger={confirm?.kind === 'remove' || confirm?.kind === 'suspend'}
        busy={!!busy}
        confirmLabel={
          confirm?.kind === 'suspend'
            ? 'Suspendre'
            : confirm?.kind === 'remove'
              ? 'Retirer'
              : 'Transférer'
        }
        onCancel={() => {
          if (!busy) setConfirm(null)
        }}
        onConfirm={() => {
          if (!confirm || busy) return
          if (confirm.kind === 'suspend') {
            void patch(confirm.row.id, { status: 'suspended' }, 'Membre suspendu.')
          } else if (confirm.kind === 'remove') {
            void patch(confirm.row.id, { status: 'removed' }, 'Membre retiré.')
          } else if (confirm.toUnitId) {
            void doTransfer(confirm.row.id, confirm.toUnitId)
          }
        }}
      />
    </div>
  )
}
