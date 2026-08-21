'use client'
/**
 * CITADELLE LIVING BOOKS — LB-2 : panneau « Étude » (un seul panneau, 4 onglets).
 * Surlignages · Notes · Signets · Journal. Chaque élément ramène au bon endroit.
 * Le journal est PRIVÉ (chargé/écrit via le client RLS). Dégrade proprement si Study
 * indisponible (migration non appliquée).
 */
import { useEffect, useState } from 'react'
import { Highlighter, StickyNote, Bookmark, BookText, Trash2, Plus, Loader2 } from 'lucide-react'
import {
  listJournal, createJournalEntry, deleteJournalEntry,
  HIGHLIGHT_HEX, type StudyAnnotation, type DocumentBookmark, type JournalEntry,
} from '@/lib/study/study-service'

type Tab = 'surlignages' | 'notes' | 'signets' | 'journal'

export function StudyPanel({
  documentId, available, annotations, bookmarks, currentPage,
  onNavigate, onRemoveAnnotation, onRemoveBookmark,
}: {
  documentId: string
  available: boolean
  annotations: StudyAnnotation[]
  bookmarks: DocumentBookmark[]
  currentPage: number
  onNavigate: (page: number) => void
  onRemoveAnnotation: (id: string) => void
  onRemoveBookmark: (id: string) => void
}) {
  const [tab, setTab] = useState<Tab>('surlignages')
  const highlights = annotations.filter((a) => a.color)
  const notes = annotations.filter((a) => a.note)

  if (!available) {
    return <div className="px-4 py-10 text-center font-inter text-sm text-pearl/45">Étude bientôt disponible pour ce document.</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 pt-2">
        {([['surlignages', Highlighter], ['notes', StickyNote], ['signets', Bookmark], ['journal', BookText]] as const).map(([k, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-inter font-semibold capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
            style={{ background: tab === k ? 'rgba(212,175,55,0.16)' : 'transparent', color: tab === k ? '#F5E6A7' : 'rgba(255,255,255,0.55)' }}
          >
            <Icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{k}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2">
        {tab === 'surlignages' && (
          <List empty="Aucun surlignage. Sélectionnez un passage pour le surligner.">
            {highlights.map((a) => (
              <Row key={a.id} onClick={() => onNavigate(a.page_number)} onDelete={() => onRemoveAnnotation(a.id)}
                dot={HIGHLIGHT_HEX[(a.color as keyof typeof HIGHLIGHT_HEX)] ?? '#D4AF37'} page={a.page_number} text={a.selected_text} active={a.page_number === currentPage} />
            ))}
          </List>
        )}
        {tab === 'notes' && (
          <List empty="Aucune note. Sélectionnez un passage puis « Note ».">
            {notes.map((a) => (
              <div key={a.id} className="rounded-lg p-2.5 mb-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => onNavigate(a.page_number)} className="text-left flex-1 min-w-0">
                    <p className="font-inter text-[11px] text-pearl/40">Page {a.page_number}</p>
                    {a.selected_text && <p className="font-inter text-[11px] text-pearl/50 italic truncate">« {a.selected_text} »</p>}
                    <p className="font-inter text-[13px] text-pearl/85 mt-0.5 whitespace-pre-wrap">{a.note}</p>
                  </button>
                  <button onClick={() => onRemoveAnnotation(a.id)} aria-label="Supprimer" className="text-pearl/35 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </List>
        )}
        {tab === 'signets' && (
          <List empty="Aucun signet.">
            {bookmarks.map((b) => (
              <Row key={b.id} onClick={() => onNavigate(b.page_number)} onDelete={() => onRemoveBookmark(b.id)}
                dot="#D4AF37" page={b.page_number} text={b.label || b.selected_text || (b.kind === 'page' ? 'Signet de page' : 'Passage')} active={b.page_number === currentPage} />
            ))}
          </List>
        )}
        {tab === 'journal' && <JournalTab documentId={documentId} currentPage={currentPage} />}
      </div>
    </div>
  )
}

function List({ children, empty }: { children: React.ReactNode; empty: string }) {
  const arr = Array.isArray(children) ? children : [children]
  const has = arr.some(Boolean) && arr.flat().filter(Boolean).length > 0
  return has ? <>{children}</> : <p className="px-2 py-8 text-center font-inter text-[12px] text-pearl/40">{empty}</p>
}

function Row({ onClick, onDelete, dot, page, text, active }: { onClick: () => void; onDelete: () => void; dot: string; page: number; text: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 mb-1" style={{ background: active ? 'rgba(212,175,55,0.1)' : 'transparent' }}>
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dot }} />
      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <span className="font-inter text-[11px] text-pearl/40 mr-1.5 tabular-nums">p.{page}</span>
        <span className="font-inter text-[12.5px] text-pearl/80">{text.length > 60 ? `${text.slice(0, 60)}…` : text}</span>
      </button>
      <button onClick={onDelete} aria-label="Supprimer" className="text-pearl/30 hover:text-red-400 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  )
}

function JournalTab({ documentId, currentPage }: { documentId: string; currentPage: number }) {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null)
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { let c = false; listJournal(documentId).then((e) => { if (!c) setEntries(e) }).catch(() => setEntries([])); return () => { c = true } }, [documentId])

  const add = async () => {
    if (!body.trim()) return
    setSaving(true)
    try {
      const row = await createJournalEntry({ documentId, page: currentPage, body: body.trim() })
      if (row) setEntries((p) => [row, ...(p ?? [])])
      setBody('')
    } catch { /* erreur silencieuse minimale */ } finally { setSaving(false) }
  }
  const remove = async (id: string) => { setEntries((p) => (p ?? []).filter((x) => x.id !== id)); try { await deleteJournalEntry(id) } catch { /* ignore */ } }

  return (
    <div>
      <div className="rounded-xl p-2 mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Ma méditation (privée)…"
          className="w-full bg-transparent outline-none resize-none font-inter text-[13px] text-pearl placeholder:text-pearl/30" aria-label="Nouvelle méditation" />
        <div className="flex justify-end">
          <button onClick={add} disabled={saving || !body.trim()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#C49A20)', color: '#1A0F00' }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Ajouter au journal
          </button>
        </div>
      </div>
      {entries === null ? (
        <p className="py-6 text-center text-pearl/40 text-xs"><Loader2 className="w-4 h-4 animate-spin inline" /></p>
      ) : entries.length === 0 ? (
        <p className="px-2 py-6 text-center font-inter text-[12px] text-pearl/40">Ton journal d’étude est privé. Commence une méditation.</p>
      ) : entries.map((e) => (
        <div key={e.id} className="rounded-lg p-2.5 mb-1.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-start justify-between gap-2">
            <p className="font-inter text-[13px] text-pearl/85 whitespace-pre-wrap flex-1">{e.body}</p>
            <button onClick={() => remove(e.id)} aria-label="Supprimer" className="text-pearl/30 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          {e.page_number != null && <p className="font-inter text-[10px] text-pearl/35 mt-1">page {e.page_number}</p>}
        </div>
      ))}
    </div>
  )
}
