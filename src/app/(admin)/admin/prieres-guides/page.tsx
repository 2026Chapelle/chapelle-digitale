'use client'
/**
 * Admin — CMS « Prières & Guides » (V2.3-C). Liste + recherche + filtres + actions.
 * Distinct de /admin/prieres (demandes du mur de prière, non touché).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Loader2, Plus, RefreshCw, BarChart3, Pencil, Archive, CheckCircle2, Library } from 'lucide-react'

interface Guide {
  id: string; slug: string; title: string; category: string; status: string
  access_level: string; duration_minutes: number | null; image_url: string | null
  overlay_tone: string | null; display_order: number; updated_at: string
}
const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: '#EAB308' },
  published: { label: 'Publié', color: '#22C55E' },
  archived: { label: 'Archivé', color: '#6B7280' },
}
const fmt = (iso: string) => { try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return iso } }
const norm = (s: unknown) => typeof s === 'string' ? s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : ''

export default function AdminPrieresGuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([])
  const [sqlReady, setSqlReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/admin/prayer-guides', { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) { setError('Chargement impossible.'); setGuides([]) }
      else { setGuides(j.data?.guides || []); setSqlReady(j.data?.sqlReady !== false) }
    } catch { setError('Chargement impossible.') }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function setStatus(g: Guide, status: string) {
    if (busyId) return
    setBusyId(g.id)
    try {
      const r = await fetch(`/api/admin/prayer-guides/${g.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ status }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) setError(j?.message || 'Action impossible.')
      else await load()
    } catch { setError('Action impossible.') }
    setBusyId(null)
  }

  const filtered = useMemo(() => {
    const n = norm(q)
    return guides.filter((g) => {
      if (statusFilter && g.status !== statusFilter) return false
      if (!n) return true
      return norm(`${g.title} ${g.category}`).includes(n)
    })
  }, [guides, q, statusFilter])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <PageHeader eyebrow="Contenu spirituel" title={<>Prières &amp; <span className="text-cinematic-gold">Guides</span></>}
            description="Bibliothèque éditoriale publiée sur /priere et l'espace membre. Distinct des demandes du mur de prière." />
          <div className="flex gap-2 mt-2 flex-wrap">
            <Link href="/admin/prieres-guides/stats" className="btn-glass text-sm px-4 py-2.5 inline-flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Stats</Link>
            <Link href="/admin/prieres-guides/new" className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter une prière</Link>
          </div>
        </div>

        {!sqlReady && (
          <div className="card-royal p-4 mb-6 text-sm font-inter" style={{ borderColor: 'rgba(245,158,11,0.3)', color: '#F59E0B' }}>
            Table Supabase non détectée : le site fonctionne en <strong>repli statique</strong> (6 prières). Appliquez
            <code className="mx-1">docs/sql/citadelle-v23c-prayer-guides-admin-stats.sql</code> dans le Dashboard pour activer le CMS.
          </div>
        )}

        <div className="flex gap-2 flex-wrap items-center mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher titre / catégorie…" className="input-royal text-sm max-w-xs" />
          {[{ v: '', l: 'Tous' }, { v: 'published', l: 'Publiés' }, { v: 'draft', l: 'Brouillons' }, { v: 'archived', l: 'Archivés' }].map((s) => (
            <button key={s.v || 'all'} onClick={() => setStatusFilter(s.v)}
              className={`px-3 py-1.5 rounded-full text-xs font-inter font-semibold transition-all ${statusFilter === s.v ? 'bg-gold text-black' : 'bg-pearl/5 text-pearl/50 hover:bg-pearl/10'}`}>{s.l}</button>
          ))}
          <button onClick={load} disabled={loading} className="text-pearl/40 hover:text-gold ml-auto"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>

        {error && <div className="card-royal p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-12"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="card-royal text-center py-16">
            <Library className="w-8 h-8 mx-auto mb-3 text-pearl/30" />
            <p className="font-cinzel text-lg text-pearl/60">{guides.length === 0 ? (sqlReady ? 'Aucune prière. Ajoutez-en une.' : 'CMS inactif (repli statique).') : 'Aucun résultat.'}</p>
          </div>
        ) : (
          <div className="card-royal overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                    <th className="px-4 py-3">Prière</th><th className="px-4 py-3">Catégorie</th><th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Durée</th><th className="px-4 py-3">Accès</th><th className="px-4 py-3">MàJ</th><th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((g) => {
                    const st = STATUS_META[g.status] || { label: g.status, color: '#6B7280' }
                    return (
                      <tr key={g.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {g.image_url && <span className="w-6 h-6 rounded-md bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${g.image_url})`, border: '1px solid rgba(255,255,255,0.1)' }} />}
                            <span className="text-pearl/85 font-inter">{g.title}</span>
                          </div>
                          <div className="text-[11px] text-pearl/35 font-inter">{g.slug}</div>
                        </td>
                        <td className="px-4 py-3 text-pearl/60 font-inter">{g.category}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold font-inter" style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span></td>
                        <td className="px-4 py-3 text-pearl/50 font-inter">{g.duration_minutes ?? '—'} min</td>
                        <td className="px-4 py-3 text-pearl/50 font-inter">{g.access_level}</td>
                        <td className="px-4 py-3 text-pearl/40 font-inter whitespace-nowrap">{fmt(g.updated_at)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link href={`/admin/prieres-guides/${g.id}/edit`} className="inline-flex items-center gap-1 text-[11px] text-pearl/50 hover:text-gold px-1.5 py-1"><Pencil className="w-3.5 h-3.5" /> Modifier</Link>
                          {g.status !== 'published'
                            ? <button onClick={() => setStatus(g, 'published')} disabled={busyId === g.id} className="inline-flex items-center gap-1 text-[11px] text-pearl/50 hover:text-[#22C55E] px-1.5 py-1 disabled:opacity-40"><CheckCircle2 className="w-3.5 h-3.5" /> Publier</button>
                            : <button onClick={() => setStatus(g, 'archived')} disabled={busyId === g.id} className="inline-flex items-center gap-1 text-[11px] text-pearl/50 hover:text-gold px-1.5 py-1 disabled:opacity-40"><Archive className="w-3.5 h-3.5" /> Archiver</button>}
                          {busyId === g.id && <Loader2 className="w-3.5 h-3.5 animate-spin inline text-pearl/40 ml-1" />}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
