'use client'
/**
 * Formulaire admin « Prières & Guides » (V2.3-C) — création + édition.
 * POST /api/admin/prayer-guides (create) ou PATCH /api/admin/prayer-guides/[id] (edit).
 * Image overlay par URL/path (pas d'upload dans ce lot).
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'

const CATEGORIES = ['Travail', 'Délivrance', 'Famille', 'Santé', 'Finances', 'Spirituel', 'Nation', 'Mariage', 'Urgence', 'Autre']
const STATUSES = [{ v: 'draft', l: 'Brouillon' }, { v: 'published', l: 'Publié' }, { v: 'archived', l: 'Archivé' }]
const ACCESS = [{ v: 'public_preview', l: 'Aperçu public' }, { v: 'member', l: 'Membre' }, { v: 'premium', l: 'Premium' }]

export function PrayerGuideForm({ initial, id }: { initial?: any; id?: string }) {
  const router = useRouter()
  const [f, setF] = useState({
    slug: initial?.slug || '',
    title: initial?.title || '',
    category: initial?.category || 'Travail',
    excerpt: initial?.excerpt || '',
    content: initial?.content || '',
    duration_minutes: initial?.duration_minutes ?? 4,
    level: initial?.level || 'Doux',
    intention: initial?.intention || '',
    recommended_moment: initial?.recommended_moment || '',
    guide_steps: Array.isArray(initial?.guide_steps) ? initial.guide_steps.join('\n') : '',
    takeaway: initial?.takeaway || '',
    image_url: initial?.image_url || '',
    image_alt: initial?.image_alt || '',
    overlay_tone: initial?.overlay_tone || 'gold',
    pdf_url: initial?.pdf_url || '',
    status: initial?.status || 'draft',
    access_level: initial?.access_level || 'member',
    display_order: initial?.display_order ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true); setError(null)
    try {
      const body = {
        ...f,
        duration_minutes: Number(f.duration_minutes) || 0,
        display_order: Number(f.display_order) || 0,
        guide_steps: String(f.guide_steps).split('\n').map((s) => s.trim()).filter(Boolean),
      }
      const url = id ? `/api/admin/prayer-guides/${id}` : '/api/admin/prayer-guides'
      const r = await fetch(url, {
        method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) { setError(j?.message || 'Enregistrement impossible.'); setSaving(false); return }
      router.push('/admin/prieres-guides'); router.refresh()
    } catch { setError('Erreur réseau.'); setSaving(false) }
  }

  const field = 'input-royal w-full text-sm'
  const label = 'block text-[11px] uppercase tracking-wider text-pearl/40 font-inter mb-1'

  return (
    <form onSubmit={submit} className="space-y-4 max-w-3xl">
      {error && <div className="card-royal p-3 text-sm text-danger font-inter">{error}</div>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className={label}>Titre *</label><input className={field} value={f.title} onChange={(e) => set('title', e.target.value)} required /></div>
        <div><label className={label}>Slug *</label><input className={field} value={f.slug} onChange={(e) => set('slug', e.target.value)} placeholder="priere-…" required /></div>
        <div><label className={label}>Catégorie *</label>
          <select className={field} value={f.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label className={label}>Durée (min)</label><input type="number" min={0} className={field} value={f.duration_minutes} onChange={(e) => set('duration_minutes', e.target.value)} /></div>
        <div><label className={label}>Niveau</label><input className={field} value={f.level} onChange={(e) => set('level', e.target.value)} placeholder="Doux / Fervent / Intense" /></div>
        <div><label className={label}>Ordre d'affichage</label><input type="number" className={field} value={f.display_order} onChange={(e) => set('display_order', e.target.value)} /></div>
        <div><label className={label}>Statut</label>
          <select className={field} value={f.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
        <div><label className={label}>Accès</label>
          <select className={field} value={f.access_level} onChange={(e) => set('access_level', e.target.value)}>{ACCESS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
      </div>

      <div><label className={label}>Intention</label><input className={field} value={f.intention} onChange={(e) => set('intention', e.target.value)} /></div>
      <div><label className={label}>Moment recommandé</label><input className={field} value={f.recommended_moment} onChange={(e) => set('recommended_moment', e.target.value)} /></div>
      <div><label className={label}>Extrait (public) *</label><textarea rows={2} className={`${field} resize-none`} value={f.excerpt} onChange={(e) => set('excerpt', e.target.value)} required /></div>
      <div><label className={label}>Contenu complet (réservé) *</label><textarea rows={8} className={`${field} resize-y`} value={f.content} onChange={(e) => set('content', e.target.value)} required /></div>
      <div><label className={label}>Étapes du guide (une par ligne)</label><textarea rows={4} className={`${field} resize-y`} value={f.guide_steps} onChange={(e) => set('guide_steps', e.target.value)} placeholder={"Étape 1\nÉtape 2\nÉtape 3"} /></div>
      <div><label className={label}>À retenir</label><textarea rows={2} className={`${field} resize-none`} value={f.takeaway} onChange={(e) => set('takeaway', e.target.value)} /></div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className={label}>Image (URL / path)</label><input className={field} value={f.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="/images/prieres/…" /></div>
        <div><label className={label}>Texte alternatif image</label><input className={field} value={f.image_alt} onChange={(e) => set('image_alt', e.target.value)} /></div>
        <div><label className={label}>Ton overlay</label><input className={field} value={f.overlay_tone} onChange={(e) => set('overlay_tone', e.target.value)} placeholder="gold / dark" /></div>
        <div><label className={label}>PDF (URL / path, optionnel)</label><input className={field} value={f.pdf_url} onChange={(e) => set('pdf_url', e.target.value)} /></div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {id ? 'Enregistrer' : 'Créer la prière'}
        </button>
        <button type="button" onClick={() => router.push('/admin/prieres-guides')} className="text-sm font-inter text-pearl/50 hover:text-pearl px-3 py-2">Annuler</button>
      </div>
    </form>
  )
}
