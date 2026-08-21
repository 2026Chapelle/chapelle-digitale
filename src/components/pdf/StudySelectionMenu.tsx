'use client'
/**
 * CITADELLE LIVING BOOKS — LB-2 : menu contextuel de sélection (premium, compact).
 *
 * Apparaît près d'une sélection de texte : Surligner (5 couleurs), Note, Signet,
 * Copier. Ne masque pas le texte (positionné au-dessus de la sélection). Desktop +
 * mobile. N'a AUCUNE logique de persistance : émet des intentions au parent.
 */
import { Highlighter, StickyNote, Bookmark, Copy } from 'lucide-react'
import { HIGHLIGHT_HEX, type HighlightColor } from '@/lib/study/study-service'

const COLORS: { key: HighlightColor; label: string }[] = [
  { key: 'gold', label: 'Or Citadelle' },
  { key: 'yellow', label: 'Jaune doux' },
  { key: 'blue', label: 'Bleu' },
  { key: 'violet', label: 'Violet' },
  { key: 'green', label: 'Vert' },
]

export function StudySelectionMenu({
  x, y, onHighlight, onNote, onBookmark, onCopy, onDismiss,
}: {
  x: number
  y: number
  onHighlight: (c: HighlightColor) => void
  onNote: () => void
  onBookmark: () => void
  onCopy: () => void
  onDismiss: () => void
}) {
  return (
    <div
      role="menu"
      aria-label="Actions sur la sélection"
      className="fixed z-[90] flex items-center gap-1 rounded-xl px-2 py-1.5 shadow-2xl"
      style={{
        left: Math.max(8, Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 260)),
        top: Math.max(8, y - 8),
        transform: 'translate(-50%, -100%)',
        background: 'rgba(14,10,22,0.98)',
        border: '1px solid rgba(212,175,55,0.35)',
        backdropFilter: 'blur(8px)',
      }}
      onMouseDown={(e) => e.preventDefault()} // ne pas perdre la sélection
    >
      <span className="flex items-center gap-1 pr-1.5" style={{ borderRight: '1px solid rgba(255,255,255,0.1)' }}>
        <Highlighter className="w-3.5 h-3.5 text-pearl/50" />
        {COLORS.map((c) => (
          <button
            key={c.key}
            onClick={() => onHighlight(c.key)}
            aria-label={`Surligner ${c.label}`}
            title={c.label}
            className="w-5 h-5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            style={{ background: HIGHLIGHT_HEX[c.key], border: '1px solid rgba(0,0,0,0.25)' }}
          />
        ))}
      </span>
      <MenuBtn icon={<StickyNote className="w-4 h-4" />} label="Note" onClick={onNote} />
      <MenuBtn icon={<Bookmark className="w-4 h-4" />} label="Signet" onClick={onBookmark} />
      <MenuBtn icon={<Copy className="w-4 h-4" />} label="Copier" onClick={() => { onCopy(); onDismiss() }} />
    </div>
  )
}

function MenuBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-pearl/75 hover:text-pearl hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
    >
      {icon}
    </button>
  )
}
