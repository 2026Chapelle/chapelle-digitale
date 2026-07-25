'use client'
/**
 * Visionneuse PDF LOCALE (Blob hors-ligne) en modale.
 *
 * Rend le PDF depuis une ObjectURL (visionneuse native du navigateur via
 * <iframe>). Révoque l'URL à la fermeture. Gère l'absence de blob local.
 * Note honnête : le navigateur expose ses propres commandes (impression /
 * téléchargement) — on ne prétend pas empêcher la copie côté client.
 */
import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertCircle, ExternalLink } from 'lucide-react'
import { openLocalObjectUrl } from '@/lib/offline/manager'
import type { OfflineItem } from '@/lib/offline/policy'

interface Props {
  userId: string
  item: OfflineItem
  onClose: () => void
}

export function OfflinePdfViewer({ userId, item, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let created: string | null = null
    ;(async () => {
      const objectUrl = await openLocalObjectUrl(userId, item.contentId)
      if (!active) {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        return
      }
      if (!objectUrl) {
        setError('Fichier local manquant. Reconnecte-toi pour le retélécharger.')
        return
      }
      created = objectUrl
      setUrl(objectUrl)
    })()
    return () => {
      active = false
      if (created) URL.revokeObjectURL(created)
    }
  }, [userId, item.contentId])

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex h-[90vh] w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-abyss shadow-2xl"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <Dialog.Title className="truncate pr-4 font-cinzel text-sm text-pearl">
              {item.title}
            </Dialog.Title>
            <div className="flex items-center gap-1">
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-pearl/50 transition-colors hover:bg-white/[0.06] hover:text-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                  aria-label="Ouvrir dans un nouvel onglet"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
              <Dialog.Close
                className="rounded-lg p-2 text-pearl/50 transition-colors hover:bg-white/[0.06] hover:text-pearl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-neutral-900">
            {error ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-amber-300">
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-6 w-6" aria-hidden="true" />
                  {error}
                </div>
              </div>
            ) : url ? (
              <iframe title={item.title} src={url} className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-pearl/40">
                Ouverture du document…
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
