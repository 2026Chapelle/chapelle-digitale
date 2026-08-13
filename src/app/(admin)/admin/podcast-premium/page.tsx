'use client'
/**
 * PODCAST-5C — Administration du Premium podcast (La Voix du Royaume).
 * Rechercher un membre, voir son statut Premium, accorder (durée facultative) ou révoquer.
 * S'appuie sur /api/admin/podcast-premium (garde cookie admin, primitives canoniques).
 */
import { useState, useCallback } from 'react'
import { Loader2, Search, Star, ShieldOff, Check } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

interface MemberRow {
  id: string
  prenom?: string | null
  nom?: string | null
  email?: string | null
  membre_statut?: string | null
  premium_active?: boolean
}

export default function AdminPodcastPremiumPage() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState('')
  const [msg, setMsg] = useState('')

  const search = useCallback(async () => {
    setLoading(true); setMsg(''); setSearched(true)
    try {
      const r = await fetch(`/api/admin/podcast-premium?q=${encodeURIComponent(q)}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setRows(j.data?.members || [])
      else setMsg(j.message || 'Erreur')
    } catch { setMsg('Erreur réseau') }
    setLoading(false)
  }, [q])

  const act = async (userId: string, action: 'grant' | 'revoke') => {
    setBusyId(userId); setMsg('')
    try {
      const payload: Record<string, unknown> = { action, user_id: userId }
      if (action === 'grant' && expiresAt.trim()) {
        // `datetime-local` → ISO (heure locale). Vide = à vie.
        const iso = new Date(expiresAt).toISOString()
        payload.expires_at = iso
      }
      const r = await fetch('/api/admin/podcast-premium', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (j.ok) {
        setRows((prev) => prev.map((m) => (m.id === userId ? { ...m, premium_active: !!j.data?.active } : m)))
        setMsg(action === 'grant'
          ? (j.data?.idempotent ? 'Le membre disposait déjà d’un accès actif.' : 'Accès Premium accordé.')
          : 'Accès Premium révoqué.')
      } else setMsg(j.message || 'Erreur')
    } catch { setMsg('Erreur réseau') }
    setBusyId(null)
  }

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal space-y-5">
        <PageHeader
          eyebrow="La Voix du Royaume"
          title={<>Accès <span className="text-cinematic-gold">Premium</span></>}
          description="Accordez ou révoquez manuellement le droit Premium podcast d'un membre. L'achat confirmé l'active automatiquement ; cet écran couvre les octrois et retraits manuels."
        />

        <div className="card-cinematic p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pearl/30" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') search() }}
                placeholder="Rechercher un membre (nom, prénom, email)…"
                className="input-cinematic pl-10 w-full"
                aria-label="Rechercher un membre"
              />
            </div>
            <button type="button" onClick={search} disabled={loading} className="btn-gold-cinematic inline-flex items-center gap-2 px-5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Rechercher
            </button>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-pearl/50 font-inter">
            <label htmlFor="premium-expires" className="whitespace-nowrap">Expiration à l'octroi (facultatif — vide = à vie) :</label>
            <input
              id="premium-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="input-cinematic py-1.5 text-xs"
            />
          </div>
        </div>

        {msg && <div className="card-cinematic p-3 text-sm font-inter text-pearl/80">{msg}</div>}

        {searched && !loading && rows.length === 0 && (
          <div className="card-cinematic p-6 text-center text-sm text-pearl/50 font-inter">Aucun membre trouvé.</div>
        )}

        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((m) => (
              <div key={m.id} className="card-cinematic p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-inter text-sm font-semibold text-pearl truncate">
                      {[m.prenom, m.nom].filter(Boolean).join(' ') || m.email || m.id}
                    </span>
                    {m.premium_active ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(212,175,55,0.15)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.3)' }}>
                        <Star className="w-3 h-3" /> Premium
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-pearl/35 font-inter">Standard</span>
                    )}
                  </div>
                  <div className="text-[11px] text-pearl/40 font-inter truncate">{m.email}</div>
                </div>
                {m.premium_active ? (
                  <button type="button" onClick={() => act(m.id, 'revoke')} disabled={busyId === m.id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full transition-colors"
                    style={{ background: 'rgba(220,80,80,0.12)', color: '#f2b8b8', border: '1px solid rgba(220,80,80,0.3)' }}>
                    {busyId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />} Révoquer
                  </button>
                ) : (
                  <button type="button" onClick={() => act(m.id, 'grant')} disabled={busyId === m.id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full transition-colors"
                    style={{ background: 'rgba(212,175,55,0.14)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.3)' }}>
                    {busyId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Accorder Premium
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
