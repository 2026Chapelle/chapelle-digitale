'use client'
/**
 * PODCAST-3 — Sections Playlists de /podcast : « Playlists de La Citadelle » (officielles,
 * lecture seule) + « Mes playlists » (membre : créer / ajouter / retirer / supprimer).
 * Réutilise le player global via onPlayEpisode (verrou visiteur géré par la page).
 * Une playlist n'altère JAMAIS l'access_level d'un épisode.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, X, Play, Trash2, ChevronLeft, ChevronRight, ListMusic, Loader2, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react'
import { PodcastCover } from './PodcastCover'
import { PremiumBadge } from './PremiumBadge'
import { supabase } from '@/lib/supabase'
import type { VoixEpisode } from '@/lib/podcast/sections'
import {
  fetchOfficialPlaylists, fetchMyPlaylists, fetchPlaylistItems, createPersonalPlaylist,
  addItemToPlaylist, removeItemFromPlaylist, deletePersonalPlaylist, reorderMyPlaylistItems,
  resolvePlaylistCover, nextItemPosition, totalDurationSeconds, durationLabel,
  type Playlist, type PlaylistItem,
} from '@/lib/podcast/playlists'

/** PODCAST-4 : contexte analytics transmis lors d'une lecture depuis une playlist. */
export interface PlaylistPlayContext { sourceContext?: string; playlistId?: string }

export function PlaylistsSections({
  episodes, userId, canPlay, onPlayEpisode, refreshSignal,
}: {
  episodes: VoixEpisode[]
  userId: string | null
  canPlay: boolean
  onPlayEpisode: (ep: VoixEpisode, ctx?: PlaylistPlayContext) => void
  /** PODCAST-7 : incrémenté quand un épisode est ajouté ailleurs (menu ⋯) → recharge « Mes playlists ». */
  refreshSignal?: number
}) {
  const [official, setOfficial] = useState<Playlist[]>([])
  const [mine, setMine] = useState<Playlist[]>([])
  const [detail, setDetail] = useState<Playlist | null>(null)
  const [creating, setCreating] = useState(false)

  const byId = new Map(episodes.map((e) => [e.id, e]))
  const firstCover = (items: PlaylistItem[]) => byId.get(items[0]?.podcast_id)?.cover ?? null

  const reloadMine = useCallback(async () => { if (userId) setMine(await fetchMyPlaylists(supabase)) }, [userId])
  useEffect(() => { (async () => setOfficial(await fetchOfficialPlaylists(supabase)))() }, [])
  useEffect(() => { if (userId) reloadMine(); else setMine([]) }, [userId, reloadMine])
  // Rafraîchit après un ajout depuis le menu ⋯ (hors de cette section).
  useEffect(() => { if (refreshSignal && userId) reloadMine() }, [refreshSignal, userId, reloadMine])

  return (
    <>
      {official.length > 0 && (
        <PlaylistRail title="Playlists de La Citadelle" eyebrow="Sélections officielles"
          playlists={official} episodesById={byId} onOpen={setDetail} />
      )}

      {canPlay && userId && (
        <section className="mb-10 md:mb-14" aria-label="Mes playlists">
          <div className="flex items-end justify-between mb-4 px-4 md:px-0">
            <div>
              <p className="section-label-dark mb-1">Ma bibliothèque</p>
              <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">Mes playlists</h2>
            </div>
          </div>
          {mine.length === 0 ? (
            /* État vide — invite claire à créer une première playlist. */
            <div className="card-cinematic px-4 md:px-6 py-8 md:py-10 text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}>
                <ListMusic className="w-6 h-6 text-gold" aria-hidden />
              </div>
              <p className="font-cinzel text-lg text-pearl mb-1">Tu n'as pas encore créé de playlist</p>
              <p className="font-inter text-sm mb-5 max-w-md mx-auto" style={{ color: 'rgba(245,230,216,0.5)' }}>
                Regroupe ici les enseignements que tu veux retrouver facilement.
              </p>
              <button onClick={() => setCreating(true)} className="btn-gold-cinematic inline-flex items-center gap-2 px-5 py-2.5 text-sm">
                <Plus className="w-4 h-4" /> Créer ma première playlist
              </button>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto px-4 md:px-0 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setCreating(true)}
                className="w-40 sm:w-44 md:w-48 flex-shrink-0 aspect-square rounded-xl flex flex-col items-center justify-center gap-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
                style={{ background: 'rgba(212,175,55,0.06)', border: '1px dashed rgba(212,175,55,0.4)' }}>
                <Plus className="w-8 h-8 text-gold/70" />
                <span className="font-inter text-sm text-gold/80 font-medium">Créer une playlist</span>
              </button>
              {mine.map((p) => (
                <PlaylistCard key={p.id} p={p} cover={resolvePlaylistCover(p.cover_url, null)} onOpen={() => setDetail(p)} />
              ))}
            </div>
          )}
        </section>
      )}

      {creating && (
        <CreateModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reloadMine() }} userId={userId!} />
      )}
      {detail && (
        <DetailModal
          playlist={detail} episodes={episodes} canPlay={canPlay}
          isOwner={!!userId && detail.playlist_type === 'personal' && detail.owner_user_id === userId}
          onClose={() => setDetail(null)}
          onPlayEpisode={onPlayEpisode}
          onChanged={() => reloadMine()}
          firstCover={firstCover}
        />
      )}
    </>
  )
}

