'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2, Upload } from 'lucide-react'

type Resource = { id: string; resource_type: 'video' | 'pdf'; session_type: 'morning' | 'evening' | null; title: string; resource_url: string | null; storage_path: string | null; scheduled_time: string | null }
type Session = 'morning' | 'evening'

function status(resource: Resource | undefined) {
  if (!resource) return { label: 'À venir', className: 'text-amber-100' }
  if ((resource.resource_type === 'pdf' && resource.storage_path) || (resource.resource_type === 'video' && resource.resource_url)) return { label: 'Publié', className: 'text-emerald-200' }
  return { label: 'Indisponible', className: 'text-red-200' }
}

export default function RetreatDayMediaEditor({ dayId }: { dayId: string }) {
  const [resources, setResources] = useState<Resource[]>([])
  const [morningUrl, setMorningUrl] = useState('')
  const [eveningUrl, setEveningUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Session | 'pdf' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setMessage(null)
    try {
      const response = await fetch(`/api/admin/mahanaim/resources?dayId=${encodeURIComponent(dayId)}`, { credentials: 'same-origin', cache: 'no-store' })
      const json = await response.json()
      if (!response.ok || !json.ok || !Array.isArray(json.data)) throw new Error(json.message || 'Impossible de charger les médias.')
      const next = json.data as Resource[]
      setResources(next)
      setMorningUrl(next.find((item) => item.resource_type === 'video' && item.session_type === 'morning')?.resource_url ?? '')
      setEveningUrl(next.find((item) => item.resource_type === 'video' && item.session_type === 'evening')?.resource_url ?? '')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Impossible de charger les médias.') } finally { setLoading(false) }
  }, [dayId])

  useEffect(() => { void load() }, [load])

  async function saveVideo(sessionType: Session) {
    const videoUrl = sessionType === 'morning' ? morningUrl : eveningUrl
    setSaving(sessionType); setMessage(null)
    try {
      const response = await fetch('/api/admin/mahanaim/resources', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dayId, sessionType, videoUrl }) })
      const json = await response.json()
      if (!response.ok || !json.ok) throw new Error(json.message || 'Enregistrement impossible.')
      await load(); setMessage('Vidéo enregistrée et publiée.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.') } finally { setSaving(null) }
  }

  async function uploadPdf(file: File | null) {
    if (!file) return
    setSaving('pdf'); setMessage(null)
    try {
      const form = new FormData(); form.set('dayId', dayId); form.set('file', file)
      const response = await fetch('/api/admin/mahanaim/resources', { method: 'POST', credentials: 'same-origin', body: form })
      const json = await response.json()
      if (!response.ok || !json.ok) throw new Error(json.message || 'Import impossible.')
      await load(); setMessage('Carnet PDF importé et publié dans le stockage privé.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Import impossible.') } finally { setSaving(null) }
  }

  async function unpublish(resource: Resource) {
    if (!window.confirm(`Dépublier « ${resource.title} » ?`)) return
    setSaving(resource.resource_type === 'pdf' ? 'pdf' : resource.session_type ?? 'morning'); setMessage(null)
    try {
      const response = await fetch('/api/admin/mahanaim/resources', { method: 'DELETE', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dayId, resourceId: resource.id }) })
      const json = await response.json()
      if (!response.ok || !json.ok) throw new Error(json.message || 'Dépublication impossible.')
      await load(); setMessage('Ressource dépubliée.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Dépublication impossible.') } finally { setSaving(null) }
  }

  const video = (session: Session) => resources.find((item) => item.resource_type === 'video' && item.session_type === session)
  const pdf = resources.find((item) => item.resource_type === 'pdf')
  return <section className="mt-6 border-t border-white/10 pt-6" aria-label="Médias de la journée"><div><h3 className="font-cinzel text-lg font-bold text-pearl">Médias de la journée</h3><p className="mt-1 text-sm text-pearl/55">Les vidéos sont publiées par URL HTTPS. Le carnet est stocké dans le bucket privé et n’est jamais saisi comme chemin par le navigateur.</p></div>{message ? <p role="status" className="mt-3 text-sm text-amber-100">{message}</p> : null}{loading ? <p className="mt-4 text-sm text-pearl/55">Chargement des médias…</p> : <div className="mt-4 grid gap-4 lg:grid-cols-3"><VideoCard label="Matinale" value={morningUrl} onChange={setMorningUrl} resource={video('morning')} saving={saving === 'morning'} onSave={() => saveVideo('morning')} onUnpublish={unpublish} /><VideoCard label="Enseignement du soir" value={eveningUrl} onChange={setEveningUrl} resource={video('evening')} saving={saving === 'evening'} onSave={() => saveVideo('evening')} onUnpublish={unpublish} /><div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="font-semibold text-pearl">Carnet spirituel PDF <span className={status(pdf).className}>· {status(pdf).label}</span></p><input type="file" accept="application/pdf" disabled={saving === 'pdf'} onChange={(event) => void uploadPdf(event.target.files?.[0] ?? null)} className="mt-3 block w-full text-xs text-pearl/70 file:mr-3 file:rounded-lg file:border-0 file:bg-gold/15 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gold" />{pdf ? <button type="button" onClick={() => void unpublish(pdf)} disabled={saving === 'pdf'} className="mt-3 inline-flex items-center gap-1 text-xs text-red-200 hover:text-red-100"><Trash2 className="h-3.5 w-3.5" />Dépublier le carnet</button> : <p className="mt-3 text-xs text-pearl/45">PDF max. 20 Mo · stockage privé</p>}</div></div>}</section>
}

function VideoCard({ label, value, onChange, resource, saving, onSave, onUnpublish }: { label: string; value: string; onChange: (value: string) => void; resource?: Resource; saving: boolean; onSave: () => void; onUnpublish: (resource: Resource) => void }) {
  const current = status(resource)
  return <div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="font-semibold text-pearl">{label} <span className={current.className}>· {current.label}</span></p><label className="mt-3 block text-xs text-pearl/60">URL vidéo HTTPS<input type="url" value={value} onChange={(event) => onChange(event.target.value)} disabled={saving} placeholder="https://…" className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-pearl outline-none focus:border-gold/60" /></label><div className="mt-3 flex gap-2"><button type="button" onClick={onSave} disabled={saving || !value.trim()} className="inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-abyss disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Upload className="h-3.5 w-3.5" />Publier</>}</button>{resource ? <button type="button" onClick={() => void onUnpublish(resource)} disabled={saving} className="inline-flex items-center gap-1 px-2 text-xs text-red-200 hover:text-red-100"><Trash2 className="h-3.5 w-3.5" />Dépublier</button> : null}</div></div>
}
