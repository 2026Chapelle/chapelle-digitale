'use client'

import { useState } from 'react'
import { Loader2, Mail } from 'lucide-react'

const ROLES = [
  'world_admin',
  'zone_admin',
  'national_admin',
  'local_admin',
  'staff',
  'member',
  'viewer',
] as const

export function UnitInviteForm({
  unitId,
  assignableRoles,
}: {
  unitId: string | null
  assignableRoles?: string[]
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('member')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const roles = (assignableRoles || ROLES).filter((r) => r !== 'world_super_admin')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!unitId) return
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
        setErr(j?.message || 'Invitation refusée.')
      } else {
        setMsg(
          j.data?.email_sent
            ? 'Invitation créée et email envoyé.'
            : 'Invitation créée (email non envoyé — fournisseur absent).',
        )
        setEmail('')
      }
    } catch {
      setErr('Erreur réseau')
    } finally {
      setBusy(false)
    }
  }

  if (!unitId) return null

  return (
    <form onSubmit={submit} className="card-royal space-y-3">
      <h3 className="font-cinzel text-sm text-pearl flex items-center gap-2">
        <Mail className="w-4 h-4 text-gold" /> Invitation
      </h3>
      <input
        className="input-royal w-full"
        type="email"
        required
        placeholder="email@domaine.org"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <select
        className="input-royal w-full"
        value={role}
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
      <button type="submit" disabled={busy} className="btn-gold-cinematic px-4 py-2 text-sm disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer l’invitation'}
      </button>
    </form>
  )
}
