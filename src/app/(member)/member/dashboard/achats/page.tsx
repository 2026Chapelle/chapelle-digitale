'use client'
import { useEffect, useState } from 'react'
import { Loader2, ShoppingBag, Download, ExternalLink, BookOpen } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/components/providers/AuthProvider'
import toast from 'react-hot-toast'

interface Achat { id: string; titre: string; montant: number; devise: string; access_token: string; statut: string; created_at: string }

export default function MesAchatsPage() {
  const { isDemo } = useAuth()
  const [achats, setAchats] = useState<Achat[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (isDemo) { setLoading(false); return }
    ;(async () => {
      try { const r = await fetch('/api/member/achats', { credentials: 'same-origin' }); const j = await r.json(); if (j.ok) setAchats(j.achats || []) } catch { /* */ }
      setLoading(false)
    })()
  }, [isDemo])

  async function acceder(a: Achat) {
    setBusy(a.id)
    try {
      const r = await fetch(`/api/acces/${encodeURIComponent(a.access_token)}`)
      const j = await r.json()
      if (j.ok && j.url) window.open(j.url, '_blank', 'noopener,noreferrer')
      else toast.error(j.message || 'Accès indisponible')
    } catch { toast.error('Erreur réseau') }
    setBusy(null)
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <PageHeader eyebrow="Espace Membre" title={<>Mes <span className="text-cinematic-gold">achats</span></>}
          description="Vos ebooks, masterclass, billets et produits numériques." />

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : achats.length === 0 ? (
          <div className="card-royal text-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gold/10 border border-gold/25"><ShoppingBag className="w-7 h-7 text-gold" /></div>
            <p className="font-cinzel text-lg text-pearl/60">Aucun achat pour le moment</p>
            <p className="font-inter text-sm text-pearl/35 mt-1">Vos ebooks, masterclass et produits apparaîtront ici après achat.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achats.map((a) => (
              <div key={a.id} className="card-royal flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gold/12 border border-gold/25"><BookOpen className="w-5 h-5 text-gold" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-cinzel text-sm font-bold text-pearl truncate">{a.titre || 'Produit'}</p>
                  <p className="font-inter text-[11px] text-pearl/40">{Number(a.montant || 0).toLocaleString('fr-FR')} {a.devise} · {new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <button onClick={() => acceder(a)} disabled={busy === a.id || a.statut !== 'complete'}
                  className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0">
                  {busy === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Accéder
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
