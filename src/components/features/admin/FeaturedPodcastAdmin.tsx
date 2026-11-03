'use client'

import { useEffect, useState } from 'react'
import { Check, Headphones, Loader2 } from 'lucide-react'

type Episode = {
  id: string
  title: string
  description?: string | null
  cover_url?: string | null
  status: string
}

export function FeaturedPodcastAdmin() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [blockAvailable, setBlockAvailable] = useState(true)
  const [demo, setDemo] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/admin/featured-podcast', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok || !result.ok) throw new Error(result.message || 'Chargement impossible.')
        if (!active) return
        setEpisodes(Array.isArray(result.data) ? result.data : [])
        setSelected(result.selectedId ?? null)
        setDraft(result.selectedId ?? null)
        setBlockAvailable(result.blockAvailable !== false)
        setDemo(result.demo === true)
      })
      .catch((e: Error) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function save(id: string | null) {
    setError('')
    setMessage('')
    setSaving(true)
    try {
      const response = await fetch('/api/admin/featured-podcast', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'Enregistrement impossible.')
      setSelected(result.selectedId ?? null)
      setDraft(result.selectedId ?? null)
      setMessage(id ? 'Podcast de l’accueil enregistré.' : 'Sélection automatique rétablie.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center gap-2 text-pearl/60 font-inter text-sm py-10"><Loader2 className="h-4 w-4 animate-spin" /> Chargement des podcasts…</div>

  const visible = episodes.filter((episode) => episode.title?.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')))
  const canSave = !demo && blockAvailable && !saving && draft !== selected

  return (
    <div className="space-y-5">
      <div className="card-cinematic p-4 font-inter text-sm text-pearl/65 leading-relaxed">
        Choisissez le podcast à afficher dans « Aujourd’hui sur Citadelle ». Un seul épisode peut être sélectionné.
        Sans sélection, le dernier podcast publié sera utilisé automatiquement.
      </div>
      {demo && <p role="alert" className="text-amber-300 text-sm">Mode démo : Supabase est requis pour enregistrer.</p>}
      {!demo && !blockAvailable && <p role="alert" className="text-amber-300 text-sm">Bloc « podcast » introuvable dans Accueil administrable. L’enregistrement est indisponible.</p>}
      {error && <p role="alert" className="font-inter text-sm text-red-300">{error}</p>}
      {message && <p role="status" className="font-inter text-sm text-green-300">{message}</p>}
      <input className="input-royal w-full" aria-label="Rechercher un podcast" placeholder="Rechercher un podcast…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="space-y-3">
        {visible.map((episode) => {
          const published = episode.status === 'published'
          return (
            <label key={episode.id} className={`card-cinematic flex items-center gap-4 p-4 ${published ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
              <input type="radio" name="podcast-accueil" value={episode.id} checked={draft === episode.id} disabled={!published || saving} onChange={() => { setDraft(episode.id); setMessage('') }} aria-label={`Sélectionner ${episode.title}`} />
              <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30 flex items-center justify-center">
                {episode.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={episode.cover_url} alt="" loading="lazy" className="h-full w-full object-contain" />
                ) : <Headphones className="h-7 w-7 text-gold/70" />}
              </div>
              <div className="min-w-0">
                <p className="font-cinzel text-sm text-pearl break-words">{episode.title}</p>
                <p className="mt-1 font-inter text-xs text-pearl/55">{published ? 'Publié' : 'Non publié'}{selected === episode.id ? ' · Actuellement à l’accueil' : ''}</p>
                {episode.description && <p className="mt-1 line-clamp-2 font-inter text-xs text-pearl/45">{episode.description}</p>}
              </div>
            </label>
          )
        })}
        {visible.length === 0 && <p className="font-inter text-sm text-pearl/60">Aucun podcast correspondant.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-gold-cinematic inline-flex items-center gap-2 px-5 py-2.5 disabled:opacity-40" disabled={!canSave} onClick={() => save(draft)}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Enregistrer le podcast de l’accueil
        </button>
        <button type="button" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-inter text-pearl/75 disabled:opacity-40" disabled={!canSave || selected === null} onClick={() => { setDraft(null); setMessage('') }}>
          Choix automatique
        </button>
      </div>
    </div>
  )
}
