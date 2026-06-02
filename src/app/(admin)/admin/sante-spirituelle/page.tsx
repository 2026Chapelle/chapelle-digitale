'use client'
import { useEffect, useState } from 'react'
import { Loader2, Activity, AlertTriangle, RefreshCw, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import toast from 'react-hot-toast'

type Color = 'vert' | 'jaune' | 'orange' | 'rouge'
interface Membre { id: string; nom: string; pays: string; membre_statut: string; color: Color; label: string; score: number; classification: string; inactif_jours: number | null }
interface Data {
  total: number
  parCouleur: Record<Color, number>
  parClasse: Record<string, number>
  alertes: Membre[]
  membres: Membre[]
}

const COLOR_META: Record<Color, { dot: string; label: string; emoji: string }> = {
  vert: { dot: '#22C55E', label: 'Engagé', emoji: '🟢' },
  jaune: { dot: '#EAB308', label: 'À suivre', emoji: '🟡' },
  orange: { dot: '#F97316', label: 'Fragile', emoji: '🟠' },
  rouge: { dot: '#EF4444', label: 'À réengager', emoji: '🔴' },
}
const CLASS_LABEL: Record<string, string> = { visiteur: 'Visiteur', inscrit: 'Inscrit', fidele: 'Fidèle', membre: 'Membre', responsable: 'Responsable' }

export default function AdminSantePage() {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    try {
      const r = await fetch('/api/admin/sante', { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      else if (j.ok) setD(j)
    } catch { /* */ }
    setLoading(false)
  }

  async function applyClassification() {
    if (!confirm('Appliquer la classification calculée à tous les membres (hors responsables) ? Cela met à jour leur statut.')) return
    setApplying(true)
    try {
      const r = await fetch('/api/admin/sante', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply: true }),
      })
      const j = await r.json()
      if (j.ok) { toast.success(`${j.applied} statut(s) mis à jour`); load() }
      else toast.error(j.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
    setApplying(false)
  }

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Gouvernement pastoral"
          title={<>Santé <span className="text-cinematic-gold">spirituelle</span> & classification</>}
          description="Indice d'engagement par membre, alertes pastorales et classification automatique — calculés sur l'activité réelle."
        />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase.</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours…</div>
        ) : !d || d.total === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucun membre à analyser pour le moment.</div>
        ) : (
          <>
            {/* Indice de santé — distribution */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {(Object.keys(COLOR_META) as Color[]).map((c) => (
                <div key={c} className="card-cinematic p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_META[c].dot }} />
                    <span className="font-inter text-[11px] uppercase tracking-wider text-pearl/40">{COLOR_META[c].label}</span>
                  </div>
                  <div className="font-cinzel text-2xl font-black text-pearl">{d.parCouleur[c]}</div>
                </div>
              ))}
            </div>

            {/* Classification + action */}
            <div className="card-cinematic p-5 mb-6">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2"><Users className="w-4 h-4 text-gold" /> Classification automatique</h2>
                <button onClick={applyClassification} disabled={applying}
                  className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-60">
                  {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Recalculer & appliquer les statuts
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(d.parClasse).map(([k, n]) => (
                  <span key={k} className="text-xs font-inter px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-pearl/70">
                    {CLASS_LABEL[k] || k} · <strong className="text-pearl">{n}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Alertes pastorales */}
            <div className="card-cinematic p-5 mb-6">
              <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-gold" /> Alertes pastorales ({d.alertes.length})</h2>
              {d.alertes.length === 0 ? (
                <p className="text-sm text-emerald-400/80 font-inter">Aucune alerte : la communauté est engagée. Gloire à Dieu.</p>
              ) : (
                <div className="space-y-2">
                  {d.alertes.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLOR_META[m.color].dot }} />
                        <span className="font-inter text-sm text-pearl/75 truncate">{m.nom}</span>
                        {m.pays && <span className="font-inter text-[11px] text-pearl/35">· {m.pays}</span>}
                      </div>
                      <span className="font-inter text-[11px] text-pearl/40 flex-shrink-0">
                        {m.inactif_jours === null ? 'Jamais actif' : `Inactif ${m.inactif_jours} j`} · {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Détail membres */}
            <div className="card-cinematic p-5 overflow-x-auto">
              <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-gold" /> Membres analysés</h2>
              <table className="w-full text-sm font-inter">
                <thead>
                  <tr className="text-pearl/40 text-[11px] uppercase tracking-wider text-left border-b border-white/5">
                    <th className="py-2 pr-3">Membre</th><th className="py-2 px-2">Santé</th>
                    <th className="py-2 px-2">Classification</th><th className="py-2 px-2 text-right">Score</th>
                    <th className="py-2 px-2 text-right">Inactivité</th>
                  </tr>
                </thead>
                <tbody>
                  {d.membres.map((m) => (
                    <tr key={m.id} className="border-b border-white/[0.03]">
                      <td className="py-2 pr-3 text-pearl/75">{m.nom}</td>
                      <td className="py-2 px-2"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLOR_META[m.color].dot }} /> <span className="text-pearl/60">{m.label}</span></span></td>
                      <td className="py-2 px-2 text-pearl/60">{CLASS_LABEL[m.classification] || m.classification}</td>
                      <td className="py-2 px-2 text-right text-pearl/60">{m.score}</td>
                      <td className="py-2 px-2 text-right text-pearl/40">{m.inactif_jours === null ? '—' : `${m.inactif_jours} j`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
