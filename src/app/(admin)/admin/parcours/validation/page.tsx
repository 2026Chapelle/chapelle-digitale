'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, ShieldCheck, Clock, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { AXIS_LABELS_FR, type ValidatableAxis } from '@/lib/canonical/validation-service'
import { AxisValidator } from '@/components/features/admin/JourneyValidation'

interface PendingAxis { axis: ValidatableAxis; currentLabel: string; currentValue: string | null }
interface QueueItem { profileId: string; displayName: string; email: string | null; updatedAt: string | null; pending: PendingAxis[] }

function fmt(iso?: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '—' }
}

/**
 * FILE DE REVUE PASTORALE (Phase 3C) — chaque membre dont un axe canonique est en
 * « à valider ». Le responsable choisit la valeur reconnue + une justification, puis
 * valide (mutation ATOMIQUE + audit nominatif). Aucune promotion automatique.
 */
export default function JourneyValidationQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/journey-review-queue', { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) { setItems(j.data.items || []); setPendingCount(j.data.pendingCount || 0) }
      else toast.error(j.message || 'Chargement impossible')
    } catch { toast.error('Erreur réseau') }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link href="/admin/parcours" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Parcours
            </Link>
            <h1 className="font-cinzel text-2xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-gold" /> Validation pastorale
            </h1>
            <p className="text-sm text-white/50 mt-1 max-w-2xl">
              Changements de parcours (croissance / statut communautaire) en attente d&apos;une reconnaissance humaine.
              Chaque validation est atomique et tracée nominativement.
            </p>
          </div>
          <div className="text-center px-5 py-3 rounded-2xl flex-shrink-0" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="font-cinzel text-3xl font-black text-gold">{pendingCount}</div>
            <div className="text-[10px] text-white/45 mt-0.5">axe(s) à valider</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/40"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <CheckCircle2 className="w-10 h-10 text-green-400/70 mx-auto mb-3" />
            <p className="text-white/60 font-inter">Aucune validation en attente. Tout est reconnu. ✓</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <QueueRow key={it.profileId} item={it} open={openId === it.profileId}
                onToggle={() => setOpenId(openId === it.profileId ? null : it.profileId)}
                onValidated={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QueueRow({ item, open, onToggle, onValidated }: { item: QueueItem; open: boolean; onToggle: () => void; onValidated: () => void }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.02]">
        <div className="min-w-0">
          <div className="font-inter text-sm font-semibold text-white truncate">{item.displayName}</div>
          <div className="text-[11px] text-white/40 flex items-center gap-2 mt-0.5">
            <Clock className="w-3 h-3" /> Mis à jour {fmt(item.updatedAt)}
            {item.email ? <span className="truncate">· {item.email}</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.pending.map((p) => (
            <span key={p.axis} className="text-[10px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1"
              style={{ background: 'rgba(245,158,11,0.14)', color: '#F59E0B' }}>
              <AlertTriangle className="w-3 h-3" /> {AXIS_LABELS_FR[p.axis]}
            </span>
          ))}
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-white/5">
          <div className="flex items-center justify-between pt-3">
            <span className="text-[11px] text-white/40">Fiche complète</span>
            <Link href={`/admin/membres/${item.profileId}`} className="text-[11px] text-gold hover:underline">Ouvrir le dossier 360° →</Link>
          </div>
          {item.pending.map((p) => (
            <AxisValidator key={p.axis} profileId={item.profileId} axis={p.axis} currentLabel={p.currentLabel}
              currentValue={p.currentValue} needsReview onValidated={onValidated} />
          ))}
        </div>
      )}
    </div>
  )
}
