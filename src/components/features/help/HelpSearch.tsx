'use client'
import { Search, X } from 'lucide-react'

/** Champ de recherche contrôlé du Centre d'aide. Présentation pure (état géré par la page). */
export function HelpSearch({ value, onChange, placeholder = 'Rechercher un guide…' }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-royal pl-11 pr-10 w-full"
        aria-label="Rechercher dans l'aide"
      />
      {value && (
        <button onClick={() => onChange('')} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 text-pearl/30 hover:text-pearl/70">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
