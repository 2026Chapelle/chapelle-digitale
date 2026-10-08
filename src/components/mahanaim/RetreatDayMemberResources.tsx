'use client'

import { useEffect, useState } from 'react'

type Resource = {
  id: string
  resourceType: 'video' | 'pdf'
  sessionType: 'morning' | 'evening' | null
  title: string
  scheduledTime: string | null
  url: string | null
  isPrivate: boolean
}

type Props = {
  dayId: string
}

const ENDPOINT = '/api/member/mahanaim/resources'

export default function RetreatDayMemberResources({ dayId }: Props) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      setResources([])

      try {
        const response = await fetch(
          `${ENDPOINT}?dayId=${encodeURIComponent(dayId)}`,
          { credentials: 'same-origin', cache: 'no-store' },
        )

        const json = await response.json()

        if (!response.ok || !json.ok || !Array.isArray(json.data)) {
          throw new Error(json.message || 'Ressources indisponibles.')
        }

        if (active) setResources(json.data as Resource[])
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Chargement impossible.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [dayId])

  async function openPrivatePdf(resourceId: string) {
    setDownloading(resourceId)
    setError('')

    // Ouvrir pendant le clic utilisateur pour éviter les bloqueurs de fenêtres.
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null

    try {
      const response = await fetch(
        `${ENDPOINT}?dayId=${encodeURIComponent(dayId)}&resourceId=${encodeURIComponent(resourceId)}`,
        { credentials: 'same-origin', cache: 'no-store' },
      )

      const json = await response.json()

      if (!response.ok || !json.ok || typeof json.url !== 'string') {
        throw new Error(json.message || 'Téléchargement indisponible.')
      }

      const url = new URL(json.url)
      if (url.protocol !== 'https:') throw new Error('Lien invalide.')

      if (tab) {
        tab.location.replace(url.toString())
      } else {
        // Solution de repli lorsque le navigateur bloque le nouvel onglet.
        window.location.assign(url.toString())
      }
    } catch (cause) {
      if (tab) tab.close()
      setError(cause instanceof Error ? cause.message : 'Téléchargement impossible.')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return <p className="mt-4 text-sm text-slate-400">Chargement des ressources…</p>
  }

  if (error && resources.length === 0) {
    return <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>
  }

  if (resources.length === 0) return null

  const videos = resources.filter(item => item.resourceType === 'video' && item.url)
  const pdfs = resources.filter(item => item.resourceType === 'pdf')

  return (
    <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
      {videos.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-amber-200">Vidéos de la journée</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {videos.map(video => (
              <a key={video.id} href={video.url!}
                target="_blank" rel="noopener noreferrer"
                className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-white hover:bg-amber-300/10">
                <span className="block text-xs text-amber-200">
                  {video.sessionType === 'morning' ? 'Matinale' : 'Soirée'}
                  {video.scheduledTime ? ` · ${video.scheduledTime.slice(0, 5)}` : ''}
                </span>
                <span className="mt-1 block font-medium">{video.title}</span>
                <span className="mt-2 block text-amber-200">Regarder la vidéo ↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {pdfs.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-amber-200">Documents PDF</h4>
          <ul className="space-y-2">
            {pdfs.map(pdf => (
              <li key={pdf.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3 text-sm">
                <span className="text-white">{pdf.title}</span>
                {pdf.isPrivate ? (
                  <button type="button"
                    disabled={downloading === pdf.id}
                    onClick={() => void openPrivatePdf(pdf.id)}
                    className="font-semibold text-amber-200 underline disabled:opacity-50">
                    {downloading === pdf.id ? 'Préparation…' : 'Télécharger le PDF'}
                  </button>
                ) : pdf.url ? (
                  <a href={pdf.url} target="_blank" rel="noopener noreferrer"
                    className="font-semibold text-amber-200 underline">
                    Ouvrir le PDF ↗
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </div>
  )
}