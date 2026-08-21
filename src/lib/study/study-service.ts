'use client'
/**
 * CITADELLE LIVING BOOKS — LB-2 : accès données Study (CLIENT authentifié, RLS).
 *
 * Toutes les opérations passent par le client Supabase COOKIE (getBrowserClient →
 * createClientComponentClient) : la session de l'utilisateur applique la RLS
 * owner-only. AUCUN service_role côté client. `user_id` n'est JAMAIS envoyé : la
 * colonne a `default auth.uid()` et la policy WITH CHECK garantit la propriété.
 */
import { getBrowserClient } from '@/lib/supabase-browser'
import type { StudyAnchor } from '@/lib/pdf/study-anchor'

export type HighlightColor = 'gold' | 'yellow' | 'blue' | 'violet' | 'green'

/** Teintes des surlignages Study (persistants) — distinctes de la recherche (temporaire). */
export const HIGHLIGHT_HEX: Record<HighlightColor, string> = {
  gold: '#D4AF37', yellow: '#FBE38A', blue: '#7CB3F0', violet: '#B79CF0', green: '#8FD9A8',
}

export interface StudyAnnotation {
  id: string
  document_id: string
  page_number: number
  color: HighlightColor | null
  note: string | null
  selected_text: string
  anchor: StudyAnchor
  bible_ref: string | null
  created_at: string
  updated_at: string
}

export interface DocumentBookmark {
  id: string
  document_id: string
  page_number: number
  kind: 'page' | 'passage'
  label: string | null
  selected_text: string | null
  anchor: StudyAnchor | null
  created_at: string
}

export interface JournalEntry {
  id: string
  document_id: string | null
  page_number: number | null
  selected_text: string | null
  body: string
  created_at: string
  updated_at: string
}

export interface DocumentProgressRow {
  document_id: string
  page_number: number
  zoom: number
  view_mode: 'livre' | 'lecture'
  updated_at: string
}

function db() {
  return getBrowserClient()
}

// ── Annotations (surlignages + notes) ───────────────────────────────
export async function listAnnotations(documentId: string): Promise<StudyAnnotation[]> {
  const c = db(); if (!c) return []
  const { data } = await c.from('study_annotations').select('*').eq('document_id', documentId).order('page_number')
  return (data as StudyAnnotation[]) ?? []
}
export async function createAnnotation(input: {
  documentId: string; page: number; color?: HighlightColor | null; note?: string | null
  selectedText: string; anchor: StudyAnchor
}): Promise<StudyAnnotation | null> {
  const c = db(); if (!c) return null
  const { data, error } = await c.from('study_annotations').insert({
    document_id: input.documentId, page_number: input.page,
    color: input.color ?? null, note: input.note ?? null,
    selected_text: input.selectedText, anchor: input.anchor,
  }).select('*').single()
  if (error) throw new Error(error.message)
  return data as StudyAnnotation
}
export async function updateAnnotation(id: string, patch: { color?: HighlightColor | null; note?: string | null }) {
  const c = db(); if (!c) return
  const { error } = await c.from('study_annotations').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}
export async function deleteAnnotation(id: string) {
  const c = db(); if (!c) return
  const { error } = await c.from('study_annotations').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Signets ─────────────────────────────────────────────────────────
export async function listBookmarks(documentId: string): Promise<DocumentBookmark[]> {
  const c = db(); if (!c) return []
  const { data } = await c.from('document_bookmarks').select('*').eq('document_id', documentId).order('page_number')
  return (data as DocumentBookmark[]) ?? []
}
export async function createBookmark(input: {
  documentId: string; page: number; kind: 'page' | 'passage'; label?: string | null
  selectedText?: string | null; anchor?: StudyAnchor | null
}): Promise<DocumentBookmark | null> {
  const c = db(); if (!c) return null
  const { data, error } = await c.from('document_bookmarks').insert({
    document_id: input.documentId, page_number: input.page, kind: input.kind,
    label: input.label ?? null, selected_text: input.selectedText ?? null, anchor: input.anchor ?? null,
  }).select('*').single()
  if (error) throw new Error(error.message)
  return data as DocumentBookmark
}
export async function deleteBookmark(id: string) {
  const c = db(); if (!c) return
  const { error } = await c.from('document_bookmarks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Journal (privé) ─────────────────────────────────────────────────
export async function listJournal(documentId?: string): Promise<JournalEntry[]> {
  const c = db(); if (!c) return []
  let q = c.from('reading_journal').select('*').order('created_at', { ascending: false })
  if (documentId) q = q.eq('document_id', documentId)
  const { data } = await q
  return (data as JournalEntry[]) ?? []
}
export async function createJournalEntry(input: {
  documentId?: string | null; page?: number | null; selectedText?: string | null; body: string
}): Promise<JournalEntry | null> {
  const c = db(); if (!c) return null
  const { data, error } = await c.from('reading_journal').insert({
    document_id: input.documentId ?? null, page_number: input.page ?? null,
    selected_text: input.selectedText ?? null, body: input.body,
  }).select('*').single()
  if (error) throw new Error(error.message)
  return data as JournalEntry
}
export async function deleteJournalEntry(id: string) {
  const c = db(); if (!c) return
  const { error } = await c.from('reading_journal').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Progression serveur (reprise multi-device) ──────────────────────
export async function getServerProgress(documentId: string): Promise<DocumentProgressRow | null> {
  const c = db(); if (!c) return null
  const { data } = await c.from('document_progress').select('*').eq('document_id', documentId).maybeSingle()
  return (data as DocumentProgressRow) ?? null
}
export async function upsertServerProgress(input: {
  documentId: string; page: number; zoom: number; mode: 'livre' | 'lecture'
}): Promise<void> {
  const c = db(); if (!c) return
  const { error } = await c.from('document_progress').upsert(
    { document_id: input.documentId, page_number: input.page, zoom: input.zoom, view_mode: input.mode, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,document_id' },
  )
  if (error) throw new Error(error.message)
}
