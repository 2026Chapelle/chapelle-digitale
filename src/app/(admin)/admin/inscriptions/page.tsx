'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, CalendarCheck, Trash2, Bell, Video } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

type Reg = { id: string; event_titre: string; user_nom?: string; user_email?: string; type: string; statut: string; created_at: string }
const fmt = (s: string) => { try { return new Date(s).toLocaleString('fr-FR') } catch { return s } }
const typeBadge = (t: string) => t === 'rappel' ? { icon: Bell, color: '#F59E0B' } : t === 'participation' ? { icon: Video, color: '#0EA5E9' } : { icon: CalendarCheck, color: '#22C55E' }

export default function AdminInscriptionsPage() {
  const [rows, setRows] = useState<Reg[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const base = '/api/admin/submissions/event_registrations'

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(base, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      if (j.ok) setRows(j.data || []); else setError(j.message || 'Erreur')
    } catch { setError('Erreur réseau') }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function remove(id: string) {
    if (!confirm('Supprimer cette inscription ?')) return
    await fetch(base, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Administration" title={<>Inscriptions <span className="text-cinematic-gold">événements</span></>} description={`${rows.length} inscription(s) / rappel(s) enregistré(s).`} />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase pour voir les inscriptions.</div>}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}
        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter"><CalendarCheck className="w-7 h-7 mx-auto mb-3 text-gold/50" />Aucune donnée disponible pour le moment.</div>
        ) : (
          <div className="card-cinematic overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                  <th className="px-4 py-3">Événement</th><th className="px-4 py-3">Membre</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const b = typeBadge(r.type)
                  return (
                    <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-pearl/80">{r.event_titre}</td>
                      <td className="px-4 py-3"><div className="text-pearl/70">{r.user_nom || 'Membre'}</div><div className="text-pearl/30 text-xs">{r.user_email}</div></td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: `${b.color}20`, color: b.color }}><b.icon className="w-3 h-3" />{r.type}</span></td>
                      <td className="px-4 py-3 text-pearl/40 text-xs">{fmt(r.created_at)}</td>
                      <td className="px-4 py-3 text-right"><button onClick={() => remove(r.id)} className="text-pearl/40 hover:text-danger p-1.5"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
