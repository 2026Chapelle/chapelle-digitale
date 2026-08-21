'use client'
/**
 * CITADELLE LIVING BOOKS — LB-1 : extraction PARESSEUSE du texte du document
 * (pour la recherche in-document). N'extrait qu'à la DEMANDE (première ouverture
 * de la recherche), UNE seule fois, puis met en cache. Chaque page est libérée
 * (`cleanup`) après lecture pour éviter les fuites pdf.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PdfDocumentProxy } from './pdf-engine'
import type { PageText } from '@/lib/pdf/reader-search'

export interface UsePdfTextResult {
  pages: PageText[] | null
  loading: boolean
  extract: () => void
}

export function usePdfText(pdf: PdfDocumentProxy | null): UsePdfTextResult {
  const [pages, setPages] = useState<PageText[] | null>(null)
  const [loading, setLoading] = useState(false)
  const startedRef = useRef(false)

  // Réinitialise le cache si le document change.
  useEffect(() => {
    startedRef.current = false
    setPages(null)
    setLoading(false)
  }, [pdf])

  const extract = useCallback(() => {
    if (!pdf || startedRef.current) return
    startedRef.current = true
    setLoading(true)
    let cancelled = false
    ;(async () => {
      const out: PageText[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) return
        try {
          const page = await pdf.getPage(i)
          const tc = await page.getTextContent()
          out.push({ page: i, text: tc.items.map((it) => it.str).join(' ') })
          page.cleanup()
        } catch {
          out.push({ page: i, text: '' })
        }
      }
      if (!cancelled) {
        setPages(out)
        setLoading(false)
      }
    })()
    // Note : pas de cleanup annulant la boucle ici (extraction one-shot volontaire).
  }, [pdf])

  return { pages, loading, extract }
}
