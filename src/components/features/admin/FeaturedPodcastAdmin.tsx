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

  if (loading) return (
    <div className="card-cinematic flex items-center justify-center gap-3 px-6 py-14 text-pearl/60 font-inter text-sm">
      <Loader2 className="h-5 w-5 animate-spin text-gold/80" />
      Chargement des podcasts…
    </div>
  )

  const visible = episodes.filter((episode) => episode.title?.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr')))
  const canSave = !demo && blockAvailable && !saving && draft !== selected

  return (
    <div className="space-y-6">
      <div className="card-cinematic flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
          <Headphones className="h-5 w-5 text-gold" />
        </div>
        <div className="min-w-0">
          <p className="font-cinzel text-sm tracking-wide text-gold">Aujourd’hui sur Citadelle</p>
          <p className="mt-1.5 font-inter text-sm leading-relaxed text-pearl/65">
            Choisissez le podcast à afficher dans « Aujourd’hui sur Citadelle ». Un seul épisode peut être sélectionné.
            Sans sélection, le dernier podcast publié sera utilisé automatiquement.
          </p>
        </div>
      </div>

      {(demo || (!demo && !blockAvailable) || error || message) && (
        <div className="space-y-2">
          {demo && <p role="alert" className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-300">Mode démo : Supabase est requis pour enregistrer.</p>}
          {!demo && !blockAvailable && <p role="alert" className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-300">Bloc « podcast » introuvable dans Accueil administrable. L’enregistrement est indisponible.</p>}
          {error && <p role="alert" className="rounded-xl border border-red-300/30 bg-red-300/10 px-4 py-3 font-inter text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-green-300/30 bg-green-300/10 px-4 py-3 font-inter text-sm text-green-300">{message}</p>}
        </div>
      )}

      <input className="input-royal w-full" aria-label="Rechercher un podcast" placeholder="Rechercher un podcast…" value={query} onChange={(event) => setQuery(event.target.value)} />

      <div className="space-y-3">
        {visible.map((episode) => {
          const published = episode.status === 'published'
          const isDraft = draft === episode.id
          const isCurrent = selected === episode.id
          return (
            <label
              key={episode.id}
              className={`card-cinematic relative flex flex-col gap-4 overflow-hidden p-4 transition-all duration-200 sm:flex-row sm:items-center ${
                published ? 'cursor-pointer hover:border-gold/40' : 'cursor-not-allowed opacity-50'
              } ${isDraft ? 'border border-gold/70 bg-gold/5 shadow-lg shadow-gold/10 ring-1 ring-gold/40' : 'border border-white/10'}`}
            >
              {isDraft && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-gold" />}
              <div className="flex items-center gap-4 sm:contents">
                <input type="radio" name="podcast-accueil" value={episode.id} checked={isDraft} disabled={!published || saving} onChange={() => { setDraft(episode.id); setMessage('') }} aria-label={`Sélectionner ${episode.title}`} className="h-4 w-4 flex-shrink-0 accent-gold" />
                <div className="flex aspect-square h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30 sm:h-24 sm:w-24">
                  {episode.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={episode.cover_url} alt="" loading="lazy" className="h-full w-full object-contain" />
                  ) : <Headphones className="h-8 w-8 text-gold/70" />}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-inter text-[11px] font-medium ${
                    published ? 'border-green-300/30 bg-green-300/10 text-green-300' : 'border-white/15 bg-white/5 text-pearl/55'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-green-300' : 'bg-pearl/40'}`} />
                    {published ? 'Publié' : 'Non publié'}
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 font-inter text-[11px] font-medium text-gold">
                      <Check className="h-3 w-3" />
                      Actuellement à l’accueil
                    </span>
                  )}
                </div>
                <p className="font-cinzel text-sm leading-snug text-pearl break-words">{episode.title}</p>
                {episode.description && <p className="mt-1.5 line-clamp-2 font-inter text-xs leading-relaxed text-pearl/45">{episode.description}</p>}
              </div>
            </label>
          )
        })}
        {visible.length === 0 && <p className="card-cinematic px-4 py-8 text-center font-inter text-sm text-pearl/60">Aucun podcast correspondant.</p>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="button" className="btn-gold-cinematic inline-flex items-center justify-center gap-2 px-5 py-2.5 disabled:opacity-40" disabled={!canSave} onClick={() => save(draft)}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Enregistrer le podcast de l’accueil
        </button>
        <button type="button" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-inter text-pearl/75 transition-colors hover:border-gold/40 hover:text-pearl disabled:opacity-40" disabled={demo || !blockAvailable || saving || draft === null} onClick={() => { setDraft(null); setMessage('') }}>
          Choix automatique
        </button>
      </div>
    </div>
  )
}
