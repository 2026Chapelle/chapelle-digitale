'use client'
/**
 * Espace membre — Bibliothèque de Prières « Prières & Guides » (V2.3-B Lot 2).
 * Liste + recherche/filtres client-side + compteurs. La lecture complète se fait
 * sur la page détail /member/dashboard/prieres/bibliotheque/[id] (route protégée).
 * Aucun import de library.ts ici (le contenu reste côté serveur). Aucun PDF.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Library, ArrowLeft, ArrowRight, Search, Clock, LogIn } from 'lucide-react'

interface MemberPrayer {
  id: string
  title: string
  category: string
  summary: string
  excerpt: string
  coverIcon: string
  color: string
  durationMinutes: number
  intention: string
  recommendedMoment: string
  imageUrl?: string
  imageAlt?: string
  overlayTone?: string
}

const norm = (s: unknown) =>
  typeof s === 'string' ? s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim() : ''

export default function BibliothequePrieresPage() {
  const [prayers, setPrayers] = useState<MemberPrayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/member/prayers', { credentials: 'same-origin' })
        if (cancelled) return
        if (r.status === 401) { setUnauthorized(true); setPrayers([]); setLoading(false); return }
        const j = await r.json().catch(() => ({}))
        if (!r.ok || j?.ok !== true) { setError('Impossible de charger la bibliothèque. Réessayez.'); setPrayers([]) }
        else setPrayers(j.data?.prayers || [])
      } catch { if (!cancelled) setError('Impossible de charger la bibliothèque. Réessayez.') }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(() => Array.from(new Set(prayers.map((p) => p.category))), [prayers])
  const filtered = useMemo(() => {
    const q = norm(query)
    return prayers.filter((p) => {
      if (category && p.category !== category) return false
      if (!q) return true
      return norm([p.title, p.category, p.summary, p.excerpt].join(' ')).includes(q)
    })
  }, [prayers, category, query])

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
        <p className="font-inter text-sm text-pearl/55 mb-6 max-w-2xl">
          Une bibliothèque de prières à lire et méditer, pour nourrir ta foi au fil des saisons. Choisis un thème,
          prends un moment au calme, et laisse ces mots guider ton cœur vers le Père.
        </p>

        {unauthorized ? (
          <div className="card-royal text-center py-16">
            <LogIn className="w-8 h-8 mx-auto mb-3 text-pearl/30" />
            <p className="font-cinzel text-lg text-pearl/60 mb-4">Connecte-toi pour accéder aux prières complètes.</p>
            <Link href="/login" className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2">Se connecter <ArrowRight className="w-4 h-4" /></Link>
          </div>
        ) : (
          <>
            {/* Recherche + filtres */}
            <div className="relative mb-4 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/40" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un titre, une catégorie…" className="input-royal w-full pl-9 text-sm" />
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              <button onClick={() => setCategory('')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-inter font-semibold transition-all ${!category ? 'bg-gold text-black' : 'bg-pearl/5 text-pearl/50 hover:bg-pearl/10 hover:text-pearl/80'}`}>
                Toutes
              </button>
              {categories.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-inter font-semibold transition-all ${category === c ? 'bg-gold text-black' : 'bg-pearl/5 text-pearl/50 hover:bg-pearl/10 hover:text-pearl/80'}`}>
                  {c}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-pearl/35 font-inter mb-5">
              {filtered.length} / {prayers.length} prière(s){category ? ` · catégorie : ${category}` : ' · toutes catégories'}
            </p>

            {error && <div className="card-royal p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

            {loading ? (
              <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-12"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
            ) : filtered.length === 0 && !error ? (
              <div className="card-royal text-center py-16">
                <Library className="w-8 h-8 mx-auto mb-3 text-pearl/30" />
                <p className="font-cinzel text-lg text-pearl/60">{prayers.length === 0 ? 'Aucune prière disponible pour le moment.' : 'Aucune prière ne correspond à votre recherche.'}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p) => (
                  <div key={p.id} className="card-royal p-5 flex flex-col group overflow-hidden">
                    {p.imageUrl ? (
                      <div className="relative -mx-5 -mt-5 mb-3 h-28 bg-cover bg-center overflow-hidden transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${p.imageUrl})` }} role="img" aria-label={p.imageAlt || p.title}>
                        <div className="absolute inset-0" style={{ background: p.overlayTone === 'dark' ? 'linear-gradient(180deg, rgba(12,10,22,0.25), rgba(12,10,22,0.85))' : 'linear-gradient(180deg, rgba(12,10,22,0.15), rgba(12,10,22,0.75))' }} />
                        <span className="absolute bottom-2 left-3 font-inter text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${p.color}33`, color: '#F5E6D8', backdropFilter: 'blur(4px)' }}>{p.category}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                          <span aria-hidden>{p.coverIcon}</span>
                        </div>
                        <span className="font-inter text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${p.color}18`, color: p.color }}>{p.category}</span>
                      </div>
                    )}
                    <h3 className="font-cinzel font-bold text-base text-pearl mb-1">{p.title}</h3>
                    <p className="font-inter text-xs leading-relaxed mb-3 text-pearl/45 line-clamp-2">{p.excerpt}</p>
                    <div className="flex items-center gap-3 text-[11px] font-inter text-pearl/40 mb-4">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {p.durationMinutes} min</span>
                      <span className="truncate">· {p.intention}</span>
                    </div>
                    <Link href={`/member/dashboard/prieres/bibliotheque/${p.id}`}
                      className="mt-auto btn-gold text-xs px-3 py-2 inline-flex items-center justify-center gap-1.5">
                      Lire la prière <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
