'use client'
/**
 * CITADELLE LIVING BOOKS — LB-1 : panneau « Sommaire » (table des matières).
 *
 * Extrait via pdf.js `getOutline()` (aplati par reader-outline, PUR), puis résout
 * chaque destination en numéro de page (getDestination / getPageIndex). Si le PDF
 * ne contient PAS de sommaire → « Aucun sommaire disponible » (jamais inventé).
 */
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { PdfDocumentProxy } from './pdf-engine'
import { flattenOutline, firstDestRef, type FlatOutlineItem } from '@/lib/pdf/reader-outline'

async function resolvePage(pdf: PdfDocumentProxy, dest: string | unknown[] | null): Promise<number | null> {
  try {
    const explicit = typeof dest === 'string' ? await pdf.getDestination(dest) : dest
    const ref = firstDestRef(explicit)
    if (!ref) return null
    const idx = await pdf.getPageIndex(ref)
    return Number.isFinite(idx) ? idx + 1 : null
  } catch {
    return null
  }
}

export function PdfOutline({
  pdf, currentPage, onSelect,
}: {
  pdf: PdfDocumentProxy
  currentPage: number
  onSelect: (page: number) => void
}) {
  const [items, setItems] = useState<FlatOutlineItem[] | null>(null)
  const [pageOf, setPageOf] = useState<Record<string, number | null>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = await pdf.getOutline()
        const flat = flattenOutline(raw as never)
        if (cancelled) return
        setItems(flat)
        const map: Record<string, number | null> = {}
        for (const it of flat) {
          if (cancelled) return
          map[it.id] = await resolvePage(pdf, it.dest)
        }
        if (!cancelled) setPageOf(map)
      } catch {
        if (!cancelled) setItems([])
      }
    })()
    return () => { cancelled = true }
  }, [pdf])

  if (items === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-pearl/50 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement du sommaire…
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="font-inter text-sm text-pearl/45">Aucun sommaire disponible</p>
      </div>
    )
  }
  return (
    <nav className="h-full overflow-y-auto overscroll-contain px-2 py-3" aria-label="Sommaire du document">
      <ul className="space-y-0.5">
        {items.map((it) => {
          const page = pageOf[it.id]
          const active = page != null && page === currentPage
          return (
            <li key={it.id}>
              <button
                onClick={() => page != null && onSelect(page)}
                disabled={page == null}
                aria-current={active ? 'true' : undefined}
                className="w-full text-left rounded-md px-2.5 py-1.5 flex items-center justify-between gap-2 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#D4AF37]"
                style={{
                  paddingLeft: 10 + it.depth * 14,
                  background: active ? 'rgba(212,175,55,0.14)' : 'transparent',
                }}
              >
                <span className="font-inter text-[13px] leading-snug" style={{ color: active ? '#F5E6A7' : 'rgba(255,255,255,0.72)' }}>
                  {it.title}
                </span>
                {page != null && <span className="font-inter text-[11px] tabular-nums text-pearl/35 flex-shrink-0">{page}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