// ── Rail générique de playlists ──────────────────────────────────────────────
function PlaylistRail({ title, eyebrow, playlists, episodesById, onOpen }: {
  title: string; eyebrow: string; playlists: Playlist[]; episodesById: Map<string, VoixEpisode>; onOpen: (p: Playlist) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const nudge = (d: -1 | 1) => scroller.current?.scrollBy({ left: d * Math.min(scroller.current.clientWidth * 0.8, 640), behavior: 'smooth' })
  return (
    <section className="mb-10 md:mb-14" aria-label={title}>
      <div className="flex items-end justify-between mb-4 px-4 md:px-0">
        <div><p className="section-label-dark mb-1">{eyebrow}</p><h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl">{title}</h2></div>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => nudge(-1)} aria-label="Précédent" className="w-9 h-9 rounded-full flex items-center justify-center text-pearl/60 hover:text-gold" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => nudge(1)} aria-label="Suivant" className="w-9 h-9 rounded-full flex items-center justify-center text-pearl/60 hover:text-gold" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div ref={scroller} className="flex gap-4 overflow-x-auto px-4 md:px-0 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {playlists.map((p) => <PlaylistCard key={p.id} p={p} cover={resolvePlaylistCover(p.cover_url, null)} onOpen={() => onOpen(p)} official />)}
      </div>
    </section>
  )
}

function PlaylistCard({ p, cover, onOpen, official }: { p: Playlist; cover: string | null; onOpen: () => void; official?: boolean }) {
  return (
    <button onClick={onOpen} className="group w-44 sm:w-48 md:w-52 flex-shrink-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] rounded-xl" aria-label={`Ouvrir ${p.title}`}>
      <div className="relative">
        <PodcastCover src={cover} alt={p.title} label={p.title} sizes="208px" />
        <span className="absolute top-2 left-2 z-[3] inline-flex items-center gap-1 text-[9px] font-inter font-bold tracking-widest uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(6,6,10,0.6)', color: '#F5E6A7' }}>
          <ListMusic className="w-3 h-3" />{official ? 'Citadelle' : 'Playlist'}
        </span>
      </div>
      <h3 className="mt-2.5 font-cinzel text-base font-bold text-pearl leading-snug line-clamp-2 group-hover:text-cinematic-gold transition-colors">{p.title}</h3>
      {p.description && <p className="mt-0.5 text-[11px] font-inter line-clamp-1" style={{ color: 'rgba(245,230,216,0.45)' }}>{p.description}</p>}
    </button>
  )
}

// ── Modale création (membre) ─────────────────────────────────────────────────
function CreateModal({ onClose, onCreated, userId }: { onClose: () => void; onCreated: () => void; userId: string }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  async function submit() {
    if (!title.trim()) return
    setState('loading')
    const pl = await createPersonalPlaylist(supabase, { userId, title: title.trim(), description: description.trim() || null })
    if (pl) onCreated(); else setState('error')
  }
  return (
    <div className="admin-modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div className="admin-modal-box w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-cinzel text-lg font-bold text-pearl">Nouvelle playlist</h2>
          <button onClick={onClose} className="text-pearl/40 hover:text-pearl"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <input className="input-royal" placeholder="Titre (ex: À réécouter)" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <textarea rows={2} className="input-royal resize-none" placeholder="Description (facultatif)" value={description} onChange={(e) => setDescription(e.target.value)} />
          {state === 'error' && <p className="text-danger text-sm font-inter">Échec de la création. Réessayez.</p>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-pearl/50 hover:text-pearl">Annuler</button>
          <button onClick={submit} disabled={!title.trim() || state === 'loading'} className="btn-gold-cinematic px-5 py-2.5 text-sm disabled:opacity-50">
            {state === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> …</> : <><Plus className="w-4 h-4" /> Créer</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Vue détail (lecture + gestion si owner) ──────────────────────────────────
function DetailModal({ playlist, episodes, canPlay, isOwner, onClose, onPlayEpisode, onChanged, firstCover }: {
  playlist: Playlist; episodes: VoixEpisode[]; canPlay: boolean; isOwner: boolean
  onClose: () => void; onPlayEpisode: (ep: VoixEpisode, ctx?: PlaylistPlayContext) => void; onChanged: () => void; firstCover: (items: PlaylistItem[]) => string | null
}) {
  const byId = new Map(episodes.map((e) => [e.id, e]))
  // PODCAST-4 : origine de la lecture pour l'analytics (savoir quelle playlist génère l'écoute).
  const playCtx: PlaylistPlayContext = {
    sourceContext: playlist.playlist_type === 'official' ? 'official_playlist' : 'personal_playlist',
    playlistId: playlist.id,
  }
  const [items, setItems] = useState<PlaylistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addId, setAddId] = useState('')
  const reload = useCallback(async () => { setLoading(true); setItems(await fetchPlaylistItems(supabase, playlist.id)); setLoading(false) }, [playlist.id])
  useEffect(() => { reload() }, [reload])

  const eps = items.map((it) => byId.get(it.podcast_id)).filter(Boolean) as VoixEpisode[]
  const cover = resolvePlaylistCover(playlist.cover_url, firstCover(items))
  const totalLabel = durationLabel(totalDurationSeconds(eps.map((e) => e.duration)))

  async function add() {
    if (!addId) return
    await addItemToPlaylist(supabase, playlist.id, addId, nextItemPosition(items))
    setAddId(''); reload()
  }
  async function remove(podcastId: string) { await removeItemFromPlaylist(supabase, playlist.id, podcastId); reload() }
  async function move(podcastId: string, dir: -1 | 1) {
    const ordered = items.map((i) => i.podcast_id)
    const idx = ordered.indexOf(podcastId)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= ordered.length) return
    ;[ordered[idx], ordered[j]] = [ordered[j], ordered[idx]]
    await reorderMyPlaylistItems(supabase, playlist.id, ordered)
    reload()
  }
  async function del() {
    if (!confirm(`Supprimer la playlist « ${playlist.title} » ? (les épisodes ne sont pas supprimés)`)) return
    if (await deletePersonalPlaylist(supabase, playlist.id)) { onChanged(); onClose() }
  }

  return (
    <div className="admin-modal-overlay flex items-center justify-center p-4" onClick={onClose}>
      <div className="admin-modal-box w-full max-w-2xl max-h-[88vh] overflow-y-auto p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 p-6" style={{ background: 'linear-gradient(135deg, rgba(30,20,55,0.6), rgba(10,10,18,0.6))' }}>
          <div className="w-28 h-28 md:w-36 md:h-36 flex-shrink-0"><PodcastCover src={cover} alt={playlist.title} label={playlist.title} sizes="144px" /></div>
          <div className="flex-1 min-w-0 flex flex-col justify-end">
            <p className="section-label-dark mb-1">{playlist.playlist_type === 'official' ? 'Playlist Citadelle' : 'Ma playlist'}</p>
            <h2 className="font-cinzel text-xl md:text-2xl font-bold text-pearl leading-tight">{playlist.title}</h2>
            {playlist.description && <p className="mt-1 text-sm font-inter" style={{ color: 'rgba(245,230,216,0.5)' }}>{playlist.description}</p>}
            <p className="mt-2 text-[11px] text-pearl/40 font-inter">
              {playlist.playlist_type === 'official' ? 'Officielle' : 'Personnelle'} · {items.length} épisode{items.length > 1 ? 's' : ''}{totalLabel ? ` · ${totalLabel}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-pearl/40 hover:text-pearl self-start"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 pt-2">
          {isOwner && (
            <div className="flex gap-2 mb-4">
              <select className="input-royal flex-1" value={addId} onChange={(e) => setAddId(e.target.value)}>
                <option value="">Ajouter un épisode…</option>
                {episodes.filter((e) => !items.some((i) => i.podcast_id === e.id)).map((e) => <option key={e.id} value={e.id}>{e.title}{e.serie ? ` · ${e.serie}` : ''}</option>)}
              </select>
              <button onClick={add} disabled={!addId} className="btn-gold-cinematic px-3 py-2 text-xs disabled:opacity-40"><Plus className="w-4 h-4" /> Ajouter</button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-pearl/40 py-8 font-inter text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
          ) : eps.length === 0 ? (
            <div className="text-center py-10">
              <ListMusic className="w-8 h-8 text-pearl/25 mx-auto mb-3" aria-hidden />
              <p className="text-pearl/50 font-inter text-sm">Cette playlist ne contient encore aucun épisode.</p>
              {isOwner && <p className="text-pearl/35 font-inter text-xs mt-1">Ajoute des épisodes avec le sélecteur ci-dessus ou le menu ⋯ d'un épisode.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {eps.map((ep, i) => {
                const premium = ep.accessLevel === 'premium'
                return (
                  <div key={ep.id} className="flex items-center gap-3 p-2 rounded-lg group" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-pearl/30 text-xs w-5 text-center">{i + 1}</span>
                    <button onClick={() => onPlayEpisode(ep, playCtx)} className="relative w-12 h-12 flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] rounded-lg" aria-label={`Écouter ${ep.title}`}>
                      <PodcastCover src={ep.cover} alt={ep.title} label={ep.serie || ep.title} sizes="48px" rounded="rounded-lg" />
                      <span className="absolute inset-0 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(6,6,10,0.45)' }}><Play className="w-4 h-4 text-gold" fill="currentColor" /></span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {ep.serie && <span className="text-[10px] font-inter font-bold tracking-widest uppercase text-gold/70 truncate">{ep.serie}</span>}
                        {premium && <PremiumBadge className="flex-shrink-0" />}
                      </div>
                      <p className="font-inter text-sm text-pearl/85 truncate">{ep.title}</p>
                    </div>
                    {isOwner && (
                      /* Toujours visibles (tactile mobile — pas de survol requis). */
                      <div className="flex items-center flex-shrink-0">
                        <button onClick={() => move(ep.id, -1)} disabled={i === 0} aria-label={`Monter ${ep.title}`} title="Monter" className="text-pearl/40 hover:text-gold disabled:opacity-20 p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] rounded"><ArrowUp className="w-4 h-4" /></button>
                        <button onClick={() => move(ep.id, 1)} disabled={i === eps.length - 1} aria-label={`Descendre ${ep.title}`} title="Descendre" className="text-pearl/40 hover:text-gold disabled:opacity-20 p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] rounded"><ArrowDown className="w-4 h-4" /></button>
                        <button onClick={() => remove(ep.id)} aria-label={`Retirer ${ep.title} de la playlist`} title="Retirer de la playlist" className="text-pearl/40 hover:text-danger p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {isOwner && (
            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
              {canPlay && eps.length > 0 && (
                <button onClick={() => onPlayEpisode(eps[0], playCtx)} className="btn-gold-cinematic px-4 py-2 text-xs"><RotateCcw className="w-4 h-4" /> Lire depuis le début</button>
              )}
              <button onClick={del} className="ml-auto text-xs font-inter text-danger/80 hover:text-danger inline-flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Supprimer la playlist</button>
            </div>
          )}
          {!isOwner && canPlay && eps.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/5">
              <button onClick={() => onPlayEpisode(eps[0], playCtx)} className="btn-gold-cinematic px-4 py-2 text-xs"><Play className="w-4 h-4" fill="currentColor" /> Lire depuis le début</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
