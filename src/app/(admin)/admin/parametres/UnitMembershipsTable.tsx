'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

type Row = {
  id: string
  user_id: string
  unit_role: string
  status: string
  is_primary: boolean
}

export function UnitMembershipsTable({
  unitId,
  onChanged,
}: {
  unitId: string | null
  onChanged?: () => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

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
        setRows(j.data?.memberships || [])
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

  async function patch(id: string, body: Record<string, unknown>) {
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
      if (!r.ok || !j?.ok) setError(j?.message || 'Action refusée.')
      else {
        await load()
        onChanged?.()
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setBusy(null)
    }
  }

  if (!unitId) {
    return <p className="text-xs text-pearl/40 font-inter">Sélectionnez une unité.</p>
  }

  return (
    <div className="card-royal space-y-3">
      <h3 className="font-cinzel text-sm text-pearl">Affectations</h3>
      {loading && <Loader2 className="w-4 h-4 animate-spin text-gold" />}
      {error && <p className="text-xs text-danger font-inter">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-inter text-pearl/70">
          <thead>
            <tr className="text-left text-pearl/40 border-b border-white/5">
              <th className="py-2 pr-2">User</th>
              <th className="py-2 pr-2">Rôle</th>
              <th className="py-2 pr-2">Statut</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/[0.03]">
                <td className="py-2 pr-2 font-mono text-[10px]">{row.user_id.slice(0, 8)}…</td>
                <td className="py-2 pr-2">{row.unit_role}</td>
                <td className="py-2 pr-2">{row.status}{row.is_primary ? ' · primary' : ''}</td>
                <td className="py-2 space-x-1">
                  {row.status === 'active' && (
                    <>
                      <button
                        type="button"
                        disabled={!!busy}
                        className="text-amber-400/80 hover:text-amber-300"
                        onClick={() => void patch(row.id, { status: 'suspended' })}
                      >
                        Suspendre
                      </button>
                      <button
                        type="button"
                        disabled={!!busy}
                        className="text-danger/80 hover:text-danger"
                        onClick={() => void patch(row.id, { status: 'removed' })}
                      >
                        Retirer
                      </button>
                    </>
                  )}
                  {row.status === 'suspended' && (
                    <button
                      type="button"
                      disabled={!!busy}
                      className="text-green-400/80"
                      onClick={() => void patch(row.id, { status: 'active' })}
                    >
                      Réactiver
                    </button>
                  )}
                </td>
              </tr>
            ))}
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
    </div>
  )
}
