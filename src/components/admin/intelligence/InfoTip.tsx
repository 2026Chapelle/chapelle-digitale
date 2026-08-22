'use client'
/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Aide contextuelle ⓘ sur une métrique. Au survol ou au clavier, affiche la
 * définition courte issue du dictionnaire canonique. Accessible : bouton focusable,
 * aria-label, ouverture/fermeture au clavier (Entrée/Espace, Échap).
 * Si la clé est inconnue, aucun rendu (jamais d'information inventée).
 */

import { useId, useState } from 'react'
import { getMetric } from '@/lib/intelligence/guide/dictionary'

export default function InfoTip({ metricKey }: { metricKey: string }) {
  const entry = getMetric(metricKey)
  const [open, setOpen] = useState(false)
  const tipId = useId()

  if (!entry) return null

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Aide : ${entry.name}`}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-pearl/30 text-[10px] font-semibold text-pearl/50 transition hover:border-cinematic-gold/60 hover:text-cinematic-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-cinematic-gold"
      >
        i
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-1/2 top-6 z-40 w-64 -translate-x-1/2 rounded-lg border border-pearl/15 bg-abyss/95 p-3 text-left text-[11px] leading-relaxed text-pearl/75 shadow-xl backdrop-blur"
        >
          <span className="mb-1 block font-semibold text-pearl/90">{entry.name}</span>
          {entry.definition}
        </span>
      )}
    </span>
  )
}
