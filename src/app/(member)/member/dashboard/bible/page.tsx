'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, Check, Search, Star, Loader2, Calendar, RefreshCw,
  ChevronRight, History, CloudOff, ExternalLink, Sparkles,
} from 'lucide-react'
import {
  getAnnualPlan, dayOfYearIndex, dayLabel, refLabel, parseReference,
  TOTAL_JOURS, type ChapterRef,
} from '@/lib/bible'

interface Verse { verse: number; text: string }
interface Favorite { ref: string; verse: number; text: string; at: string }
interface HistoryItem { ref: string; at: string }

const LS = {
  progress: 'bible_progress',
  resume: 'bible_resume',
  history: 'bible_history',
  favorite: 'bible_favorite',
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const v = window.localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch { return fallback }
}
function saveJSON(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota / privé */ }
}

/** Lien de secours vers une Bible en ligne si l'API est indisponible. */
const externalBibleUrl = (ref: ChapterRef) =>
  `https://www.bible.com/fr/search/bible?q=${encodeURIComponent(refLabel(ref))}`

export default function BiblePage() {
  const plan = useMemo(() => getAnnualPlan(), [])
  const todayIndex = useMemo(() => dayOfYearIndex(), [])
  const todayDay = plan[todayIndex]

  // État persistant (chargé après montage pour éviter les soucis SSR).
  const [progress, setProgress] = useState<number[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [favorite, setFavorite] = useState<Favorite | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Lecture en cours.
  const [selected, setSelected] = useState<ChapterRef | null>(null)
  const [verses, setVerses] = useState<Verse[]>([])
  const [translation, setTranslation] = useState('Louis Segond')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [searchErr, setSearchErr] = useState<string | null>(null)

  // Hydratation depuis localStorage + reprise automatique.
  useEffect(() => {
    const p = loadJSON<number[]>(LS.progress, [])
    const h = loadJSON<HistoryItem[]>(LS.history, [])
    const f = loadJSON<Favorite | null>(LS.favorite, null)
    const resume = loadJSON<number>(LS.resume, todayIndex + 1)
    setProgress(p); setHistory(h); setFavorite(f); setHydrated(true)
    // Reprend là où le membre s'est arrêté (sinon lecture du jour).
    const resumeDay = plan[Math.min(Math.max(resume - 1, 0), TOTAL_JOURS - 1)] ?? todayDay
    setSelected(resumeDay?.lectures[0] ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (hydrated) saveJSON(LS.progress, progress) }, [progress, hydrated])
  useEffect(() => { if (hydrated) saveJSON(LS.history, history) }, [history, hydrated])
  useEffect(() => { if (hydrated) saveJSON(LS.favorite, favorite) }, [favorite, hydrated])

  const pushHistory = useCallback((ref: string) => {
    setHistory((prev) => [{ ref, at: new Date().toISOString() }, ...prev.filter((x) => x.ref !== ref)].slice(0, 15))
  }, [])

  // Chargement du texte du chapitre sélectionné (via le proxy /api/bible).
  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setLoading(true); setError(false); setVerses([])
    ;(async () => {
      try {
        const r = await fetch(`/api/bible?book=${selected.bookId}&chapter=${selected.chapitre}`)
        const j = await r.json()
        if (cancelled) return
        if (j.ok && Array.isArray(j.verses) && j.verses.length) {
          setVerses(j.verses)
          if (j.translation) setTranslation(j.translation)
          pushHistory(refLabel(selected))
          saveJSON(LS.resume, dayContaining(plan, selected))
        } else setError(true)
      } catch { if (!cancelled) setError(true) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [selected, plan, pushHistory])

  const doneSet = useMemo(() => new Set(progress), [progress])
  const pct = Math.round((progress.length / TOTAL_JOURS) * 100)
  const todayDone = doneSet.has(todayIndex + 1)

  const toggleDay = (jour: number) => {
    setProgress((prev) => prev.includes(jour) ? prev.filter((d) => d !== jour) : [...prev, jour])
  }

  const runSearch = () => {
    setSearchErr(null)
    const ref = parseReference(search)
    if (!ref) { setSearchErr('Référence non reconnue. Ex : « Jean 3 », « Genèse 1 ».'); return }
    setSelected(ref)
  }

  const toggleFavoriteVerse = (v: Verse) => {
    if (!selected) return
    const ref = refLabel(selected)
    if (favorite && favorite.ref === ref && favorite.verse === v.verse) setFavorite(null)
    else setFavorite({ ref, verse: v.verse, text: v.text, at: new Date().toISOString() })
  }
  const isFav = (v: Verse) => !!favorite && selected && favorite.ref === refLabel(selected) && favorite.verse === v.verse

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal space-y-6">

        {/* Header */}
        <div>
          <div className="section-label mb-2">Espace Membre</div>
          <h1 className="font-cinzel font-black text-pearl mb-1.5" style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            La Bible — Louis Segond
          </h1>
          <p className="font-inter text-sm text-pearl/50">Lecture quotidienne, plan annuel et progression spirituelle.</p>
        </div>

        {/* Progression annuelle */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Progression', value: `${pct}%`, color: '#D4AF37' },
            { label: 'Jours lus', value: `${progress.length}/${TOTAL_JOURS}`, color: '#22C55E' },
            { label: 'Jour du plan', value: `${todayIndex + 1}`, color: '#0EA5E9' },
            { label: 'Verset favori', value: favorite ? '★' : '—', color: '#EC4899' },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="font-cinzel text-xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="font-inter text-[11px] mt-0.5 text-pearl/40">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#4B0082,#D4AF37)' }} />
        </div>

        {/* Bible du jour */}
        {todayDay && (
          <div className="rounded-3xl p-5 md:p-6" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(75,0,130,0.12))', border: '1px solid rgba(212,175,55,0.25)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-gold" />
              <h2 className="font-cinzel text-sm font-bold text-pearl">Bible du jour — Jour {todayIndex + 1}</h2>
            </div>
            <p className="font-inter text-sm text-pearl/70 mb-4">{dayLabel(todayDay)}</p>
            <div className="flex flex-wrap gap-2.5">
              <button onClick={() => setSelected(todayDay.lectures[0])} className="btn-gold inline-flex items-center gap-1.5 text-xs px-4 py-2">
                <BookOpen className="w-3.5 h-3.5" /> Lire la lecture du jour
              </button>
              <button onClick={() => toggleDay(todayIndex + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-inter font-semibold"
                style={{ background: todayDone ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${todayDone ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`, color: todayDone ? '#22C55E' : 'rgba(255,255,255,0.8)' }}>
                <Check className="w-3.5 h-3.5" /> {todayDone ? 'Jour terminé' : 'Marquer comme lu'}
              </button>
            </div>
          </div>
        )}

        {/* Recherche de référence */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
            <input
              className="input-royal w-full pl-11"
              placeholder="Rechercher une référence — ex : Jean 3, Psaumes 23…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          </div>
          <button onClick={runSearch} className="btn-royal text-sm px-5 py-2.5 inline-flex items-center justify-center gap-1.5">
            <Search className="w-4 h-4" /> Ouvrir
          </button>
        </div>
        {searchErr && <p className="font-inter text-xs" style={{ color: '#FCA5A5' }}>{searchErr}</p>}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lecteur */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card-royal min-h-[320px]">
              {!selected ? (
                <div className="text-center py-16">
                  <BookOpen className="w-8 h-8 mx-auto mb-3 text-gold/40" />
                  <p className="font-inter text-sm text-pearl/50">Choisissez une lecture pour commencer.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-white/5">
                    <h2 className="font-cinzel text-lg font-black text-gold">{refLabel(selected)}</h2>
                    <span className="text-[10px] font-inter text-pearl/35 uppercase tracking-wider">{translation}</span>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <CloudOff className="w-8 h-8 mx-auto mb-3 text-gold/50" />
                      <p className="font-cinzel text-pearl/70 mb-1">Texte momentanément indisponible</p>
                      <p className="font-inter text-xs text-pearl/40 mb-4 max-w-sm mx-auto">
                        La lecture en ligne ne répond pas pour l'instant. Vous pouvez réessayer ou ouvrir cette référence sur une Bible en ligne.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button onClick={() => setSelected({ ...selected })} className="btn-royal text-xs px-4 py-2 inline-flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5" /> Réessayer
                        </button>
                        <a href={externalBibleUrl(selected)} target="_blank" rel="noreferrer" className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" /> Lire en ligne
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {verses.map((v) => (
                        <div key={v.verse} className="group flex gap-2.5">
                          <span className="font-cinzel text-[11px] font-bold text-gold/70 pt-0.5 w-6 flex-shrink-0 text-right">{v.verse}</span>
                          <p className="font-inter text-[15px] text-pearl/80 leading-relaxed flex-1">{v.text}</p>
                          <button onClick={() => toggleFavoriteVerse(v)} aria-label="Verset favori"
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-start pt-0.5">
                            <Star className="w-3.5 h-3.5" style={{ color: isFav(v) ? '#EC4899' : 'rgba(255,255,255,0.3)' }} fill={isFav(v) ? '#EC4899' : 'none'} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Colonne latérale : verset favori + historique + plan */}
          <div className="space-y-4">
            {/* Verset favori */}
            <div className="card-royal">
              <h3 className="font-cinzel text-sm font-bold text-pearl mb-3 flex items-center gap-2"><Star className="w-3.5 h-3.5 text-pink-400" /> Mon verset favori</h3>
              {favorite ? (
                <button onClick={() => parseReference(favorite.ref) && setSelected(parseReference(favorite.ref))} className="text-left w-full">
                  <p className="font-cormorant italic text-base text-pearl/85 leading-relaxed mb-2">« {favorite.text} »</p>
                  <p className="font-cinzel text-[11px] text-gold">{favorite.ref}:{favorite.verse}</p>
                </button>
              ) : (
                <p className="font-inter text-xs text-pearl/40">Touchez l'étoile à côté d'un verset pour l'enregistrer ici.</p>
              )}
            </div>

            {/* Historique */}
            <div className="card-royal">
              <h3 className="font-cinzel text-sm font-bold text-pearl mb-3 flex items-center gap-2"><History className="w-3.5 h-3.5 text-gold" /> Historique de lecture</h3>
              {history.length === 0 ? (
                <p className="font-inter text-xs text-pearl/40">Vos dernières lectures apparaîtront ici.</p>
              ) : (
                <div className="space-y-1">
                  {history.slice(0, 8).map((h) => (
                    <button key={h.ref} onClick={() => parseReference(h.ref) && setSelected(parseReference(h.ref))}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left">
                      <span className="font-inter text-xs text-pearl/70">{h.ref}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-pearl/25" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plan annuel — 365 jours */}
        <div className="card-royal">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" /> Plan annuel — 365 jours</h3>
            <span className="font-inter text-xs text-pearl/40">{progress.length} jours validés</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[460px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {plan.map((d, i) => {
              const done = doneSet.has(d.jour)
              const isToday = i === todayIndex
              return (
                <div key={d.jour}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl"
                  style={{ background: isToday ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isToday ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
                  <button onClick={() => toggleDay(d.jour)} aria-label="Marquer le jour"
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: done ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${done ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                    {done ? <Check className="w-3.5 h-3.5 text-green-400" /> : <span className="text-[10px] font-cinzel text-pearl/40">{d.jour}</span>}
                  </button>
                  <button onClick={() => setSelected(d.lectures[0])} className="flex-1 min-w-0 text-left">
                    <p className="font-inter text-[11px] text-pearl/35">Jour {d.jour}{isToday ? ' · aujourd\'hui' : ''}</p>
                    <p className="font-inter text-xs text-pearl/75 truncate">{dayLabel(d)}</p>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Numéro de jour du plan contenant une référence (pour la reprise). */
function dayContaining(plan: ReturnType<typeof getAnnualPlan>, ref: ChapterRef): number {
  for (const d of plan) {
    if (d.lectures.some((l) => l.bookId === ref.bookId && l.chapitre === ref.chapitre)) return d.jour
  }
  return 1
}
