'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmAction } from './ConfirmAction'

const ROLES = [
  'world_admin',
  'zone_admin',
  'national_admin',
  'local_admin',
  'staff',
  'member',
  'viewer',
] as const

type InvRow = {
  id: string
  email: string
  proposed_unit_role: string
  status: string
  expires_at: string
  created_at: string
}

function roleFitsUnitType(role: string, unitType: string | undefined): boolean {
  if (!unitType) return true
  if (role === 'world_super_admin' || role === 'world_admin') return unitType === 'world_headquarters'
  if (role === 'zone_admin') return unitType === 'continental_zone'
  if (role === 'national_admin') return unitType === 'national_central_church'
  if (role === 'local_admin') return unitType === 'local_church'
  return role === 'staff' || role === 'member' || role === 'viewer'
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'pending',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  expired: {
    label: 'expired',
    className: 'bg-pearl/10 text-pearl/50 border-white/10',
  },
  revoked: {
    label: 'revoked',
    className: 'bg-danger/10 text-danger/80 border-danger/25',
  },
  consumed: {
    label: 'consumed',
    className: 'bg-green-500/10 text-green-400/80 border-green-500/25',
  },
}

export function UnitInviteForm({
  unitId,
  unitType,
  assignableRoles,
  canWrite = false,
  onChanged,
}: {
  unitId: string | null
  unitType?: string
  assignableRoles?: string[]
  canWrite?: boolean
  onChanged?: () => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('member')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<InvRow[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [revokeBusy, setRevokeBusy] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<InvRow | null>(null)

  const roles = useMemo(() => {
    const base = (assignableRoles && assignableRoles.length > 0 ? assignableRoles : [...ROLES]).filter(
      (r) => r !== 'world_super_admin',
    )
    return base.filter((r) => roleFitsUnitType(r, unitType))
  }, [assignableRoles, unitType])

  const showForm = canWrite && roles.length > 0

  const loadList = useCallback(async () => {
    if (!unitId) {
      setInvitations([])
      return
    }
    setListLoading(true)
    try {
      const r = await fetch(
        `/api/admin/organization-unit-invitations?unitId=${encodeURIComponent(unitId)}`,
        { credentials: 'same-origin' },
      )
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.ok) setInvitations(j.data?.invitations || [])
      else setInvitations([])
    } catch {
      setInvitations([])
    } finally {
      setListLoading(false)
    }
  }, [unitId])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (roles.length && !roles.includes(role)) {
      setRole(roles[0])
    }
  }, [roles, role])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!unitId || busy || !showForm) return
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      const r = await fetch('/api/admin/organization-unit-invitations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_unit_id: unitId,
          email,
          unit_role: role,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        const code = j?.code as string | undefined
        const message =
          code === 'INVITATION_CREATE_FAILED'
            ? j?.message || 'Échec de création de l’invitation.'
            : j?.message || 'Invitation refusée.'
        setErr(message)
        toast.error(message)
      } else {
        const outcome = j.data?.email_outcome as string | undefined
        const messageFr =
          (j.data?.message_fr as string | undefined) ||
          (outcome === 'INVITATION_CREATED_EMAIL_SENT'
            ? 'Invitation créée et email envoyé avec succès.'
            : outcome === 'INVITATION_CREATED_EMAIL_PROVIDER_UNAVAILABLE'
              ? 'Invitation créée, mais le fournisseur d’email n’est pas configuré (envoi non effectué).'
              : outcome === 'INVITATION_CREATED_EMAIL_DELIVERY_FAILED'
                ? 'Invitation créée, mais l’envoi de l’email a échoué.'
                : 'Invitation créée.')
        setMsg(messageFr)
        if (outcome === 'INVITATION_CREATED_EMAIL_SENT') {
          toast.success(messageFr)
        } else if (
          outcome === 'INVITATION_CREATED_EMAIL_PROVIDER_UNAVAILABLE' ||
          outcome === 'INVITATION_CREATED_EMAIL_DELIVERY_FAILED'
        ) {
          toast(messageFr, { icon: '⚠️' })
        } else {
          toast.success(messageFr)
        }
        setEmail('')
        await loadList()
        onChanged?.()
      }
    } catch {
      setErr('Erreur réseau')
      toast.error('Erreur réseau')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    if (revokeBusy) return
    setRevokeBusy(id)
    setErr(null)
    setMsg(null)
    try {
      const r = await fetch(`/api/admin/organization-unit-invitations/${id}/revoke`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        const message = j?.message || 'Révocation refusée.'
        setErr(message)
        toast.error(message)
      } else {
        setMsg('Invitation révoquée.')
        toast.success('Invitation révoquée.')
        await loadList()
        onChanged?.()
      }
    } catch {
      setErr('Erreur réseau')
      toast.error('Erreur réseau')
    } finally {
      setRevokeBusy(null)
      setRevokeTarget(null)
    }
  }

  if (!unitId) return null

  return (
    <div className="card-royal space-y-3">
      {showForm && (
        <form onSubmit={submit} className="space-y-3">
          <h3 className="font-cinzel text-sm text-pearl flex items-center gap-2">
            <Mail className="w-4 h-4 text-gold" /> Invitation
          </h3>
          <input
            className="input-royal w-full text-xs font-inter"
            type="email"
            required
            placeholder="email@domaine.org"
            value={email}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            className="input-royal w-full text-xs font-inter"
            value={role}
            disabled={busy}
            onChange={(e) => setRole(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {err && <p className="text-xs text-danger font-inter">{err}</p>}
          {msg && <p className="text-xs text-green-400/80 font-inter">{msg}</p>}
          <button
            type="submit"
            disabled={busy}
            className="btn-gold-cinematic px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer l’invitation'}
          </button>
        </form>
      )}

      <div className={`${showForm ? 'border-t border-white/5 pt-3 ' : ''}space-y-2`}>
        <h4 className="text-xs font-inter text-pearl/50">Invitations (tous statuts)</h4>
        {listLoading && <Loader2 className="w-3 h-3 animate-spin text-gold" />}
        <ul className="space-y-2 text-xs font-inter text-pearl/70">
          {invitations.map((inv) => {
            const badge = STATUS_BADGE[inv.status] || {
              label: inv.status,
              className: 'bg-pearl/10 text-pearl/50 border-white/10',
            }
            return (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.03] pb-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-pearl/80">{inv.email}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-pearl/40">
                    {inv.proposed_unit_role} · expire{' '}
                    {new Date(inv.expires_at).toLocaleString('fr-FR')}
                  </div>
                </div>
                {canWrite && inv.status === 'pending' && (
                  <button
                    type="button"
                    disabled={!!revokeBusy}
                    className="text-danger/80 hover:text-danger text-[11px] disabled:opacity-40"
                    onClick={() => setRevokeTarget(inv)}
                  >
                    {revokeBusy === inv.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Révoquer'
                    )}
                  </button>
                )}
              </li>
            )
          })}
          {!listLoading && invitations.length === 0 && (
            <li className="text-pearl/30">Aucune invitation pour cette unité.</li>
          )}
        </ul>
      </div>

      <ConfirmAction
        open={!!revokeTarget}
        title="Révoquer l’invitation"
        description={
          revokeTarget
            ? `Révoquer l’invitation pending pour ${revokeTarget.email} ?\nLe lien d’acceptation ne fonctionnera plus.`
            : ''
        }
        danger
        busy={!!revokeBusy}
        confirmLabel="Révoquer"
        onCancel={() => {
          if (!revokeBusy) setRevokeTarget(null)
        }}
        onConfirm={() => {
          if (revokeTarget) void revoke(revokeTarget.id)
        }}
      />
    </div>
  )
}
