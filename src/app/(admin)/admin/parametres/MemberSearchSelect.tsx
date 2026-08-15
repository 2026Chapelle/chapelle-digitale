'use client'

import { useEffect, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'

type MemberHit = {
  id: string
  prenom?: string | null
  nom?: string | null
  email?: string | null
}

function labelOf(m: MemberHit): string {
  const name = [m.prenom, m.nom].filter(Boolean).join(' ').trim()
  const email = (m.email || '').trim()
  if (name && email) return `${name} · ${email}`
  if (name) return name
  if (email) return email
  return m.id.slice(0, 8) + '…'
}

/**
 * Recherche membre debounced (GET /api/admin/membres?q=&pageSize=8).
 * Stocke user_id en interne ; affiche prénom nom · email.
 */
export function MemberSearchSelect({
  value,
  onChange,
  disabled,
  placeholder = 'Rechercher un membre (nom, email)…',
}: {
  value: string
  onChange: (userId: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<MemberHit[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!value) {
      setSelectedLabel(null)
    }
  }, [value])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/admin/membres?q=${encodeURIComponent(term)}&pageSize=8`,
          { credentials: 'same-origin' },
        )
        const j = await r.json().catch(() => ({}))
        if (cancelled) return
        if (r.ok && j?.ok) {
          setResults((j.data?.members || []) as MemberHit[])
          setOpen(true)
        } else {
          setResults([])
        }
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q])

  if (value && selectedLabel) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2">
        <span className="flex-1 text-xs font-inter text-pearl/85 truncate">{selectedLabel}</span>
        <button
          type="button"
          disabled={disabled}
          className="text-pearl/40 hover:text-pearl disabled:opacity-40"
          aria-label="Effacer la sélection"
          onClick={() => {
            onChange('')
            setSelectedLabel(null)
            setQ('')
            setResults([])
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative space-y-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-pearl/30" />
        <input
          className="input-royal w-full text-xs font-inter pl-9"
          type="search"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (results.length) setOpen(true)
          }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gold" />
        )}
      </div>
      {open && q.trim().length >= 2 && (
        <ul
          className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-auto rounded-xl border border-white/10 bg-[#12101a] shadow-xl"
          role="listbox"
        >
          {loading && results.length === 0 && (
            <li className="px-3 py-2 text-[11px] text-pearl/40 font-inter">Recherche…</li>
          )}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-[11px] text-pearl/40 font-inter">
              Aucun membre trouvé dans votre périmètre.
            </li>
          )}
          {results.map((m) => {
            const lab = labelOf(m)
            return (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  className="w-full text-left px-3 py-2 text-xs font-inter text-pearl/75 hover:bg-gold/10 hover:text-gold transition-colors"
                  onClick={() => {
                    onChange(m.id)
                    setSelectedLabel(lab)
                    setQ('')
                    setResults([])
                    setOpen(false)
                  }}
                >
                  {lab}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
