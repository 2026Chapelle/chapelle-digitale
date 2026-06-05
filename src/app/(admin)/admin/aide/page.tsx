'use client'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { HelpSearch } from '@/components/features/help/HelpSearch'
import { HelpPanel } from '@/components/features/help/HelpPanel'
import { GUIDES, HELP_CATEGORIES, searchGuides, type HelpCategory } from '@/lib/help/guides'

/**
 * CENTRE D'AIDE ADMIN — /admin/aide. Couche d'assistance (admin/super_admin via
 * le layout admin cookie). Recherche + catégories + guides. Aucune logique métier.
 */
export default function AdminAidePage() {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<HelpCategory | 'Toutes'>('Toutes')
  const [highlight, setHighlight] = useState<string | null>(null)

  // Ancrage : ouvre/scrolle sur le guide ciblé par le hash (#guide-<id>).
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const m = hash.match(/^#guide-(.+)$/)
    if (m) {
      setHighlight(m[1])
      setTimeout(() => document.getElementById(`guide-${m[1]}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    }
  }, [])

  const filtered = useMemo(() => {
    let list = searchGuides(query)
    if (cat !== 'Toutes') list = list.filter((g) => g.category === cat)
    return list
  }, [query, cat])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={<>Centre d&apos;<span className="text-cinematic-gold">Aide</span></>}
          description="Guides pour piloter Citadelle : objectif, étapes, erreurs fréquentes et lien vers chaque module."
        />

        <div className="max-w-xl mb-6"><HelpSearch value={query} onChange={setQuery} /></div>

        {/* Catégories */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(['Toutes', ...HELP_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c as HelpCategory | 'Toutes')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-inter font-medium transition-all"
              style={{
                background: cat === c ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                color: cat === c ? '#D4AF37' : 'rgba(255,255,255,0.45)',
                border: `1px solid ${cat === c ? 'rgba(212,175,55,0.3)' : 'transparent'}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">
            Aucun guide ne correspond à « {query} ».
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filtered.map((g) => <HelpPanel key={g.id} guide={g} highlight={highlight === g.id} />)}
          </div>
        )}

        <p className="text-center text-xs text-pearl/25 font-inter mt-10">
          {GUIDES.length} guides · {HELP_CATEGORIES.length} catégories — l&apos;aide s&apos;enrichit au fil des chantiers.
        </p>
      </div>
    </div>
  )
}
