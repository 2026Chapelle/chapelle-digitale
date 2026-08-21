'use client'
/**
 * CITADELLE LIVING BOOKS — LB-1 : recherche in-document (aucune IA).
 *
 * Le texte est extrait paresseusement (usePdfText) puis analysé par la logique
 * PURE reader-search (insensible casse/accents). Affiche le nombre de résultats,
 * précédent/suivant avec bouclage, et navigue vers la page de l'occurrence
 * courante en armant la surbrillance temporaire.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronUp, ChevronDown, Loader2, X } from 'lucide-react'
import { buildSearchResult, stepMatchIndex, matchLabel, type PageText } from '@/lib/pdf/reader-search'

export function PdfSearchPanel({
  pages, loading, onExtract, onNavigate, onClose,
}: {
  pages: PageText[] | null
  loading: boolean
  onExtract: () => void
  onNavigate: (page: number, query: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [current, setCurrent] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { onExtract(); inputRef.current?.focus() }, [onExtract])

  const result = useMemo(
    () => (pages ? buildSearchResult(pages, query) : { query: '', matches: [] }),
    [pages, query],
  )

  // Nouvelle requête → repart à la première occurrence.
  useEffect(() => { setCurrent(result.matches.length > 0 ? 0 : -1) }, [result])

  // Navigue vers l'occurrence courante.
  useEffect(() => {
    if (current >= 0 && result.matches[current]) {
      onNavigate(result.matches[current].page, result.query)
    }
  }, [current, result, onNavigate])

  const step = (dir: 1 | -1) => setCurrent((c) => stepMatchIndex(result.matches.length, c, dir))

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Search className="w-4 h-4 text-pearl/45 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1) }
            if (e.key === 'Escape') { e.preventDefault(); onClose() }
          }}
          placeholder="Rechercher dans le livre…"
          aria-label="Rechercher dans le document"
          className="flex-1 bg-transparent outline-none font-inter text-sm text-pearl placeholder:text-pearl/30"
        />
        <button onClick={onClose} aria-label="Fermer la recherche" className="text-pearl/40 hover:text-pearl/70">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-2 px-1">
        <span className="font-inter text-xs text-pearl/50 tabular-nums" aria-live="polite">
          {loading ? (
            <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Indexation…</span>
          ) : query.trim().length < 2 ? (
            'Tapez au moins 2 caractères'
          ) : (
            matchLabel(result.matches.length, current)
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => step(-1)}
            disabled={result.matches.length === 0}
            aria-label="Résultat précédent"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-pearl/70 disabled:opacity-25 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => step(1)}
            disabled={result.matches.length === 0}
            aria-label="Résultat suivant"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-pearl/70 disabled:opacity-25 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
