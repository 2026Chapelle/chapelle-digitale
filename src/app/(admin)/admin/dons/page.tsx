'use client'
/**
 * Back-office « Dons & Offrandes » — catalogue Chariow administrable.
 *
 * Permet d'ajouter / modifier un produit Chariow SANS redéployer le site :
 * titre public, description, type, product_id Chariow, lien direct, texte &
 * couleur du bouton, statut actif/inactif, position, page associée.
 *
 * Le nom « Chariow » n'apparaît QUE dans ce back-office technique.
 */
import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Loader2, Check, Database, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

const TYPES = [
  { value: 'don', label: 'Don volontaire' },
  { value: 'offrande', label: 'Offrande' },
  { value: 'inscription', label: 'Inscription' },
  { value: 'acces', label: 'Accès au parcours' },
  { value: 'partenariat', label: 'Partenariat' },
]
const PAGES = ['dons', 'offrandes', 'destinee-acces', 'partenariat', 'accueil', 'formations']

type Product = Record<string, any>

const BLANK: Product = {
  public_title: '', public_description: '', type: 'don', provider: 'chariow',
  product_id: '', direct_url: '', button_label: 'Soutenir l’œuvre', button_color: '#D4AF37',
  widget_style: 'tap', page: 'dons', position: 0, is_active: true, slug: '',
}

export default function AdminDonsPage() {
  const [rows, setRows] = useState<Product[]>([])
  const [demo, setDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const base = '/api/admin/giving/products'

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(base, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) { setDemo(true); setRows([]) }
      else if (j.ok) { setDemo(false); setRows(j.data || []) }
      else setError(j.message || 'Erreur')
    } catch { setError('Erreur réseau') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() { setEditing({ ...BLANK, position: rows.length }); setIsNew(true) }
  function openEdit(p: Product) { setEditing({ ...p }); setIsNew(false) }
  function close() { setEditing(null); setSaving(false) }

  async function save() {
    if (!editing) return
    setSaving(true); setError(null)
    const payload: Product = { ...editing, position: Number(editing.position) || 0 }
    if (!payload.slug && payload.public_title) {
      payload.slug = payload.public_title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }
    try {
      const r = await fetch(base, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (j.ok) { close(); load() } else { setError(j.message || 'Échec'); setSaving(false) }
    } catch { setError('Erreur réseau'); setSaving(false) }
  }

  async function patch(p: Product, changes: Product) {
    await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: p.id, ...changes }) })
    load()
  }
  async function remove(p: Product) {
    if (!confirm('Supprimer ce produit ?')) return
    await fetch(base, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: p.id }) })
    load()
  }

  const set = (k: string, v: any) => setEditing((e) => ({ ...(e as Product), [k]: v }))

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={<>Dons & <span className="text-cinematic-gold">Offrandes</span></>}
          description="Catalogue des produits de soutien (paiement Chariow). Ajoutez ou modifiez sans redéployer."
          actions={<button onClick={openNew} disabled={demo} className="btn-gold-cinematic px-4 py-2 text-xs disabled:opacity-40"><Plus className="w-4 h-4" /> Nouveau produit</button>}
        />

        {demo && (
          <div className="card-cinematic p-4 mb-5 flex items-center gap-3">
            <Database className="w-4 h-4 text-gold" />
            <p className="font-inter text-sm text-pearl/60">Mode démo : connectez Supabase pour gérer le catalogue. Le site public affiche les 3 produits de secours.</p>
          </div>
        )}
        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : (
          <div className="card-cinematic overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-inter text-[11px] uppercase tracking-wider text-pearl/40 border-b border-white/5">
                    <th className="px-4 py-3">Titre public</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Product ID</th>
                    <th className="px-4 py-3">Page</th>
                    <th className="px-4 py-3">Lien</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && !demo && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-pearl/30 font-inter">Aucun produit. Cliquez sur « Nouveau produit ».</td></tr>
                  )}
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-pearl/80 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.button_color }} />
                          {p.public_title}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-pearl/50">{TYPES.find((t) => t.value === p.type)?.label || p.type}</td>
                      <td className="px-4 py-3 text-pearl/40 font-mono text-xs">{p.product_id || '—'}</td>
                      <td className="px-4 py-3 text-pearl/50">{p.page}</td>
                      <td className="px-4 py-3">
                        {p.direct_url ? <a href={p.direct_url} target="_blank" rel="noreferrer" className="text-gold/70 hover:text-gold inline-flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /></a> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => patch(p, { is_active: !p.is_active })} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-inter"
                          style={p.is_active ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' } : { background: 'rgba(107,114,128,0.15)', color: '#9CA3AF' }}>
                          {p.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}{p.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(p)} className="text-pearl/40 hover:text-gold p-1.5"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(p)} className="text-pearl/40 hover:text-danger p-1.5"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div className="admin-modal-overlay flex items-center justify-center p-4" onClick={close}>
          <div className="admin-modal-box w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cinzel text-lg font-bold text-pearl">{isNew ? 'Nouveau produit' : 'Modifier le produit'}</h2>
              <button onClick={close} className="text-pearl/40 hover:text-pearl"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Titre public *"><input className="input-royal" value={editing.public_title} onChange={(e) => set('public_title', e.target.value)} /></Field>
              <Field label="Type"><select className="input-royal" value={editing.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
              <Field label="Description" full><textarea rows={2} className="input-royal resize-none" value={editing.public_description} onChange={(e) => set('public_description', e.target.value)} /></Field>
              <Field label="Product ID Chariow"><input className="input-royal font-mono" placeholder="prd_xxxxxx" value={editing.product_id} onChange={(e) => set('product_id', e.target.value)} /></Field>
              <Field label="Lien direct Chariow"><input className="input-royal" placeholder="https://…mychariow.shop/…" value={editing.direct_url} onChange={(e) => set('direct_url', e.target.value)} /></Field>
              <Field label="Texte du bouton"><input className="input-royal" value={editing.button_label} onChange={(e) => set('button_label', e.target.value)} /></Field>
              <Field label="Couleur du bouton">
                <div className="flex items-center gap-2">
                  <input type="color" value={editing.button_color || '#D4AF37'} onChange={(e) => set('button_color', e.target.value)} className="w-10 h-10 rounded-lg bg-transparent border border-white/10" />
                  <input className="input-royal flex-1" value={editing.button_color} onChange={(e) => set('button_color', e.target.value)} />
                </div>
              </Field>
              <Field label="Page associée"><select className="input-royal" value={editing.page} onChange={(e) => set('page', e.target.value)}>{PAGES.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
              <Field label="Position"><input type="number" className="input-royal" value={editing.position} onChange={(e) => set('position', e.target.value)} /></Field>
              <Field label="Statut">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-pearl/60 font-inter pt-2">
                  <input type="checkbox" checked={!!editing.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Actif (visible sur le site)
                </label>
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={close} className="px-4 py-2 rounded-xl text-sm font-inter text-pearl/50 hover:text-pearl">Annuler</button>
              <button onClick={save} disabled={saving} className="btn-gold-cinematic px-5 py-2.5 text-sm disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : <><Check className="w-4 h-4" /> Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
