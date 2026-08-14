'use client'
/**
 * PODCAST-7 — Feuille « Ajouter à une playlist » (membre). Ouverte depuis le menu ⋯ d'une
 * carte épisode. Affiche les playlists PERSONNELLES avec l'état « déjà présent », permet
 * d'ajouter/retirer sans quitter la page, et de créer une playlist (ajout automatique de
 * l'épisode). Réutilise les I/O PODCAST-3 (RLS owner-only) — aucune nouvelle table, aucun
 * contournement d'accès (une playlist n'altère jamais l'access_level). Sheet en bas sur
 * mobile, modale centrée sur desktop ; accessible (Échap, focus, aria).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Plus, Check, Loader2, ListMusic } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  fetchMyPlaylists, fetchMyPlaylistIdsContainingEpisode, fetchPlaylistItems,
  addItemToPlaylist, removeItemFromPlaylist, createPersonalPlaylist,
  buildAddToPlaylistRows, nextItemPosition, type AddToPlaylistRow,
} from '@/lib/podcast/playlists'

export interface AddToPlaylistSheetProps {
  episodeId: string
  episodeTitle?: string | null
  userId: string
  onClose: () => void
  /** Notifié après tout changement (pour rafraîchir « Mes playlists » dans la page). */
  onChanged?: () => void
}

export function AddToPlaylistSheet({ episodeId, episodeTitle, userId, onClose, onChanged }: AddToPlaylistSheetProps) {
  const [rows, setRows] = useState<AddToPlaylistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [error, setError] = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [mine, containing] = await Promise.all([
      fetchMyPlaylists(supabase),
      fetchMyPlaylistIdsContainingEpisode(supabase, episodeId),
    ])
    setRows(buildAddToPlaylistRows(mine, containing))
    setLoading(false)
  }, [episodeId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = async (row: AddToPlaylistRow) => {
    setBusyId(row.playlist.id); setError('')
    try {
      let ok: boolean
      if (row.contains) {
        ok = await removeItemFromPlaylist(supabase, row.playlist.id, episodeId)
      } else {
        const items = await fetchPlaylistItems(supabase, row.playlist.id)
        ok = await addItemToPlaylist(supabase, row.playlist.id, episodeId, nextItemPosition(items))
      }
      if (!ok) { setError("Action impossible. Vérifie ta connexion et réessaie."); return }
      setRows((prev) => prev.map((r) => (r.playlist.id === row.playlist.id ? { ...r, contains: !r.contains } : r)))
      onChanged?.()
    } catch {
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setBusyId(null)
    }
  }

  const createAndAdd = async () => {
    const title = newTitle.trim()
    if (!title) return
    setBusyId('__create__'); setError('')
    try {
      const pl = await createPersonalPlaylist(supabase, { userId, title })
      if (!pl) { setError('Création impossible. Réessaie.'); return }
      const added = await addItemToPlaylist(supabase, pl.id, episodeId, 0)
      setNewTitle(''); setCreating(false)
      await load()
      if (!added) setError("Playlist créée, mais l'ajout a échoué. Réessaie depuis la liste.")
      onChanged?.()
    } catch {
      setError('Une erreur est survenue. Réessaie.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center bg-black/70 sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="atp-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-gold/20 shadow-[0_-10px_60px_rgba(0,0,0,0.6)] sm:shadow-2xl"
        style={{ background: 'linear-gradient(180deg, #0b0713 0%, #050308 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/8 sticky top-0" style={{ background: 'rgba(11,7,19,0.95)' }}>
          <div className="min-w-0">
            <h2 id="atp-title" className="font-cinzel text-base font-bold text-pearl">Ajouter à une playlist</h2>
            {episodeTitle && <p className="text-[11px] text-pearl/45 font-inter truncate">{episodeTitle}</p>}
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-full flex items-center justify-center text-pearl/60 hover:text-pearl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          {loading ? (
            <div className="flex items-center gap-2 text-pearl/40 py-8 justify-center font-inter text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
          ) : (
            <>
              {rows.length === 0 && !creating && (
                <p className="text-pearl/45 font-inter text-sm text-center py-6 px-2">Tu n'as pas encore de playlist. Crée-en une pour y ranger cet enseignement.</p>
              )}

              <ul className="space-y-1">
                {rows.map((row) => {
                  const busy = busyId === row.playlist.id
                  return (
                    <li key={row.playlist.id}>
                      <button
                        onClick={() => toggle(row)} disabled={busy}
                        aria-pressed={row.contains}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
                      >
                        <span
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                          style={row.contains
                            ? { background: 'rgba(212,175,55,0.9)', color: '#1a1206' }
                            : { border: '1.5px solid rgba(245,230,216,0.3)' }}
                          aria-hidden
                        >
                          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : row.contains ? <Check className="w-3.5 h-3.5" /> : null}
                        </span>
                        <ListMusic className="w-4 h-4 text-gold/60 flex-shrink-0" aria-hidden />
                        <span className="flex-1 min-w-0 font-inter text-sm text-pearl/90 truncate">{row.playlist.title}</span>
                        <span className="text-[11px] text-pearl/40 font-inter flex-shrink-0">{row.contains ? 'Ajouté' : 'Ajouter'}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              {creating ? (
                <div className="mt-2 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <input
                    className="input-cinematic w-full text-sm" placeholder="Titre de la playlist (ex: À réécouter)"
                    value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createAndAdd() }}
                    autoFocus aria-label="Titre de la nouvelle playlist"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => { setCreating(false); setNewTitle('') }} className="text-xs text-pearl/50 hover:text-pearl px-3 py-1.5">Annuler</button>
                    <button onClick={createAndAdd} disabled={!newTitle.trim() || busyId === '__create__'} className="btn-gold-cinematic px-3 py-1.5 text-xs disabled:opacity-40 inline-flex items-center gap-1.5">
                      {busyId === '__create__' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Créer et ajouter
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setCreating(true)} className="mt-2 w-full flex items-center gap-2 p-2.5 rounded-lg text-left text-gold/80 hover:bg-white/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]">
                  <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ border: '1.5px dashed rgba(212,175,55,0.5)' }}><Plus className="w-3.5 h-3.5" /></span>
                  <span className="font-inter text-sm font-medium">Nouvelle playlist</span>
                </button>
              )}

              {error && <p role="alert" className="mt-3 text-xs font-inter text-danger px-1">{error}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
