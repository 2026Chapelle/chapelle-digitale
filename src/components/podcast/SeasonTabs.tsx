'use client'
/**
 * PODCAST-SPINE — Sélecteur de Saisons (chapitres thématiques). Vrai `tablist`
 * accessible : rôles ARIA, focus roving flèches gauche/droite, focus visible.
 * Le titre THÉMATIQUE est central (jamais « Semaine N » ni logique admin).
 * Contrôlé : le parent gère l'état + la synchro URL (?saison=N).
 */
import { useRef } from 'react'

export interface SeasonTab { number: number; title: string }

export function SeasonTabs({
  seasons, activeNumber, onSelect,
}: {
  seasons: SeasonTab[]
  activeNumber: number
  onSelect: (n: number) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  if (seasons.length === 0) return null

  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const dir = e.key === 'ArrowRight' ? 1 : -1
    const next = (idx + dir + seasons.length) % seasons.length
    refs.current[next]?.focus()
    onSelect(seasons[next].number)
  }

  return (
    <div
      role="tablist"
      aria-label="Saisons"
      className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {seasons.map((s, i) => {
        const active = s.number === activeNumber
        return (
          <button
            key={s.number}
            ref={(el) => { refs.current[i] = el }}
            role="tab"
            id={`season-tab-${s.number}`}
            aria-selected={active}
            aria-controls={`season-panel-${s.number}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(s.number)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`flex-shrink-0 text-left rounded-xl px-4 py-2.5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] ${active ? 'shadow-gold' : ''}`}
            style={active
              ? { background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))', border: '1px solid rgba(212,175,55,0.5)' }
              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className={`block font-inter text-[10px] uppercase tracking-widest ${active ? 'text-gold' : 'text-pearl/40'}`}>
              Saison {s.number}
            </span>
            <span className={`block font-cinzel text-sm font-bold leading-tight mt-0.5 ${active ? 'text-pearl' : 'text-pearl/60'}`}>
              {s.title}
            </span>
          </button>
        )
      })}
    </div>
  )
}
