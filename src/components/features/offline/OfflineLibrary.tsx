'use client'
/**
 * « Mes contenus hors ligne » — bibliothèque locale (PDF & audio).
 *
 * Fonctionne EN LIGNE et HORS LIGNE. Hors ligne : lit les Blobs locaux, ne tente
 * aucun appel réseau. En ligne : re-synchronise les droits (route authorize) pour
 * détecter révocation / mise à jour, SANS jamais dégrader l'accès sur une simple
 * erreur réseau. Isolation stricte : ne lit que les items du compte courant.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FileText, Headphones, Play, Trash2, RefreshCw, WifiOff, HardDrive,
  Download, AlertCircle, Clock, Loader2, ShieldOff, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/components/providers/AuthProvider'
import * as db from '@/lib/offline/db'
import {
  getLibrary,
  deleteContent,
  deleteAllForUser,
  downloadContent,
  syncItemAccess,
  type EnrichedItem,
} from '@/lib/offline/manager'
import { getWifiOnly, setWifiOnly, isConnectionTypeKnown } from '@/lib/offline/network'
import {
  deriveItemState,
  remainingValidityMs,
  formatBytes,
  STATE_LABELS,
  type OfflineItemState,
} from '@/lib/offline/policy'
import { OfflineAudioPlayer } from './OfflineAudioPlayer'
import { OfflinePdfViewer } from './OfflinePdfViewer'

const STATE_STYLE: Record<OfflineItemState, string> = {
  available: 'text-green-400 bg-green-500/10',
  update_available: 'text-sky-300 bg-sky-500/10',
  downloading: 'text-pearl/70 bg-white/[0.06]',
  queued: 'text-pearl/60 bg-white/[0.04]',
  interrupted: 'text-amber-300 bg-amber-500/10',
  failed: 'text-red-300 bg-red-500/10',
  expired: 'text-red-300 bg-red-500/10',
  missing: 'text-amber-300 bg-amber-500/10',
}

function daysLeft(ms: number): string {
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000))
  if (d <= 0) return 'expire aujourd’hui'
  return `expire dans ${d} j`
}

export function OfflineLibrary() {
  const { user, isDemo } = useAuth()
  const userId = user?.id || ''
  const [mounted, setMounted] = useState(false)
  const supported = mounted && db.isOfflineStorageSupported()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<EnrichedItem[]>([])
  const [online, setOnline] = useState(true)
  const [serverVersions, setServerVersions] = useState<Record<string, string>>({})
  const [revoked, setRevoked] = useState<Set<string>>(new Set())
  const [wifiOnly, setWifiOnlyState] = useState(false)
  const [usage, setUsage] = useState<{ usage: number | null; quota: number | null }>({ usage: null, quota: null })
  const [openPdf, setOpenPdf] = useState<EnrichedItem | null>(null)
  const [openAudio, setOpenAudio] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const nowMs = Date.now()

  const load = useCallback(async () => {
    if (!userId || !supported) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [lib, wifi, est] = await Promise.all([
      getLibrary(userId),
      getWifiOnly(userId),
      db.estimateStorage(),
    ])
    setItems(lib)
    setWifiOnlyState(wifi)
    setUsage(est)
    setLoading(false)
  }, [userId, supported])

  // Synchronisation des droits (en ligne seulement, best-effort).
  const syncAccess = useCallback(
    async (lib: EnrichedItem[]) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      const versions: Record<string, string> = {}
      const rev = new Set<string>()
      await Promise.all(
        lib
          .filter((it) => it.downloadStatus === 'completed')
          .map(async (it) => {
            const r = await syncItemAccess(userId, it.contentId)
            if (!r) return
            if (!r.authorized) rev.add(it.contentId)
            else if (r.accessVersion) versions[it.contentId] = r.accessVersion
          }),
      )
      setServerVersions(versions)
      setRevoked(rev)
    },
    [userId],
  )

  useEffect(() => {
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!loading && items.length && online) void syncAccess(items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, online])

  const stateOf = useCallback(
    (it: EnrichedItem): OfflineItemState =>
      deriveItemState(it, {
        nowMs,
        hasLocalFile: it.hasLocalFile,
        serverAccessVersion: serverVersions[it.contentId],
        accessRevoked: revoked.has(it.contentId),
      }),
    [nowMs, serverVersions, revoked],
  )

  const totalSize = useMemo(() => items.reduce((s, it) => s + (it.sizeBytes || 0), 0), [items])

  const handleDelete = async (it: EnrichedItem) => {
    setBusy(it.id)
    await deleteContent(userId, it.contentId)
    if (openAudio === it.contentId) setOpenAudio(null)
    setBusy(null)
    await load()
    toast.success('Supprimé de l’appareil.')
  }

  const handleUpdate = async (it: EnrichedItem) => {
    setBusy(it.id)
    try {
      await downloadContent({ userId, contentId: it.contentId, type: it.type, title: it.title, coverUrl: it.coverUrl })
      toast.success('Contenu mis à jour.')
      await load()
      await syncAccess(await getLibrary(userId))
    } catch (e: any) {
      toast.error(e?.message || 'Mise à jour impossible.')
    } finally {
      setBusy(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Supprimer TOUS les contenus téléchargés sur cet appareil ? Cette action est irréversible.')) return
    const n = await deleteAllForUser(userId)
    setOpenAudio(null)
    await load()
    toast.success(`${n} contenu(s) supprimé(s).`)
  }

  const toggleWifi = async () => {
    const next = !wifiOnly
    setWifiOnlyState(next)
    await setWifiOnly(userId, next)
  }

  // --- Rendus de garde ------------------------------------------------------

  // Rendu stable serveur / premier rendu client (évite le mismatch d'hydratation).
  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader eyebrow="Espace Membre" title="Mes contenus hors ligne" />
        <div className="mt-8 flex items-center justify-center py-16 text-pearl/40">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        </div>
      </div>
    )
  }

  if (!supported) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader eyebrow="Espace Membre" title="Mes contenus hors ligne" />
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p>Votre navigateur ne prend pas en charge le stockage hors ligne (IndexedDB). Essayez un navigateur récent (Chrome, Edge, Firefox).</p>
        </div>
      </div>
    )
  }

  if (isDemo) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader eyebrow="Espace Membre" title="Mes contenus hors ligne" />
        <p className="mt-6 text-sm text-pearl/50">Fonctionnalité indisponible en mode démonstration.</p>
      </div>
    )
  }

  const usedPct = usage.usage && usage.quota ? Math.min(100, Math.round((usage.usage / usage.quota) * 100)) : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        eyebrow="Espace Membre"
        title="Mes contenus hors ligne"
        description="Vos PDF et audios téléchargés, consultables sans connexion."
      />

      {/* Bandeau connexion */}
      {!online && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-pearl/70" role="status">
          <WifiOff className="h-4 w-4 text-amber-400" aria-hidden="true" />
          Mode hors connexion — seuls les contenus déjà téléchargés sont disponibles.
        </div>
      )}

      {/* Espace utilisé + réglages */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm text-pearl/70">
            <HardDrive className="h-4 w-4 text-gold" aria-hidden="true" />
            Espace utilisé
          </div>
          <p className="mt-2 font-cinzel text-lg text-pearl">{formatBytes(totalSize)}</p>
          <p className="text-[11px] text-pearl/40">
            {items.length} contenu(s)
            {usedPct !== null && ` · ${usedPct}% du quota navigateur (${formatBytes(usage.usage || 0)} / ${formatBytes(usage.quota || 0)})`}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm text-pearl/70">Télécharger uniquement en Wi-Fi</span>
            <input
              type="checkbox"
              checked={wifiOnly}
              onChange={toggleWifi}
              className="h-4 w-4 accent-gold"
              aria-label="Télécharger uniquement en Wi-Fi"
            />
          </label>
          <p className="mt-1.5 text-[11px] text-pearl/40">
            {isConnectionTypeKnown()
              ? 'Un avertissement s’affichera sur réseau mobile détecté.'
              : 'Note : votre navigateur ne révèle pas le type de connexion. Cette option affiche un rappel, sans garantie de détection Wi-Fi.'}
          </p>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Tout supprimer
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="mt-8">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-pearl/40">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] py-16 text-center">
            <Download className="mx-auto h-8 w-8 text-pearl/20" aria-hidden="true" />
            <p className="mt-3 text-sm text-pearl/50">Aucun contenu téléchargé.</p>
            <p className="mt-1 text-xs text-pearl/30">
              Depuis « Mes Ressources », téléchargez un PDF ou un audio pour le retrouver ici.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => {
              const st = stateOf(it)
              const Icon = it.type === 'pdf' ? FileText : Headphones
              const validity = remainingValidityMs(it, nowMs)
              const isBusy = busy === it.id
              const openable = st === 'available' || st === 'update_available'
              return (
                <li
                  key={it.id}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ background: it.type === 'pdf' ? '#22C55E18' : '#0EA5E918' }}
                    >
                      <Icon className="h-5 w-5" style={{ color: it.type === 'pdf' ? '#22C55E' : '#0EA5E9' }} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-inter text-sm font-medium text-pearl">{it.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-pearl/40">
                        <span className="uppercase">{it.type}</span>
                        <span>{formatBytes(it.sizeBytes)}</span>
                        {it.downloadedAt && <span>téléchargé le {new Date(it.downloadedAt).toLocaleDateString('fr-FR')}</span>}
                        {st === 'available' && validity > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" /> {daysLeft(validity)}
                          </span>
                        )}
                      </div>
                      <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATE_STYLE[st]}`}>
                        {st === 'available' && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                        {st === 'expired' && <ShieldOff className="h-3 w-3" aria-hidden="true" />}
                        {st === 'missing' && <AlertCircle className="h-3 w-3" aria-hidden="true" />}
                        {STATE_LABELS[st]}
                      </span>
                    </div>
                  </div>

                  {/* Lecteur audio inline */}
                  {openAudio === it.contentId && it.type === 'audio' && openable && (
                    <div className="mt-3">
                      <OfflineAudioPlayer userId={userId} item={it} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {openable && it.type === 'pdf' && (
                      <button
                        type="button"
                        onClick={() => setOpenPdf(it)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-pearl/80 transition-colors hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Ouvrir
                      </button>
                    )}
                    {openable && it.type === 'audio' && (
                      <button
                        type="button"
                        onClick={() => setOpenAudio(openAudio === it.contentId ? null : it.contentId)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-pearl/80 transition-colors hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden="true" /> {openAudio === it.contentId ? 'Masquer' : 'Écouter'}
                      </button>
                    )}
                    {(st === 'update_available' || st === 'missing' || st === 'interrupted' || st === 'failed') && online && (
                      <button
                        type="button"
                        onClick={() => handleUpdate(it)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                        {st === 'update_available' ? 'Mettre à jour' : 'Retélécharger'}
                      </button>
                    )}
                    {st === 'expired' && (
                      <span className="text-[11px] text-pearl/40">Connexion requise pour renouveler l’accès.</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(it)}
                      disabled={isBusy}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-pearl/40 transition-colors hover:bg-white/[0.06] hover:text-red-400 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                      aria-label={`Supprimer ${it.title} de l’appareil`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Supprimer
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {openPdf && <OfflinePdfViewer userId={userId} item={openPdf} onClose={() => setOpenPdf(null)} />}
    </div>
  )
}
