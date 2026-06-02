'use client'
import { useEffect, useState, useCallback } from 'react'
import { Loader2, Activity, HandCoins, Radio, Play, FileText, Search, Filter } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { flagOf } from '@/lib/flags'

interface Row {
  id: string; nom: string | null; email: string | null; action_type: string
  resource_type: string | null; resource_title: string | null; amount: number | null
  currency: string | null; source: string | null; pays: string | null; created_at: string
}
interface Totaux { total: number; dons: number; montant_dons: number; live_views: number; video_views: number; pdf_downloads: number }

const ACTION_META: Record<string, { label: string; icon: any; color: string }> = {
  don:          { label: 'Offrande', icon: HandCoins, color: '#EAB308' },
  live_view:    { label: 'Live',     icon: Radio,     color: '#EF4444' },
  video_view:   { label: 'Vidéo',    icon: Play,      color: '#0EA5E9' },
  pdf_download: { label: 'PDF',      icon: FileText,  color: '#A855F7' },
}

export default function AdminActivitesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [totaux, setTotaux] = useState<Totaux | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [f, setF] = useState({ q: '', action: '', source: '', type: '', pays: '', from: '', to: '', montant: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v) })
      const r = await fetch(`/api/admin/activites?${params.toString()}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      else if (j.ok) { setRows(j.data || []); setTotaux(j.totaux) }
    } catch { /* */ }
    setLoading(false)
  }, [f])

  useEffect(() => { load() }, []) // chargement initial
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Traçabilité"
          title={<>Journal d&apos;<span className="text-cinematic-gold">activité</span></>}
          description="Qui a donné, regardé un live/une vidéo, téléchargé un PDF — actions réelles. (Prière & cure d'âme exclues par confidentialité.)"
        />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase.</div>}

        {/* Totaux */}
        {totaux && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <Kpi label="Actions" value={totaux.total} color="#D4AF37" icon={Activity} />
            <Kpi label="Offrandes" value={totaux.dons} color="#EAB308" icon={HandCoins} sub={`${totaux.montant_dons.toLocaleString('fr-FR')}`} />
            <Kpi label="Vues live" value={totaux.live_views} color="#EF4444" icon={Radio} />
            <Kpi label="Vues vidéo" value={totaux.video_views} color="#0EA5E9" icon={Play} />
            <Kpi label="PDF" value={totaux.pdf_downloads} color="#A855F7" icon={FileText} />
          </div>
        )}

        {/* Filtres */}
        <div className="card-cinematic p-4 mb-5">
          <div className="flex items-center gap-2 mb-3 text-pearl/60 font-inter text-xs"><Filter className="w-3.5 h-3.5 text-gold" /> Filtres</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pearl/30" />
              <input value={f.q} onChange={(e) => set('q', e.target.value)} placeholder="Nom ou email" className="input-royal w-full text-sm pl-9" />
            </div>
            <select value={f.action} onChange={(e) => set('action', e.target.value)} className="input-royal text-sm">
              <option value="">Toutes les actions</option>
              <option value="don">Offrandes</option>
              <option value="live_view">Vues live</option>
              <option value="video_view">Vues vidéo</option>
              <option value="pdf_download">Téléchargements PDF</option>
            </select>
            <select value={f.source} onChange={(e) => set('source', e.target.value)} className="input-royal text-sm">
              <option value="">Toutes les sources</option>
              <option value="live">Live</option>
              <option value="dons">Page dons</option>
              <option value="evenement">Événement</option>
              <option value="formation">Formation</option>
              <option value="chariow">Chariow</option>
            </select>
            <input value={f.pays} onChange={(e) => set('pays', e.target.value)} placeholder="Pays" className="input-royal text-sm" />
            <input type="date" value={f.from} onChange={(e) => set('from', e.target.value)} className="input-royal text-sm" />
            <input type="date" value={f.to} onChange={(e) => set('to', e.target.value)} className="input-royal text-sm" />
            <input type="number" value={f.montant} onChange={(e) => set('montant', e.target.value)} placeholder="Montant min" className="input-royal text-sm" />
            <button onClick={load} className="btn-gold text-sm px-4 py-2 inline-flex items-center justify-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Filtrer
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune activité enregistrée pour ces critères.</div>
        ) : (
          <div className="card-cinematic p-5 overflow-x-auto">
            <table className="w-full text-sm font-inter">
              <thead>
                <tr className="text-pearl/40 text-[11px] uppercase tracking-wider text-left border-b border-white/5">
                  <th className="py-2 pr-3">Date</th><th className="py-2 px-2">Membre</th><th className="py-2 px-2">Action</th>
                  <th className="py-2 px-2">Ressource</th><th className="py-2 px-2 text-right">Montant</th>
                  <th className="py-2 px-2">Source</th><th className="py-2 px-2">Pays</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta = ACTION_META[r.action_type] || { label: r.action_type, icon: Activity, color: '#9CA3AF' }
                  const d = new Date(r.created_at)
                  return (
                    <tr key={r.id} className="border-b border-white/[0.03]">
                      <td className="py-2 pr-3 text-pearl/50 whitespace-nowrap">{d.toLocaleDateString('fr-FR')} · {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 px-2 text-pearl/75">{r.nom || '—'}<span className="block text-[11px] text-pearl/35">{r.email || ''}</span></td>
                      <td className="py-2 px-2"><span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${meta.color}18`, color: meta.color }}><meta.icon className="w-3 h-3" /> {meta.label}</span></td>
                      <td className="py-2 px-2 text-pearl/60 max-w-[260px] truncate">{r.resource_title || '—'}</td>
                      <td className="py-2 px-2 text-right text-pearl/70">{r.amount ? `${Number(r.amount).toLocaleString('fr-FR')} ${r.currency || ''}` : '—'}</td>
                      <td className="py-2 px-2 text-pearl/50">{r.source || '—'}</td>
                      <td className="py-2 px-2 text-pearl/50">{r.pays ? `${flagOf(r.pays)} ${r.pays}` : '—'}</td>
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

function Kpi({ label, value, color, icon: Icon, sub }: { label: string; value: number; color: string; icon: any; sub?: string }) {
  return (
    <div className="card-cinematic p-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}18`, border: `1px solid ${color}30` }}><Icon className="w-4 h-4" style={{ color }} /></div>
      <div className="font-cinzel text-xl font-black text-pearl leading-none">{value.toLocaleString('fr-FR')}</div>
      <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">{label}{sub ? ` · ${sub}` : ''}</div>
    </div>
  )
}
