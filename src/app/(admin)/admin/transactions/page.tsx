'use client'
import { useEffect, useState, useCallback } from 'react'
import { Loader2, Search, Filter, HandCoins, CheckCircle, Receipt, Hash } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

interface Txn {
  id: string; nom: string | null; email: string | null; user_id: string | null
  montant: number; devise: string; type: string; source: string
  produit: string | null; product_id: string | null
  reference: string | null; transaction_id: string | null
  statut: string; recu_envoye: boolean; date: string
}
interface Totaux { transactions: number; montant_par_devise: Record<string, number>; recus_envoyes: number }

const STATUT_COLOR: Record<string, string> = { complete: '#22C55E', en_attente: '#FBBF24', echoue: '#EF4444', rembourse: '#A855F7' }

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState<Txn[]>([])
  const [totaux, setTotaux] = useState<Totaux | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [f, setF] = useState({ from: '', to: '', produit: '', type: '', email: '', membre: '', statut: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v) })
      const r = await fetch(`/api/admin/transactions?${p.toString()}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      else if (j.ok) { setRows(j.data || []); setTotaux(j.totaux) }
    } catch { /* */ }
    setLoading(false)
  }, [f])

  useEffect(() => { load() }, []) // initial
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }))

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Gouvernement financier"
          title={<>Transactions <span className="text-cinematic-gold">Chariow</span></>}
          description="Tous les paiements réels — qui a payé, quoi, combien, quand. Dons, offrandes, partenariats, formations, masterclass, marketplace."
        />
        {demo && <div className="card-cinematic p-4 mb-5 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase.</div>}

        {totaux && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Kpi icon={Hash} color="#60A5FA" value={String(totaux.transactions)} label="Transactions" />
            <Kpi icon={HandCoins} color="#EAB308" value={Object.keys(totaux.montant_par_devise).length ? Object.entries(totaux.montant_par_devise).map(([d, m]) => `${m.toLocaleString('fr-FR')} ${d}`).join(' · ') : '0'} label="Montant (validé)" />
            <Kpi icon={Receipt} color="#22C55E" value={String(totaux.recus_envoyes)} label="Reçus envoyés" />
          </div>
        )}

        <div className="card-cinematic p-4 mb-5">
          <div className="flex items-center gap-2 mb-3 text-pearl/60 font-inter text-xs"><Filter className="w-3.5 h-3.5 text-gold" /> Filtres avancés</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <input value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="Email" className="input-royal text-sm" />
            <input value={f.membre} onChange={(e) => set('membre', e.target.value)} placeholder="Nom du membre" className="input-royal text-sm" />
            <input value={f.produit} onChange={(e) => set('produit', e.target.value)} placeholder="Produit / type" className="input-royal text-sm" />
            <select value={f.type} onChange={(e) => set('type', e.target.value)} className="input-royal text-sm">
              <option value="">Toutes sources</option>
              <option value="live">Live</option><option value="dons">Page dons</option>
              <option value="evenement">Événement</option><option value="formation">Formation</option><option value="chariow">Chariow</option>
            </select>
            <select value={f.statut} onChange={(e) => set('statut', e.target.value)} className="input-royal text-sm">
              <option value="">Tous statuts</option>
              <option value="complete">Validé</option><option value="en_attente">En attente</option>
              <option value="echoue">Échoué</option><option value="rembourse">Remboursé</option>
            </select>
            <input type="date" value={f.from} onChange={(e) => set('from', e.target.value)} className="input-royal text-sm" />
            <input type="date" value={f.to} onChange={(e) => set('to', e.target.value)} className="input-royal text-sm" />
            <button onClick={load} className="btn-gold text-sm px-4 py-2 inline-flex items-center justify-center gap-1.5"><Search className="w-3.5 h-3.5" /> Filtrer</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune transaction pour ces critères.</div>
        ) : (
          <div className="card-cinematic p-5 overflow-x-auto">
            <table className="w-full text-sm font-inter">
              <thead>
                <tr className="text-pearl/40 text-[11px] uppercase tracking-wider text-left border-b border-white/5">
                  <th className="py-2 pr-3">Date</th><th className="py-2 px-2">Membre</th><th className="py-2 px-2">Produit</th>
                  <th className="py-2 px-2">Type</th><th className="py-2 px-2 text-right">Montant</th>
                  <th className="py-2 px-2">Référence</th><th className="py-2 px-2">Statut</th><th className="py-2 px-2">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = new Date(r.date)
                  const sc = STATUT_COLOR[r.statut] || '#9CA3AF'
                  return (
                    <tr key={r.id} className="border-b border-white/[0.03]">
                      <td className="py-2 pr-3 text-pearl/50 whitespace-nowrap">{d.toLocaleDateString('fr-FR')}<span className="block text-[10px] text-pearl/30">{d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></td>
                      <td className="py-2 px-2 text-pearl/75">{r.nom || '—'}<span className="block text-[11px] text-pearl/35">{r.email || ''}</span><span className="block text-[9px] text-pearl/20 font-mono">{r.user_id ? r.user_id.slice(0, 8) : 'non rattaché'}</span></td>
                      <td className="py-2 px-2 text-pearl/60 max-w-[200px]"><span className="truncate block">{r.produit || '—'}</span><span className="text-[9px] text-pearl/30 font-mono">{r.product_id || ''}</span></td>
                      <td className="py-2 px-2"><span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-pearl/60 capitalize">{r.source}</span></td>
                      <td className="py-2 px-2 text-right text-gold font-cinzel font-bold whitespace-nowrap">{r.montant.toLocaleString('fr-FR')} {r.devise}</td>
                      <td className="py-2 px-2 text-[10px] font-mono text-pearl/40">{r.reference || '—'}</td>
                      <td className="py-2 px-2"><span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: sc }}><CheckCircle className="w-3 h-3" /> {r.statut}</span></td>
                      <td className="py-2 px-2">{r.recu_envoye ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <span className="text-[10px] text-pearl/25">non</span>}</td>
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

function Kpi({ icon: Icon, color, value, label }: { icon: any; color: string; value: string; label: string }) {
  return (
    <div className="card-cinematic p-4">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}18`, border: `1px solid ${color}30` }}><Icon className="w-4 h-4" style={{ color }} /></div>
      <div className="font-cinzel text-xl font-black text-pearl leading-none">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">{label}</div>
    </div>
  )
}
