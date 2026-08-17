'use client'
/**
 * PODCAST-1 — « Tous les épisodes » : recherche + filtre émission + filtre accès,
 * grille compacte premium avec miniature. Émission sélectionnable depuis le rail ÉMISSIONS.
 */
import { useMemo, useState } from 'react'
import { Search, Filter, Play, Pause, Clock, X } from 'lucide-react'
import { PodcastCover } from './PodcastCover'
import { PremiumBadge } from './PremiumBadge'
import { PlaylistMenuButton } from './PlaylistMenuButton'
import type { RailEpisode } from './EpisodeRail'

export interface CatalogEpisode extends RailEpisode {
  description?: string
  date?: string
}

const ACCESS_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'public', label: 'Public' },
  { id: 'member', label: 'Membre' },
  { id: 'premium', label: 'Premium' },
] as const

export function AllEpisodesSection({
  episodes,
  series,
  selectedSerie,
  onSelectedSerieChange,
  onPlay,
  isPlaying,
  onAddToPlaylist,
}: {
  episodes: CatalogEpisode[]
  series: string[]
  selectedSerie: string
  onSelectedSerieChange: (s: string) => void
  onPlay: (ep: CatalogEpisode) => void
  isPlaying: (id: string) => boolean
  /** PODCAST-7 : si fourni (membre connecté), affiche le menu ⋯ « Ajouter à une playlist ». */
  onAddToPlaylist?: (episodeId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [access, setAccess] = useState<'all' | 'public' | 'member' | 'premium'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return episodes.filter((ep) => {
      const matchSerie = selectedSerie === 'all' || (ep.serie || '') === selectedSerie
      const matchAccess = access === 'all' || (ep.accessLevel || 'member') === access
      const matchQuery = !q || ep.title.toLowerCase().includes(q) || (ep.serie || '').toLowerCase().includes(q)
      return matchSerie && matchAccess && matchQuery
    })
  }, [episodes, query, access, selectedSerie])

  return (
    <section className="px-4 md:px-0" aria-label="Tous les épisodes">
      <div className="mb-5">
        <p className="section-label-dark mb-1">Catalogue</p>
        <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">Tous les épisodes</h2>
      </div>

      {/* Recherche + compteur */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(245,230,216,0.3)' }} />
          <input
            type="text"
            placeholder="Rechercher un épisode ou une émission…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-cinematic pl-11"
            aria-label="Rechercher"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-inter px-4 py-2 rounded-xl whitespace-nowrap"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(245,230,216,0.5)' }}>
          <Filter className="w-3.5 h-3.5" />
          {filtered.length} épisode{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtres émission + accès */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterChip active={selectedSerie === 'all'} onClick={() => onSelectedSerieChange('all')} label="Toutes les émissions" />
        {series.map((s) => (
          <FilterChip key={s} active={selectedSerie === s} onClick={() => onSelectedSerieChange(s)} label={s}
            onClear={selectedSerie === s ? () => onSelectedSerieChange('all') : undefined} />
        ))}
        <span className="w-px self-stretch mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} aria-hidden />
        {ACCESS_FILTERS.map((a) => (
          <FilterChip key={a.id} active={access === a.id} onClick={() => setAccess(a.id)} label={a.label} subtle />
        ))}
      </div>

      {/* Grille compacte */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((ep) => {
            const playing = isPlaying(ep.id)
            const premium = ep.accessLevel === 'premium'
            return (
              <div key={ep.id} className="relative">
                <button
                  type="button"
                  onClick={() => onPlay(ep)}
                  aria-label={`Écouter ${ep.title}`}
                  className={`group card-cinematic p-3 flex items-center gap-3 text-left w-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] ${onAddToPlaylist ? 'pr-12' : ''}`}
                  style={playing ? { borderColor: 'rgba(212,175,55,0.4)' } : undefined}
                >
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <PodcastCover src={ep.cover} alt={ep.title} label={ep.serie || ep.title} sizes="64px" rounded="rounded-lg" />
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(6,6,10,0.45)' }} aria-hidden>
                      {playing ? <Pause className="w-5 h-5 text-gold" /> : <Play className="w-5 h-5 text-gold" fill="currentColor" />}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {ep.serie && <span className="text-[10px] font-inter font-bold tracking-widest uppercase text-gold/70 truncate">{ep.serie}</span>}
                      {premium && <PremiumBadge className="flex-shrink-0" />}
                    </div>
                    <h3 className="font-inter text-sm font-semibold text-pearl leading-snug line-clamp-2 mt-0.5">{ep.title}</h3>
                    {ep.description && (
                      <p className="font-inter text-[11px] leading-snug line-clamp-1 mt-0.5" style={{ color: 'rgba(245,230,216,0.5)' }}>
                        {ep.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: 'rgba(245,230,216,0.4)' }}>
                      {ep.duration && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{ep.duration}</span>}
                      {ep.date && <span>{ep.date}</span>}
                    </div>
                  </div>
                </button>
                {onAddToPlaylist && (
                  <PlaylistMenuButton onClick={() => onAddToPlaylist(ep.id)} title={ep.title} className="absolute top-1/2 -translate-y-1/2 right-3" />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card-cinematic text-center py-16">
          <div className="text-4xl mb-3">🎙️</div>
          <p className="font-cinzel text-lg text-white mb-1">
            {query || selectedSerie !== 'all' || access !== 'all' ? 'Aucun épisode ne correspond' : 'Aucun épisode pour le moment'}
          </p>
          <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.45)' }}>
            {query ? `Pas de résultat pour « ${query} »` : 'Les premiers épisodes arrivent bientôt.'}
          </p>
        </div>
      )}
    </section>
  )
}

function FilterChip({
  active, onClick, label, subtle, onClear,
}: { active: boolean; onClick: () => void; label: string; subtle?: boolean; onClear?: () => void }) {
  const chipStyle = active
    ? { background: 'linear-gradient(135deg, #D4AF37, #D4AF37AA)', color: '#1a1206', boxShadow: '0 4px 16px rgba(212,175,55,0.25)' }
    : { background: 'rgba(255,255,255,0.04)', color: subtle ? 'rgba(245,230,216,0.5)' : 'rgba(245,230,216,0.65)', border: '1px solid rgba(255,255,255,0.08)' }

  // Chip filtrable actif : conteneur avec deux vrais boutons (plus de <span onClick>
  // imbriqué dans un <button>) → l'affordance « retirer » devient accessible au clavier.
  if (active && onClear) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-inter font-semibold transition-all"
        style={chipStyle}
      >
        <button
          type="button"
          onClick={onClick}
          className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
        >
          {label}
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label={`Retirer le filtre ${label}`}
          className="inline-flex items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
        >
          <X className="w-3 h-3" aria-hidden />
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-inter font-semibold transition-all"
      style={chipStyle}
    >
      {label}
    </button>
  )
}
