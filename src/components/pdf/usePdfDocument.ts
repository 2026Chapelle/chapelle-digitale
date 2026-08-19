'use client'
/**
 * CITADELLE PDF-1 — Hook de chargement d'un document PDF (pdf.js).
 *
 * Gère le cycle de vie complet : chargement paresseux du moteur, ouverture du
 * document, ANNULATION propre (destroy de la loading task ET du document) au
 * démontage ou au changement de source, et rechargement manuel (« Réessayer »).
 *
 * Ne rend rien : renvoie un état sérialisable + le `PdfDocumentProxy` prêt à
 * être rendu page par page par `PdfPage`.
 */
import { useCallback, useEffect, useState } from 'react'
import { openPdfDocument, type PdfDocumentProxy } from './pdf-engine'

export type PdfDocStatus = 'loading' | 'ready' | 'error'

export interface PdfDocState {
  status: PdfDocStatus
  pdf: PdfDocumentProxy | null
  numPages: number
  error: string | null
}

export interface UsePdfDocumentResult extends PdfDocState {
  reload: () => void
}

export function usePdfDocument(src: string | null | undefined): UsePdfDocumentResult {
  const [state, setState] = useState<PdfDocState>({
    status: 'loading',
    pdf: null,
    numPages: 0,
    error: null,
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!src) {
      setState({ status: 'error', pdf: null, numPages: 0, error: 'Aucun document.' })
      return
    }

    let cancelled = false
    let loadingTask: { destroy: () => unknown } | null = null
    let doc: PdfDocumentProxy | null = null

    setState({ status: 'loading', pdf: null, numPages: 0, error: null })

    ;(async () => {
      try {
        const task = await openPdfDocument(src)
        loadingTask = task
        const pdf = await task.promise
        if (cancelled) {
          // Le composant a été démonté / la source a changé pendant le chargement.
          try {
            await pdf.destroy()
          } catch {
            /* ignore */
          }
          return
        }
        doc = pdf
        setState({ status: 'ready', pdf, numPages: pdf.numPages, error: null })
      } catch (err: unknown) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Chargement impossible.'
        setState({ status: 'error', pdf: null, numPages: 0, error: message })
      }
    })()

    return () => {
      cancelled = true
      // Détruit dans l'ordre : loading task puis document (libère le worker et
      // la mémoire — évite les fuites au changement de document / fermeture).
      try {
        loadingTask?.destroy()
      } catch {
        /* ignore */
      }
      try {
        doc?.destroy()
      } catch {
        /* ignore */
      }
    }
  }, [src, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { ...state, reload }
}
