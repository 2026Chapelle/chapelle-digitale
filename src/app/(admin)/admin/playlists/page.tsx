'use client'
/**
 * PODCAST-3 — Admin « Playlists de La Citadelle » (officielles). CRUD clair + gestion des
 * épisodes (ajout/retrait/ordre). Écritures via /api/admin/playlists (service_role + garde admin).
 */
import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, ArrowUp, ArrowDown, Check, Loader2, ListMusic } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { supabase } from '@/lib/supabase'

type Playlist = { id: string; title: string; description: string | null; cover_url: string | null; visibility: string; sort_order: number; audio_playlist_items?: { count: number }[] }
type Item = { id: string; podcast_id: string; position: number }
type Ep = { id: string; title: string; serie: string | null }

const VIS = [{ value: 'public', label: 'Publique (visiteurs)' }, { value: 'members', label: 'Membres' }, { value: 'private', label: 'Masquée' }]

export default function AdminPlaylistsPage() {
  const [rows, setRows] = useState<Playlist[]>([])
  const [eps, setEps] = useState<Ep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Partial<Playlist> | null>(null)
  const [saving, setSaving] = useState(false)
  const [manage, setManage] = useState<Playlist | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [addId, setAddId] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/admin/playlists', { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setRows(j.data || [])
      else setError(j.message || 'Erreur de chargement')
    } catch { setError('Erreur réseau') }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('cms_podcasts').select('id, title, serie').eq('status', 'published').order('published_at', { ascending: false }).limit(300)
        setEps((data as any[])?.map((p) => ({ id: String(p.id), title: p.title || 'Épisode', serie: p.serie || null })) ?? [])
      } catch { /* vide */ }
    })()
  }, [])

  const epTitle = (id: string) => eps.find((e) => e.id === id)?.title || id.slice(0, 8)

  async function save() {
    if (!editing?.title) { setError('Titre requis.'); return }
    setSaving(true); setError(null)
    const isNew = !editing.id
    try {
      const r = await fetch('/api/admin/playlists', {
        method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify(editing),
      })
      const j = await r.json()
      if (j.ok) { setEditing(null); load() } else setError(j.message || 'Échec')
    } catch { setError('Erreur réseau') }
    setSaving(false)
  }
  async function remove(p: Playlist) {
    if (!confirm(`Supprimer la playlist « ${p.title} » ? Les épisodes qu'elle contient ne sont pas supprimés.`)) return
    await fetch('/api/admin/playlists', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: p.id }) })
    load()
  }
  async function openManage(p: Playlist) {
    setManage(p); setItems([])
    const r = await fetch(`/api/admin/playlists/items?playlist_id=${p.id}`, { credentials: 'same-origin' })
    const j = await r.json(); if (j.ok) setItems(j.data || [])
  }
  async function reloadItems(pid: string) {
    const r = await fetch(`/api/admin/playlists/items?playlist_id=${pid}`, { credentials: 'same-origin' })
    const j = await r.json(); if (j.ok) setItems(j.data || [])
  }
  async function addItem() {
    if (!manage || !addId) return
    await fetch('/api/admin/playlists/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ playlist_id: manage.id, podcast_id: addId }) })
    setAddId(''); reloadItems(manage.id); load()
  }
  async function removeItem(podcastId: string) {
    if (!manage) return
    await fetch('/api/admin/playlists/items', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ playlist_id: manage.id, podcast_id: podcastId }) })
    reloadItems(manage.id); load()
  }
  async function move(idx: number, dir: -1 | 1) {
    if (!manage) return
    const ordered = items.map((i) => i.podcast_id)
    const j = idx + dir
    if (j < 0 || j >= ordered.length) return
    ;[ordered[idx], ordered[j]] = [ordered[j], ordered[idx]]
    await fetch('/api/admin/playlists/items', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ playlist_id: manage.id, ordered }) })
    reloadItems(manage.id)
  }

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Administration" title={<>Playlists de <span className="text-cinematic-gold">La Citadelle</span></>}
          description="Playlists audio officielles affichées sur /podcast. Titre, cover, visibilité, épisodes et ordre."
          actions={<button onClick={() => setEditing({ visibility: 'public', sort_order: rows.length })} className="btn-gold-cinematic px-4 py-2 text-xs"><Plus className="w-4 h-4" /> Nouvelle</button>} />

        {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 py-10 font-inter text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="card-cinematic text-center py-12 text-pearl/40 font-inter">Aucune playlist officielle. Cliquez sur « Nouvelle ».</div>
        ) : (
          <div className="grid gap-3">
            {rows.map((p) => (
              <div key={p.id} className="card-cinematic p-4 flex items-center gap-4">
                <ListMusic className="w-5 h-5 text-gold/70 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-cinzel text-pearl font-bold truncate">{p.title}</h3>
                  <p className="text-[11px] text-pearl/40 font-inter">{p.audio_playlist_items?.[0]?.count ?? 0} épisode(s) · {VIS.find((v) => v.value === p.visibility)?.label || p.visibility}</p>
                </div>
                <button onClick={() => openManage(p)} className="text-xs font-inter text-gold/80 hover:text-gold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(212,175,55,0.1)' }}>Épisodes</button>
                <button onClick={() => setEditing(p)} title="Modifier" className="text-pearl/40 hover:text-gold p-1.5"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => remove(p)} title="Supprimer" className="text-pearl/40 hover:text-danger p-1.5"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale création / édition */}
      {editing && (
        <div className="admin-modal-overlay flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="admin-modal-box w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cinzel text-lg font-bold text-pearl">{editing.id ? 'Modifier' : 'Nouvelle playlist'}</h2>
              <button onClick={() => setEditing(null)} className="text-pearl/40 hover:text-pearl"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <Field label="Titre *"><input className="input-royal" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="Description"><textarea rows={3} className="input-royal resize-none" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Field label="Cover (URL)"><input className="input-royal" value={editing.cover_url ?? ''} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} /></Field>
              <Field label="Visibilité"><select className="input-royal" value={editing.visibility ?? 'public'} onChange={(e) => setEditing({ ...editing, visibility: e.target.value })}>{VIS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}</select></Field>
              <Field label="Ordre"><input type="number" className="input-royal" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm text-pearl/50 hover:text-pearl">Annuler</button>
              <button onClick={save} disabled={saving} className="btn-gold-cinematic px-5 py-2.5 text-sm disabled:opacity-50">{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> …</> : <><Check className="w-4 h-4" /> Enregistrer</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* Gestion des épisodes */}
      {manage && (
        <div className="admin-modal-overlay flex items-center justify-center p-4" onClick={() => setManage(null)}>
          <div className="admin-modal-box w-full max-w-xl max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cinzel text-lg font-bold text-pearl truncate">Épisodes — {manage.title}</h2>
              <button onClick={() => setManage(null)} className="text-pearl/40 hover:text-pearl"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <select className="input-royal flex-1" value={addId} onChange={(e) => setAddId(e.target.value)}>
                <option value="">Ajouter un épisode…</option>
                {eps.filter((e) => !items.some((i) => i.podcast_id === e.id)).map((e) => <option key={e.id} value={e.id}>{e.title}{e.serie ? ` · ${e.serie}` : ''}</option>)}
              </select>
              <button onClick={addItem} disabled={!addId} className="btn-gold-cinematic px-3 py-2 text-xs disabled:opacity-40"><Plus className="w-4 h-4" /> Ajouter</button>
            </div>
            {items.length === 0 ? (
              <p className="text-pearl/40 font-inter text-sm py-6 text-center">Aucun épisode. Ajoutez-en ci-dessus.</p>
            ) : (
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={it.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-pearl/30 text-xs w-5">{i + 1}</span>
                    <span className="flex-1 min-w-0 text-sm text-pearl/80 font-inter truncate">{epTitle(it.podcast_id)}</span>
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="text-pearl/40 hover:text-gold disabled:opacity-20 p-1"><ArrowUp className="w-4 h-4" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-pearl/40 hover:text-gold disabled:opacity-20 p-1"><ArrowDown className="w-4 h-4" /></button>
                    <button onClick={() => removeItem(it.podcast_id)} title="Retirer" className="text-pearl/40 hover:text-danger p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
