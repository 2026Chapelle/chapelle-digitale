'use client'
/**
 * CITADELLE LIVING BOOKS — LB-2 : état Study du document courant (client, RLS).
 *
 * Charge les annotations + signets de l'utilisateur pour CE document, expose des
 * mutations OPTIMISTES (l'annotation apparaît tout de suite, sync ensuite ; erreur
 * visible si la sauvegarde échoue). DÉGRADATION GRACIEUSE : si les tables Study ne
 * sont pas encore déployées (migration non appliquée), `available=false` et le
 * reader reste pleinement utilisable (aucune perte silencieuse : erreurs remontées).
 */
import { useCallback, useEffect, useState } from 'react'
import {
  listAnnotations, createAnnotation, updateAnnotation, deleteAnnotation,
  listBookmarks, createBookmark, deleteBookmark,
  type StudyAnnotation, type DocumentBookmark, type HighlightColor,
} from '@/lib/study/study-service'
import type { StudyAnchor } from '@/lib/pdf/study-anchor'

export interface UseStudyResult {
  available: boolean
  annotations: StudyAnnotation[]
  bookmarks: DocumentBookmark[]
  error: string | null
  addHighlight: (a: { page: number; color: HighlightColor; selectedText: string; anchor: StudyAnchor }) => Promise<void>
  addNote: (a: { page: number; color?: HighlightColor | null; note: string; selectedText: string; anchor: StudyAnchor }) => Promise<void>
  removeAnnotation: (id: string) => Promise<void>
  addBookmark: (b: { page: number; kind: 'page' | 'passage'; label?: string | null; selectedText?: string | null; anchor?: StudyAnchor | null }) => Promise<void>
  removeBookmark: (id: string) => Promise<void>
}

export function useStudy(documentId: string | undefined): UseStudyResult {
  const [annotations, setAnnotations] = useState<StudyAnnotation[]>([])
  const [bookmarks, setBookmarks] = useState<DocumentBookmark[]>([])
  const [available, setAvailable] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) return
    let cancelled = false
    ;(async () => {
      try {
        const [a, b] = await Promise.all([listAnnotations(documentId), listBookmarks(documentId)])
        if (cancelled) return
        setAnnotations(a); setBookmarks(b); setAvailable(true)
      } catch (e) {
        if (cancelled) return
        // Table absente (migration non appliquée) → Study indisponible, reader intact.
        setAvailable(false)
        setError(e instanceof Error ? e.message : 'Study indisponible')
      }
    })()
    return () => { cancelled = true }
  }, [documentId])

  const addHighlight = useCallback(async (a: { page: number; color: HighlightColor; selectedText: string; anchor: StudyAnchor }) => {
    if (!documentId) return
    try {
      const row = await createAnnotation({ documentId, page: a.page, color: a.color, selectedText: a.selectedText, anchor: a.anchor })
      if (row) setAnnotations((prev) => [...prev, row])
    } catch (e) { setError(e instanceof Error ? e.message : 'Échec de la sauvegarde') }
  }, [documentId])

  const addNote = useCallback(async (a: { page: number; color?: HighlightColor | null; note: string; selectedText: string; anchor: StudyAnchor }) => {
    if (!documentId) return
    try {
      const row = await createAnnotation({ documentId, page: a.page, color: a.color ?? null, note: a.note, selectedText: a.selectedText, anchor: a.anchor })
      if (row) setAnnotations((prev) => [...prev, row])
    } catch (e) { setError(e instanceof Error ? e.message : 'Échec de la sauvegarde') }
  }, [documentId])

  const removeAnnotation = useCallback(async (id: string) => {
    const prev = annotations
    setAnnotations((p) => p.filter((x) => x.id !== id)) // optimiste
    try { await deleteAnnotation(id) } catch (e) { setAnnotations(prev); setError(e instanceof Error ? e.message : 'Échec de la suppression') }
  }, [annotations])

  const addBookmark = useCallback(async (b: { page: number; kind: 'page' | 'passage'; label?: string | null; selectedText?: string | null; anchor?: StudyAnchor | null }) => {
    if (!documentId) return
    try {
      const row = await createBookmark({ documentId, ...b })
      if (row) setBookmarks((prev) => [...prev, row])
    } catch (e) { setError(e instanceof Error ? e.message : 'Échec de la sauvegarde') }
  }, [documentId])

  const removeBookmark = useCallback(async (id: string) => {
    const prev = bookmarks
    setBookmarks((p) => p.filter((x) => x.id !== id))
    try { await deleteBookmark(id) } catch (e) { setBookmarks(prev); setError(e instanceof Error ? e.message : 'Échec de la suppression') }
  }, [bookmarks])

  return { available, annotations, bookmarks, error, addHighlight, addNote, removeAnnotation, addBookmark, removeBookmark }
}
