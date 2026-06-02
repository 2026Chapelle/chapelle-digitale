'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2, Mail, CheckCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

type Msg = { id: string; nom: string; email: string; sujet?: string; message: string; statut: string; created_at: string }
const fmt = (s: string) => { try { return new Date(s).toLocaleString('fr-FR') } catch { return s } }

export default function AdminMessagesPage() {
  const [rows, setRows] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/admin/contact', { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      if (j.ok) setRows(j.data || []); else setError(j.message || 'Erreur')
    } catch { setError('Erreur réseau') }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function setStatut(id: string, statut: string) {
    await fetch('/api/admin/contact', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id, statut }) })
    load()
  }
  async function remove(id: string) {
    if (!confirm('Supprimer ce message ?')) return
    await fetch('/api/admin/contact', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Administration" title={<>Messages <span className="text-cinematic-gold">contact</span></>} description="Messages reçus via le formulaire de contact." />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase pour voir les messages.</div>}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}
        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter"><Mail className="w-7 h-7 mx-auto mb-3 text-gold/50" />Aucun message pour le moment.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((m) => (
              <div key={m.id} className="card-cinematic p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-pearl">{m.nom}</span>
                      <a href={`mailto:${m.email}`} className="text-gold/80 text-xs hover:text-gold">{m.email}</a>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={m.statut === 'traite' ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' } : m.statut === 'lu' ? { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' } : { background: 'rgba(96,165,250,0.12)', color: '#60A5FA' }}>{m.statut}</span>
                    </div>
                    {m.sujet && <p className="text-pearl/60 text-sm mt-1 font-medium">{m.sujet}</p>}
                    <p className="text-pearl/50 text-sm mt-1 whitespace-pre-wrap">{m.message}</p>
                    <p className="text-pearl/25 text-[11px] mt-2">{fmt(m.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => setStatut(m.id, m.statut === 'traite' ? 'lu' : 'traite')} className="text-pearl/40 hover:text-green-400 p-1.5" title="Marquer traité"><CheckCheck className="w-4 h-4" /></button>
                    <button onClick={() => remove(m.id)} className="text-pearl/40 hover:text-danger p-1.5" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
