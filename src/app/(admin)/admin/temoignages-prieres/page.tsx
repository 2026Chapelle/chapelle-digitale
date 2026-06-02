'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles, Trash2, Check, X, Globe } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

type Temoignage = { id: string; titre?: string; corps: string; auteur?: string; categorie?: string; pays?: string; ville?: string; statut: string; is_public?: boolean; created_at: string }
const fmt = (s: string) => { try { return new Date(s).toLocaleString('fr-FR') } catch { return s } }
const badge = (s: string) => s === 'valide' ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' } : s === 'rejete' ? { background: 'rgba(239,68,68,0.12)', color: '#EF4444' } : { background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }

export default function AdminTemoignagesPrieresPage() {
  const [rows, setRows] = useState<Temoignage[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const base = '/api/admin/submissions/temoignages'

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

  async function patch(id: string, changes: Record<string, unknown>) {
    await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id, ...changes }) })
    load()
  }
  async function remove(id: string) {
    if (!confirm('Supprimer ce témoignage ?')) return
    await fetch(base, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id }) })
    load()
  }

  const aValider = rows.filter((r) => r.statut === 'soumis').length

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Centre de prière" title={<>Témoignages <span className="text-cinematic-gold">exaucés</span></>} description={`${aValider} témoignage(s) à valider. Les témoignages validés et publics alimentent le mur de prière.`} />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase.</div>}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}
        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter"><Sparkles className="w-7 h-7 mx-auto mb-3 text-gold/50" />Aucun témoignage pour le moment.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((t) => (
              <div key={t.id} className="card-cinematic p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-pearl">{t.auteur || 'Anonyme'}</span>
                      {t.categorie && <span className="text-pearl/30 text-[11px]">· {t.categorie}</span>}
                      {(t.pays || t.ville) && <span className="text-pearl/30 text-[11px]">· {[t.ville, t.pays].filter(Boolean).join(', ')}</span>}
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={badge(t.statut)}>{t.statut}</span>
                      {t.is_public && <span className="inline-flex items-center gap-1 text-[11px] text-gold"><Globe className="w-3 h-3" /> public</span>}
                    </div>
                    {t.titre && <p className="text-pearl/70 text-sm mt-1 font-medium">{t.titre}</p>}
                    <p className="text-pearl/55 text-sm mt-1 whitespace-pre-wrap">{t.corps}</p>
                    <p className="text-pearl/25 text-[11px] mt-2">{fmt(t.created_at)}</p>
                  </div>
                  <button onClick={() => remove(t.id)} className="text-pearl/40 hover:text-danger p-1.5 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button onClick={() => patch(t.id, { statut: 'valide', is_public: true, valide_le: new Date().toISOString() })} className="px-2.5 py-1 rounded-lg text-[11px] font-inter font-semibold inline-flex items-center gap-1" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}><Check className="w-3 h-3" /> Valider & publier</button>
                  <button onClick={() => patch(t.id, { statut: 'valide', is_public: false })} className="px-2.5 py-1 rounded-lg text-[11px] font-inter font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>Valider (privé)</button>
                  <button onClick={() => patch(t.id, { statut: 'rejete', is_public: false })} className="px-2.5 py-1 rounded-lg text-[11px] font-inter font-semibold inline-flex items-center gap-1" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}><X className="w-3 h-3" /> Rejeter</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
