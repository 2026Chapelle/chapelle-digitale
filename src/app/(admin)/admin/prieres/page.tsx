'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Heart, Trash2, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

type Priere = { id: string; nom?: string; email?: string; sujet: string; description?: string; categorie?: string; urgence?: string; anonyme?: boolean; statut: string; priorite?: string; pays?: string; ville?: string; assigned_to?: string; created_at: string }
const PRIORITES = [
  { value: 'normale', label: 'Normale', color: '#9CA3AF' },
  { value: 'important', label: 'Important', color: '#0EA5E9' },
  { value: 'urgent', label: 'Urgent', color: '#F59E0B' },
  { value: 'tres_urgent', label: 'Très urgent', color: '#EF4444' },
]
const prioColor = (p?: string) => PRIORITES.find((x) => x.value === p)?.color || '#9CA3AF'
const prioLabel = (p?: string) => PRIORITES.find((x) => x.value === p)?.label || 'Normale'
const STATUTS = [
  { value: 'nouvelle', label: 'Nouvelle', color: '#60A5FA' },
  { value: 'en_priere', label: 'En prière', color: '#F59E0B' },
  { value: 'traitee', label: 'Traitée', color: '#22C55E' },
  { value: 'temoignage', label: 'Témoignage reçu', color: '#D4AF37' },
]
const colorOf = (s: string) => STATUTS.find((x) => x.value === s)?.color || '#9CA3AF'
const labelOf = (s: string) => STATUTS.find((x) => x.value === s)?.label || s
const fmt = (s: string) => { try { return new Date(s).toLocaleString('fr-FR') } catch { return s } }

export default function AdminPrieresPage() {
  const [rows, setRows] = useState<Priere[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('toutes')
  const [intercesseurs, setIntercesseurs] = useState<{ id: string; nom: string }[]>([])
  const base = '/api/admin/submissions/priere_demandes'

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
  useEffect(() => {
    fetch('/api/admin/intercesseurs', { credentials: 'same-origin' })
      .then((r) => r.json()).then((j) => { if (j.ok) setIntercesseurs(j.data || []) }).catch(() => {})
  }, [])

  async function assigner(id: string, assigned_to: string) {
    await fetch(base, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: JSON.stringify({ id, assigned_to: assigned_to || null, assigned_at: assigned_to ? new Date().toISOString() : null, statut: assigned_to ? 'assignee' : 'nouvelle' }),
    })
    load()
  }
  const nomInter = (uid?: string) => intercesseurs.find((i) => i.id === uid)?.nom

  async function setStatut(id: string, statut: string) {
    await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id, statut }) })
    load()
  }
  async function setPriorite(id: string, priorite: string) {
    await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id, priorite }) })
    load()
  }
  async function remove(id: string) {
    if (!confirm('Supprimer cette demande ?')) return
    await fetch(base, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id }) })
    load()
  }

  const counts = STATUTS.map((s) => ({ ...s, n: rows.filter((r) => r.statut === s.value).length }))
  const filtered = filter === 'toutes' ? rows : rows.filter((r) => r.statut === filter)

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Administration" title={<>Demandes de <span className="text-cinematic-gold">prière</span></>} description="Demandes reçues depuis le site et l'espace membre." />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase pour voir les demandes.</div>}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <button onClick={() => setFilter('toutes')} className="card-cinematic p-4 text-left">
            <div className="font-cinzel font-black text-2xl text-pearl">{rows.length}</div>
            <div className="text-pearl/40 text-xs font-inter">Total</div>
          </button>
          {counts.map((c) => (
            <button key={c.value} onClick={() => setFilter(c.value)} className="card-cinematic p-4 text-left">
              <div className="font-cinzel font-black text-2xl" style={{ color: c.color }}>{c.n}</div>
              <div className="text-pearl/40 text-xs font-inter">{c.label}</div>
            </button>
          ))}
        </div>

        {/* Tableau de bord pastoral (mesures réelles) */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card-cinematic p-4">
            <div className="font-cinzel font-black text-2xl text-pearl">{rows.filter((r) => !['traitee', 'temoignage', 'temoignage_valide', 'archivee'].includes(r.statut)).length}</div>
            <div className="text-pearl/40 text-xs font-inter">Demandes ouvertes</div>
          </div>
          <div className="card-cinematic p-4">
            <div className="font-cinzel font-black text-2xl" style={{ color: '#EF4444' }}>{rows.filter((r) => r.priorite === 'urgent' || r.priorite === 'tres_urgent').length}</div>
            <div className="text-pearl/40 text-xs font-inter">Urgentes</div>
          </div>
          <div className="card-cinematic p-4">
            <div className="font-cinzel font-black text-2xl" style={{ color: '#F59E0B' }}>{rows.filter((r) => !r.assigned_to).length}</div>
            <div className="text-pearl/40 text-xs font-inter">Sans assignation</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter"><Heart className="w-7 h-7 mx-auto mb-3 text-gold/50" />Aucune donnée disponible pour le moment.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div key={p.id} className="card-cinematic p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-pearl">{p.anonyme ? 'Anonyme' : (p.nom || 'Membre')}</span>
                      {p.urgence && p.urgence !== 'normale' && <span className="inline-flex items-center gap-1 text-[11px] text-red-400"><AlertCircle className="w-3 h-3" />{p.urgence}</span>}
                      {p.categorie && <span className="text-pearl/30 text-[11px]">· {p.categorie}</span>}
                      {(p.pays || p.ville) && <span className="text-pearl/30 text-[11px]">· {[p.ville, p.pays].filter(Boolean).join(', ')}</span>}
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: `${prioColor(p.priorite)}22`, color: prioColor(p.priorite) }}>{prioLabel(p.priorite)}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: `${colorOf(p.statut)}20`, color: colorOf(p.statut) }}>{labelOf(p.statut)}</span>
                    </div>
                    <p className="text-pearl/70 text-sm mt-1 font-medium">{p.sujet}</p>
                    {p.description && <p className="text-pearl/50 text-sm mt-1 whitespace-pre-wrap">{p.description}</p>}
                    <p className="text-pearl/25 text-[11px] mt-2">{fmt(p.created_at)}{!p.anonyme && p.email ? ` · ${p.email}` : ''}</p>
                  </div>
                  <button onClick={() => remove(p.id)} className="text-pearl/40 hover:text-danger p-1.5 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {STATUTS.map((s) => (
                    <button key={s.value} onClick={() => setStatut(p.id, s.value)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-inter font-semibold transition-all"
                      style={p.statut === s.value ? { background: s.color, color: '#0a0010' } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] uppercase tracking-wider text-pearl/30 font-inter mr-1">Priorité</span>
                  {PRIORITES.map((pr) => (
                    <button key={pr.value} onClick={() => setPriorite(p.id, pr.value)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-inter font-semibold transition-all"
                      style={(p.priorite || 'normale') === pr.value ? { background: pr.color, color: '#0a0010' } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)' }}>
                      {pr.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] uppercase tracking-wider text-pearl/30 font-inter">Intercesseur</span>
                  <select value={p.assigned_to || ''} onChange={(e) => assigner(p.id, e.target.value)}
                    className="input-royal text-xs py-1 px-2 w-56">
                    <option value="">— Non assignée —</option>
                    {intercesseurs.map((it) => <option key={it.id} value={it.id}>{it.nom}</option>)}
                  </select>
                  {p.assigned_to && <span className="text-[11px] text-green-400 font-inter">Assignée à {nomInter(p.assigned_to) || '…'}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
