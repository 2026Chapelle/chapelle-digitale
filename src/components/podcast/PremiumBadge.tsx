/**
 * PODCAST-6 — Badge Premium UNIQUE (cohérence visuelle sur cartes / catalogue / playlist /
 * détail / player). Indique un NIVEAU D'ACCÈS éditorial — jamais une promo permanente.
 * Purement présentationnel (aucune I/O, aucun hook) → réutilisable partout.
 *
 * • défaut       → puce discrète « Premium » (sur une carte : contenu réservé) ;
 * • tone="active"→ « Premium actif » (état possédé par le membre), avec étoile.
 * Le positionnement (overlay/inline) est laissé à l'appelant via `className`.
 */
import { Star } from 'lucide-react'

export interface PremiumBadgeProps {
  /** 'content' = un contenu Premium (défaut) ; 'active' = le membre POSSÈDE l'accès. */
  tone?: 'content' | 'active'
  /** Libellé override (sinon dérivé du ton). */
  label?: string
  className?: string
}

export function PremiumBadge({ tone = 'content', label, className = '' }: PremiumBadgeProps) {
  const active = tone === 'active'
  const text = label ?? (active ? 'Premium actif' : 'Premium')
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-inter font-bold tracking-widest uppercase px-1.5 py-0.5 rounded ${className}`}
      style={{
        background: 'rgba(212,175,55,0.16)',
        color: '#F5E6A7',
        border: '1px solid rgba(212,175,55,0.35)',
      }}
    >
      {active && <Star className="w-2.5 h-2.5" fill="currentColor" aria-hidden />}
      {text}
    </span>
  )
}
