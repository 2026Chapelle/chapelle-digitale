'use client'
/**
 * Espace membre — Bibliothèque de Prières « Prières & Guides » (V2.3-B Lot 1).
 * Lit le contenu complet via la route protégée /api/member/prayers (session serveur).
 * Aucun PDF en Lot 1 (à venir). Aucune donnée fictive.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Library, ChevronDown, FileText, ArrowLeft } from 'lucide-react'

interface MemberPrayer {
  id: string
  title: string
  category: string
  summary: string
  content: string
  coverIcon: string
  color: string
}

export default function BibliothequePrieresPage() {
  const [prayers, setPrayers] = useState<MemberPrayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/member/prayers', { credentials: 'same-origin' })
        const j = await r.json().catch(() => ({}))
        if (cancelled) return
        if (!r.ok || j?.ok !== true) { setError('Impossible de charger la bibliothèque. Réessayez.'); setPrayers([]) }
        else setPrayers(j.data?.prayers || [])
      } catch { if (!cancelled) setError('Impossible de charger la bibliothèque. Réessayez.') }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <Link href="/member/dashboard/prieres" className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Mes Prières
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <Library className="w-5 h-5 text-gold" />
          <h1 className="font-cinzel text-2xl font-black text-pearl">Prières &amp; Guides</h1>
        </div>
        <p className="font-inter text-sm text-pearl/50 mb-6">Des prières structurées à lire et méditer. Le téléchargement PDF arrive bientôt.</p>

        {error && <div className="card-royal p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-12"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : prayers.length === 0 && !error ? (
          <div className="card-royal text-center py-16">
            <Library className="w-8 h-8 mx-auto mb-3 text-pearl/30" />
            <p className="font-cinzel text-lg text-pearl/60">Aucune prière disponible pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prayers.map((p) => {
              const open = openId === p.id
              return (
                <div key={p.id} className="card-royal overflow-hidden">
                  <button onClick={() => setOpenId(open ? null : p.id)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/[0.02] transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                      <span aria-hidden>{p.coverIcon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-cinzel font-bold text-pearl">{p.title}</span>
                        <span className="font-inter text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${p.color}18`, color: p.color }}>{p.category}</span>
                      </div>
                      <p className="font-inter text-xs text-pearl/45 mt-0.5">{p.summary}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-pearl/40 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="px-4 pb-5 pt-1 border-t border-white/5">
                      <p className="font-inter text-sm leading-relaxed text-pearl/75 whitespace-pre-line">{p.content}</p>
                      <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-inter text-pearl/35">
                        <FileText className="w-3.5 h-3.5" /> PDF bientôt disponible
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
