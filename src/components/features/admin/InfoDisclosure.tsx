'use client'
/**
 * InfoDisclosure (V2.5-B.2-C) — divulgation DISCRÈTE des mentions de transparence
 * (sécurité / déterminisme / périmètre / limites). Remplace les cartes pleines par
 * une simple icône « ⓘ En savoir plus » ouvrant un popover. Transparence conservée,
 * présence visuelle réduite. Aucun effet de bord, purement présentation.
 */
import { useState } from 'react'
import { Info, X } from 'lucide-react'

export interface InfoGroup { heading: string; items: string[] }

export function InfoDisclosure({
  label = 'En savoir plus',
  title = 'Transparence & sécurité',
  groups,
  align = 'right',
}: {
  label?: string
  title?: string
  groups: InfoGroup[]
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={title}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-inter text-pearl/45 hover:text-pearl/75 transition-colors"
      >
        <Info className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} /> {label}
      </button>

      {open && (
        <>
          {/* backdrop pour fermeture au clic extérieur */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className={`absolute top-7 ${align === 'right' ? 'right-0' : 'left-0'} w-80 max-w-[86vw] rounded-xl p-4 z-50 shadow-2xl`}
            style={{ background: 'rgba(15,8,32,0.98)', border: '1px solid rgba(212,175,55,0.25)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-cinzel text-sm font-bold text-pearl">{title}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="text-pearl/30 hover:text-pearl/70">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {groups.map((g, gi) => (
                <div key={gi} className={gi < groups.length - 1 ? 'pb-3 border-b border-white/[0.06]' : ''}>
                  <p className="font-inter text-[11px] font-semibold uppercase tracking-wide text-pearl/45 mb-1.5">{g.heading}</p>
                  <ul className="space-y-1 font-inter text-xs text-pearl/60 list-disc pl-5">
                    {g.items.map((it, ii) => <li key={ii}>{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
