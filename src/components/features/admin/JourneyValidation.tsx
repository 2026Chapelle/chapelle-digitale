'use client'
import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck, Crown, History, AlertTriangle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { axisOptions, AXIS_LABELS_FR, type ValidatableAxis } from '@/lib/canonical/validation-service'

/**
 * COMPOSANTS PARTAGÉS DE VALIDATION PASTORALE (Phase 3C).
 *  - AxisValidator : panneau de validation d'UN axe (valeur reconnue + justification → RPC atomique).
 *  - PastoralRecognitionBlock : bloc « Reconnaissance pastorale » de la fiche 360° (état + audit + validation).
 * Réutilisés par la file de revue (/admin/parcours/validation) et le dossier membre.
 */

function fmt(iso?: string | null, withTime = false) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    })
  } catch { return '—' }
}

export function AxisValidator({ profileId, axis, currentLabel, currentValue, needsReview, onValidated }: {
  profileId: string; axis: ValidatableAxis; currentLabel: string; currentValue: string | null
  needsReview?: boolean; onValidated: () => void
}) {
  const opts = axisOptions(axis)
  const [value, setValue] = useState<string>(currentValue || '')
  const [justif, setJustif] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!value) { toast.error('Choisissez une valeur reconnue.'); return }
    if (!justif.trim()) { toast.error('Une justification pastorale est requise.'); return }
    setBusy(true)
    try {
      const r = await fetch('/api/admin/journey-validation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ member_id: profileId, axis, new_value: value, justification: justif.trim() }),
      })
      const j = await r.json()
      if (j.ok) { toast.success('Validé ✓ — reconnaissance enregistrée'); setJustif(''); onValidated() }
      else toast.error(j.message || 'Échec de la validation')
    } catch { toast.error('Erreur réseau') }
    setBusy(false)
  }

  return (
    <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <span className="text-xs font-semibold text-white/80">{AXIS_LABELS_FR[axis]}</span>
        <span className="text-[11px] text-white/40 inline-flex items-center gap-1.5">
          Actuel : <span className={needsReview ? 'text-amber-400/90' : 'text-white/70'}>{currentLabel}</span>
          {needsReview
            ? <span className="inline-flex items-center gap-1 text-amber-400/90"><AlertTriangle className="w-3 h-3" /> à valider</span>
            : <span className="inline-flex items-center gap-1 text-green-400/80"><CheckCircle2 className="w-3 h-3" /> confirmé</span>}
        </span>
      </div>
      <div className="grid sm:grid-cols-[180px_1fr] gap-2.5 items-start">
        <select value={value} onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-gold/40">
          <option value="">— Valeur reconnue —</option>
          {opts.map((o) => <option key={o.value} value={o.value} className="bg-[#0B0717]">{o.label}</option>)}
        </select>
        <textarea value={justif} onChange={(e) => setJustif(e.target.value)} rows={2} maxLength={1000}
          placeholder="Justification pastorale (obligatoire, tracée nominativement)…"
          className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/40 resize-none" />
      </div>
      <div className="flex justify-end mt-2.5">
        <button onClick={submit} disabled={busy}
          className="btn-gold inline-flex items-center gap-1.5 text-xs px-4 py-2 disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          {needsReview ? 'Valider cette reconnaissance' : 'Reconnaître un changement'}
        </button>
      </div>
    </div>
  )
}

interface AxesData {
  growth_level: string | null; growth_label: string; growth_review_state: string
  community_status: string | null; community_label: string; community_review_state: string
  updated_at: string | null
}
interface HistoryRow { id: string; axis: string; old_label: string; new_label: string; actor_label: string | null; justification: string | null; provenance: string; created_at: string }
interface MinistryRow { key: string; label: string }

/** Bloc « Reconnaissance pastorale » de la fiche 360° d'un membre (Phase 3C). */
export function PastoralRecognitionBlock({ memberId }: { memberId: string }) {
  const [axes, setAxes] = useState<AxesData | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [ministries, setMinistries] = useState<MinistryRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/journey-validation?member_id=${memberId}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) { setAxes(j.data.axes); setHistory(j.data.history || []); setMinistries(j.data.ministries || []) }
    } catch { /* noop */ }
    setLoading(false)
  }, [memberId])
  useEffect(() => { load() }, [load])

  const growthNeeds = !axes || axes.growth_review_state === 'requires_review'
  const communityNeeds = !axes || axes.community_review_state === 'requires_review'

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-4 h-4 text-gold" />
        <h3 className="font-cinzel text-base font-bold text-pearl">Reconnaissance pastorale</h3>
        <span className="text-[10px] text-white/35 ml-1">Parcours du Royaume</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-white/40"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {ministries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ministries.map((m) => (
                <span key={m.key} className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.14)', color: '#A78BFA' }}>{m.label}</span>
              ))}
            </div>
          )}

          <AxisValidator profileId={memberId} axis="growth_level"
            currentLabel={axes?.growth_label ?? '—'} currentValue={axes?.growth_level ?? null}
            needsReview={growthNeeds} onValidated={load} />
          <AxisValidator profileId={memberId} axis="community_status"
            currentLabel={axes?.community_label ?? '—'} currentValue={axes?.community_status ?? null}
            needsReview={communityNeeds} onValidated={load} />

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50 mb-2 mt-1">
              <History className="w-3.5 h-3.5" /> Historique des validations (nominatif)
            </div>
            {history.length === 0 ? (
              <p className="text-[11px] text-white/35 italic">Aucune validation enregistrée.</p>
            ) : (
              <ul className="space-y-2">
                {history.slice(0, 8).map((h) => (
                  <li key={h.id} className="text-[11px] rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white/75 font-medium">{AXIS_LABELS_FR[h.axis as ValidatableAxis] ?? h.axis} : {h.old_label} → <span className="text-gold">{h.new_label}</span></span>
                      <span className="text-white/35 flex-shrink-0">{fmt(h.created_at, true)}</span>
                    </div>
                    <div className="text-white/45 mt-1">
                      Par <span className="text-white/65">{h.actor_label || 'inconnu'}</span>
                      {h.provenance !== 'pastoral_validation' ? <span className="text-white/30"> · {h.provenance}</span> : null}
                    </div>
                    {h.justification ? <div className="text-white/50 mt-1 italic">« {h.justification} »</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
