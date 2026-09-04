'use client'
/**
 * Bouton « Télécharger / Disponible hors ligne » réutilisable (PDF & audio).
 *
 * Ne s'affiche QUE pour un membre connecté (identité `useAuth`) et un type
 * téléchargeable. La décision finale de droit reste SERVEUR (route authorize) :
 * ce bouton déclenche le flux et reflète l'état local, sans jamais présumer d'un
 * accès sur la seule base du cache.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Check, Loader2, Trash2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/components/providers/AuthProvider'
import {
  downloadContent,
  deleteContent,
  OfflineError,
} from '@/lib/offline/manager'
import * as db from '@/lib/offline/db'
import { makeItemId, type OfflineContentType, type OfflineDownloadStatus } from '@/lib/offline/policy'
import { getWifiOnly, isLikelyMetered } from '@/lib/offline/network'

interface Props {
  contentId: string
  type: OfflineContentType
  title: string
  coverUrl?: string
  className?: string
}

type LocalState = 'idle' | 'checking' | 'downloading' | 'available' | 'failed'

export function OfflineDownloadButton({ contentId, type, title, coverUrl, className }: Props) {
  const { user, isDemo } = useAuth()
  const userId = user?.id || ''
  const [mounted, setMounted] = useState(false)
  const [state, setState] = useState<LocalState>('checking')
  const [percent, setPercent] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => setMounted(true), [])

  const refresh = useCallback(async () => {
    if (!userId || !db.isOfflineStorageSupported()) {
      setState('idle')
      return
    }
    try {
      const item = await db.getItem(makeItemId(userId, contentId))
      const status = item?.downloadStatus as OfflineDownloadStatus | undefined
      if (status === 'completed') setState('available')
      else if (status === 'downloading') setState('downloading')
      else if (status === 'failed') setState('failed')
      else setState('idle')
    } catch {
      setState('idle')
    }
  }, [userId, contentId])

  useEffect(() => {
    refresh()
    return () => abortRef.current?.abort()
  }, [refresh])

  const start = async () => {
    if (!userId) {
      toast.error('Connexion requise pour télécharger.')
      return
    }
    // Préférence Wi-Fi (avertissement honnête : la détection réseau n'est pas fiable).
    if ((await getWifiOnly(userId)) && isLikelyMetered()) {
      const proceed = window.confirm(
        'Vous avez activé « Télécharger uniquement en Wi-Fi » et votre connexion semble être un réseau mobile. Télécharger quand même ?',
      )
      if (!proceed) return
    }
    setState('downloading')
    setPercent(0)
    const ac = new AbortController()
    abortRef.current = ac
    try {
      await downloadContent({
        userId,
        contentId,
        type,
        title,
        coverUrl,
        signal: ac.signal,
        onProgress: (p) => setPercent(p),
      })
      setState('available')
      toast.success('Disponible hors ligne.')
    } catch (e) {
      const err = e as OfflineError
      if (err?.code === 'aborted') {
        setState('idle')
        return
      }
      setState('failed')
      toast.error(err?.message || 'Échec du téléchargement.')
    } finally {
      abortRef.current = null
    }
  }

  const remove = async () => {
    await deleteContent(userId, contentId)
    setState('idle')
    setPercent(0)
    toast.success('Retiré de l’appareil.')
  }

  // Rendu identique serveur / premier rendu client (évite le mismatch d'hydratation).
  if (!mounted) return null
  // En démo, IndexedDB reste utilisable mais l'API serveur renvoie 401 : on masque.
  if (isDemo || !db.isOfflineStorageSupported()) return null

  const base =
    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-inter font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ' +
    (className || '')

  if (state === 'downloading') {
    return (
      <button
        type="button"
        onClick={() => abortRef.current?.abort()}
        className={base + ' bg-white/[0.06] text-pearl/80 hover:bg-white/[0.1]'}
        aria-label={`Téléchargement de ${title}, ${percent} %. Cliquer pour annuler.`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span aria-live="polite">Téléchargement… {percent}%</span>
      </button>
    )
  }

  if (state === 'available') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className={base + ' bg-green-500/10 text-green-400 cursor-default'}
          role="status"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Disponible hors ligne
        </span>
        <button
          type="button"
          onClick={remove}
          className="rounded-lg p-1.5 text-pearl/40 transition-colors hover:bg-white/[0.06] hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          aria-label={`Supprimer ${title} de l’appareil`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={state === 'checking'}
      className={base + ' bg-white/[0.06] text-pearl/80 hover:bg-white/[0.1] disabled:opacity-50'}
      aria-label={`Télécharger ${title} pour le hors-ligne`}
    >
      {state === 'failed' ? (
        <AlertCircle className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
      ) : (
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {state === 'failed' ? 'Réessayer le téléchargement hors ligne' : 'Télécharger hors ligne'}
    </button>
  )
}
