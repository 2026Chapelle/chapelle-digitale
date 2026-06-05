'use client'
import { useState } from 'react'
import Link from 'next/link'
import { HelpCircle, X, ArrowRight } from 'lucide-react'

/**
 * Bulle d'aide DISCRÈTE : une icône « ? » qui révèle un texte court + un lien
 * « Voir le guide ». Aucune logique métier. Réutilisable (inline ou flottante).
 */
export function HelpTooltip({ guideId, title, tip, floating = false }: {
  guideId: string
  title?: string
  tip: string
  floating?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={floating ? 'fixed bottom-5 right-5 z-40' : 'relative inline-flex'}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Aide contextuelle"
        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
        style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div
          className={`${floating ? 'bottom-10 right-0' : 'top-9 right-0'} absolute w-64 rounded-xl p-3.5 shadow-xl z-50`}
          style={{ background: 'rgba(15,8,32,0.98)', border: '1px solid rgba(212,175,55,0.25)' }}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            {title && <p className="font-cinzel text-xs font-bold text-pearl">{title}</p>}
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="text-pearl/30 hover:text-pearl/70 -mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="font-inter text-xs text-pearl/60 leading-relaxed mb-2.5">{tip}</p>
          <Link
            href={`/admin/aide#guide-${guideId}`}
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-[11px] font-inter font-semibold"
            style={{ color: '#D4AF37' }}
          >
            Voir le guide <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
