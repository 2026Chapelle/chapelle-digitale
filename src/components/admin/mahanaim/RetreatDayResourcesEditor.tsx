'use client'

import { useCallback, useEffect, useState } from 'react'

type Resource = {
  id: string
  resource_type: 'video' | 'pdf'
  session_type: 'morning' | 'evening' | null
  title: string
  resource_url: string | null
  scheduled_time: string | null
  storage_path: string | null
}

type VideoForm = { title: string; url: string; scheduledTime: string }
const emptyVideo: VideoForm = { title: '', url: '', scheduledTime: '' }
const endpoint = '/api/admin/mahanaim/resources'

async function request(method: string, body: unknown) {
  const response = await fetch(endpoint, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await response.json()
  if (!response.ok || !json.ok) {
    throw new Error(json.message || 'Opération impossible.')
  }
  return json
}

export default function RetreatDayResourcesEditor({ dayId }: { dayId: string }) {
  const [resources, setResources] = useState<Resource[]>([])
  const [morning, setMorning] = useState<VideoForm>(emptyVideo)
  const [evening, setEvening] = useState<VideoForm>(emptyVideo)
  const [pdfTitle, setPdfTitle] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${endpoint}?dayId=${encodeURIComponent(dayId)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const json = await response.json()
      if (!response.ok || !json.ok || !Array.isArray(json.data)) {
        throw new Error(json.message || 'Chargement impossible.')
      }
      const rows = json.data as Resource[]
      setResources(rows)
      const video = (session: 'morning' | 'evening'): VideoForm => {
        const value = rows.find(r => r.resource_type === 'video' && r.session_type === session)
        return value
          ? { title: value.title, url: value.resource_url ?? '', scheduledTime: value.scheduled_time?.slice(0, 5) ?? '' }
          : { ...emptyVideo }
      }
      setMorning(video('morning'))
      setEvening(video('evening'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }, [dayId])

  useEffect(() => { void refresh() }, [refresh])

  async function saveVideo(sessionType: 'morning' | 'evening', value: VideoForm) {
    setBusy(true); setError(''); setNotice('')
    try {
      await request('POST', {
        dayId, resourceType: 'video', sessionType,
        title: value.title,
        url: value.url.trim() || null,
        scheduledTime: value.scheduledTime || null,
      })
      await refresh()
      setNotice('Séance enregistrée.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function addPdf() {
    setBusy(true); setError(''); setNotice('')
    try {
      await request('POST', {
        dayId, resourceType: 'pdf',
        title: pdfTitle,
        url: pdfUrl,
      })
      setPdfTitle('')
      setPdfUrl('')
      await refresh()
      setNotice('Document PDF ajouté.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ajout impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function uploadPdf() {
    if (!uploadFile || !uploadTitle.trim()) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const form = new FormData()
      form.append('dayId', dayId)
      form.append('title', uploadTitle.trim())
      form.append('file', uploadFile)

      const response = await fetch(
        '/api/admin/mahanaim/resources/upload',
        {
          method: 'POST',
          credentials: 'same-origin',
          body: form,
        },
      )

      const json = await response.json()

      if (!response.ok || !json.ok) {
        throw new Error(json.message || 'Téléversement impossible.')
      }

      setUploadTitle('')
      setUploadFile(null)
      await refresh()
      setNotice('PDF privé téléversé et enregistré.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Téléversement impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function deletePdf(id: string, isPrivate: boolean) {
    const question = isPrivate
      ? 'Supprimer ce PDF privé de la journée et du stockage ?'
      : 'Retirer ce lien PDF de cette journée ?'

    if (!window.confirm(question)) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await request('DELETE', { dayId, resourceId: id })
      await refresh()
      setNotice(result.cleanupRequired
        ? 'Document retiré. Attention : nettoyage du stockage à vérifier.'
        : 'Document PDF retiré.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Suppression impossible.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass = 'w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white'
  const videoSections = [
    { key: 'morning' as const, label: 'Matinale', value: morning, update: setMorning },
    { key: 'evening' as const, label: 'Soirée', value: evening, update: setEvening },
  ]

  return (
    <section className="mt-8 space-y-5 border-t border-white/10 pt-7" aria-label="Vidéos et PDF de la journée">
      <h3 className="text-xl font-semibold text-amber-200">Vidéos et ressources PDF</h3>
      <p className="text-sm text-white/60">Ressources associées uniquement à cette journée.</p>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
      {loading ? <p className="text-white/60">Chargement des ressources…</p> : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {videoSections.map(({ key, label, value, update }) => (
              <div key={key} className="space-y-3 rounded-xl border border-white/10 p-4">
                <h4 className="font-semibold text-white">{label}</h4>
                <label className="block text-sm text-white/80">
                  Titre
                  <input className={inputClass} disabled={busy} value={value.title}
                    onChange={e => update({ ...value, title: e.target.value })} />
                </label>
                <label className="block text-sm text-white/80">
                  Horaire (HH:MM)
                  <input type="time" className={inputClass} disabled={busy}
                    value={value.scheduledTime}
                    onChange={e => update({ ...value, scheduledTime: e.target.value })} />
                </label>
                <label className="block text-sm text-white/80">
                  Lien du direct ou replay (HTTPS)
                  <input type="url" className={inputClass} disabled={busy}
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={value.url}
                    onChange={e => update({ ...value, url: e.target.value })} />
                </label>
                <button type="button" disabled={busy || !value.title.trim()}
                  onClick={() => void saveVideo(key, value)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
                  Enregistrer {label.toLowerCase()}
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 p-4">
            <h4 className="font-semibold text-white">Documents PDF</h4>
            <p className="text-xs text-white/60">Ajoutez un lien HTTPS ou téléversez directement un PDF privé.</p>
            <input className={inputClass} disabled={busy} placeholder="Titre du PDF"
              value={pdfTitle} onChange={e => setPdfTitle(e.target.value)} />
            <input type="url" className={inputClass} disabled={busy}
              placeholder="https://exemple.org/guide.pdf"
              value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} />
            <button type="button" disabled={busy || !pdfTitle.trim() || !pdfUrl.trim()}
              onClick={() => void addPdf()}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
              Ajouter le PDF par lien
            </button>
            <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
              <h5 className="font-medium text-amber-200">Téléverser un PDF privé</h5>
              <input
                className={inputClass}
                disabled={busy}
                placeholder="Titre du document"
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
              />
              <input
                type="file"
                accept="application/pdf,.pdf"
                className={inputClass}
                disabled={busy}
                key={dayId + (uploadFile ? uploadFile.name : '')}
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-white/50">PDF uniquement · 10 Mo maximum.</p>
              <button
                type="button"
                disabled={busy || !uploadTitle.trim() || !uploadFile}
                onClick={() => void uploadPdf()}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                Téléverser le PDF
              </button>
            </div>
            <ul className="space-y-2">
              {resources.filter(r => r.resource_type === 'pdf').map(pdf => (
                <li key={pdf.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 p-3 text-sm">
                  <span className="text-white">{pdf.title}</span>
                  <div className="flex items-center gap-3">
                    {pdf.storage_path ? (
                      <span className="text-white/60">Fichier privé</span>
                    ) : (
                      pdf.resource_url && <a className="text-amber-300 underline"
                        href={pdf.resource_url} target="_blank" rel="noopener noreferrer">Vérifier</a>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      className="text-red-300 underline disabled:opacity-50"
                      onClick={() => void deletePdf(pdf.id, Boolean(pdf.storage_path))}
                    >
                      Retirer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}