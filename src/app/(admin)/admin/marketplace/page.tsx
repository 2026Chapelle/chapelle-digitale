'use client'
import { useEffect, useState, useCallback } from 'react'
import { Loader2, Plus, Pencil, Trash2, X, ShoppingBag, ExternalLink, Save } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

interface Produit {
  id?: string; slug?: string; titre: string; description?: string; type: string
  prix: number; devise: string; chariow_product_id?: string; lien_achat?: string
  fichier_path?: string; cover_url?: string; plateforme?: string; pays?: string
  acces_type: string; acces_url?: string; actif: boolean; achats?: number; created_at?: string
}

const TYPES = ['ebook', 'livre', 'masterclass', 'formation', 'billet', 'abonnement', 'numerique', 'physique', 'don']
const ACCES = [
  { v: 'telechargement', l: 'Téléchargement (fichier)' },
  { v: 'externe', l: 'Lien externe' },
  { v: 'streaming', l: 'Streaming' },
  { v: 'aucun', l: 'Aucun' },
]
const EMPTY: Produit = { titre: '', description: '', type: 'numerique', prix: 0, devise: 'FCFA', acces_type: 'telechargement', actif: true }

export default function AdminMarketplacePage() {
  const [rows, setRows] = useState<Produit[]>([])
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [form, setForm] = useState<Produit | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/marketplace', { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      else if (j.ok) setRows(j.data || [])
    } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const set = (k: keyof Produit, v: any) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const save = async () => {
    if (!form?.titre.trim()) { setMsg('Le titre est requis.'); return }
    setSaving(true); setMsg('')
    try {
      const method = form.id ? 'PATCH' : 'POST'
      const r = await fetch('/api/admin/marketplace', { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const j = await r.json()
      if (j.ok) { setForm(null); await load() } else setMsg(j.message || 'Erreur')
    } catch { setMsg('Erreur réseau') }
    setSaving(false)
  }

  const remove = async (id?: string) => {
    if (!id || !confirm('Supprimer ce produit ? Les achats déjà effectués restent valides.')) return
    try { await fetch(`/api/admin/marketplace?id=${id}`, { method: 'DELETE', credentials: 'same-origin' }); await load() } catch { /* */ }
  }

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal space-y-5">
        <PageHeader
          eyebrow="Boutique du Royaume"
          title={<>Marketplace <span className="text-cinematic-gold">& Produits</span></>}
          description="E-books, livres, masterclass, formations, billets, abonnements — multi-devises, multi-pays, prêt pour l'échelle. Paiement via Chariow, accès automatique après achat."
        />

        {demo && <div className="card-cinematic p-4 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase.</div>}

        <div className="flex items-center justify-between">
          <span className="text-xs font-inter text-pearl/50">{rows.length} produit(s)</span>
          <button onClick={() => { setForm({ ...EMPTY }); setMsg('') }} className="btn-gold text-sm px-4 py-2 inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> Nouveau produit</button>
        </div>

        {/* Formulaire création / édition */}
        {form && (
          <div className="card-cinematic-gold p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-gold" /> {form.id ? 'Modifier le produit' : 'Nouveau produit'}</h2>
              <button onClick={() => setForm(null)} className="text-pearl/40 hover:text-pearl"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Titre *"><input value={form.titre} onChange={(e) => set('titre', e.target.value)} className="input-royal text-sm" /></Field>
              <Field label="Slug (auto si vide)"><input value={form.slug || ''} onChange={(e) => set('slug', e.target.value)} className="input-royal text-sm" placeholder="ebook-priere" /></Field>
              <Field label="Type"><select value={form.type} onChange={(e) => set('type', e.target.value)} className="input-royal text-sm capitalize">{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Prix"><input type="number" value={form.prix} onChange={(e) => set('prix', Number(e.target.value))} className="input-royal text-sm" /></Field>
                <Field label="Devise"><input value={form.devise} onChange={(e) => set('devise', e.target.value.toUpperCase())} className="input-royal text-sm" /></Field>
              </div>
              <Field label="Description" full><textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={2} className="input-royal text-sm" /></Field>
              <Field label="Image (URL cover)"><input value={form.cover_url || ''} onChange={(e) => set('cover_url', e.target.value)} className="input-royal text-sm" placeholder="https://…" /></Field>
              <Field label="Lien d'achat Chariow"><input value={form.lien_achat || ''} onChange={(e) => set('lien_achat', e.target.value)} className="input-royal text-sm" placeholder="https://chariow…" /></Field>
              <Field label="ID produit Chariow (rapprochement webhook)"><input value={form.chariow_product_id || ''} onChange={(e) => set('chariow_product_id', e.target.value)} className="input-royal text-sm" /></Field>
              <Field label="Type d'accès"><select value={form.acces_type} onChange={(e) => set('acces_type', e.target.value)} className="input-royal text-sm">{ACCES.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}</select></Field>
              {form.acces_type === 'externe' ? (
                <Field label="URL d'accès (post-achat)"><input value={form.acces_url || ''} onChange={(e) => set('acces_url', e.target.value)} className="input-royal text-sm" placeholder="https://…" /></Field>
              ) : (
                <Field label="Fichier (chemin bucket 'produits')"><input value={form.fichier_path || ''} onChange={(e) => set('fichier_path', e.target.value)} className="input-royal text-sm" placeholder="ebooks/priere.pdf" /></Field>
              )}
              <Field label="Plateforme / antenne"><input value={form.plateforme || ''} onChange={(e) => set('plateforme', e.target.value)} className="input-royal text-sm" /></Field>
              <Field label="Pays (optionnel)"><input value={form.pays || ''} onChange={(e) => set('pays', e.target.value)} className="input-royal text-sm" /></Field>
              <label className="flex items-center gap-2 text-sm font-inter text-pearl/70 cursor-pointer"><input type="checkbox" checked={form.actif} onChange={(e) => set('actif', e.target.checked)} className="accent-gold" /> Visible dans la boutique</label>
            </div>
            {msg && <p className="text-xs font-inter text-red-400 mt-3">{msg}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={save} disabled={saving} className="btn-gold text-sm px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer</button>
              <button onClick={() => setForm(null)} className="text-sm px-4 py-2 rounded-lg bg-white/5 text-pearl/55 font-inter">Annuler</button>
            </div>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucun produit. Créez votre première ressource.</div>
        ) : (
          <div className="card-cinematic p-4 overflow-x-auto">
            <table className="w-full text-sm font-inter">
              <thead><tr className="text-pearl/40 text-[11px] uppercase tracking-wider text-left border-b border-white/5">
                <th className="py-2 pr-3">Produit</th><th className="py-2 px-2">Type</th><th className="py-2 px-2 text-right">Prix</th>
                <th className="py-2 px-2 text-right">Achats</th><th className="py-2 px-2">Statut</th><th className="py-2 px-2">Achat</th><th className="py-2 px-2 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.03]">
                    <td className="py-2 pr-3 text-pearl/80 max-w-[240px]"><span className="truncate block">{p.titre}</span><span className="text-[10px] text-pearl/25 font-mono">{p.slug}</span></td>
                    <td className="py-2 px-2"><span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-pearl/60 capitalize">{p.type}</span></td>
                    <td className="py-2 px-2 text-right text-gold font-cinzel font-bold whitespace-nowrap">{p.prix > 0 ? `${p.prix.toLocaleString('fr-FR')} ${p.devise}` : 'Gratuit'}</td>
                    <td className="py-2 px-2 text-right text-pearl/60">{p.achats ?? 0}</td>
                    <td className="py-2 px-2"><span className="text-[10px] font-semibold" style={{ color: p.actif ? '#22C55E' : '#6B7280' }}>{p.actif ? 'Visible' : 'Masqué'}</span></td>
                    <td className="py-2 px-2">{p.lien_achat ? <a href={p.lien_achat} target="_blank" rel="noopener noreferrer" className="text-gold/70 hover:text-gold inline-flex"><ExternalLink className="w-3.5 h-3.5" /></a> : <span className="text-pearl/20 text-[10px]">—</span>}</td>
                    <td className="py-2 px-2 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => { setForm({ ...EMPTY, ...p }); setMsg('') }} className="p-1.5 rounded-lg hover:bg-white/10 text-pearl/50 hover:text-gold"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-pearl/50 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="block text-[11px] font-inter text-pearl/45 mb-1">{label}</label>
      {children}
    </div>
  )
}
