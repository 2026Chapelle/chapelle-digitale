'use client'
/**
 * Composer les formations d'un parcours — liaison no-code de la table de jonction
 * `parcours_formations` (id, parcours_id, formation_id, ordre).
 *
 * Réutilise UNIQUEMENT l'API LMS existante (/api/admin/lms/*). Aucune migration,
 * aucune nouvelle route, aucune modification de CmsManager. L'ordre pilote la
 * séquence de déverrouillage côté membre (parcours-gate-server) — d'où l'avertissement.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, ArrowUp, ArrowDown, Trash2, AlertTriangle, GraduationCap, Layers } from 'lucide-react'

const LMS = '/api/admin/lms'

interface Parcours { id: string; titre?: string; slug?: string; status?: string }
interface Formation { id: string; titre?: string; type?: string; statut?: string }
interface Lien { id: string; parcours_id: string; formation_id: string; ordre: number }

const parcoursStatut = (s?: string) => (s === 'published' ? 'publié' : 'brouillon')
const formationStatut = (s?: string) => (s === 'publie' ? 'publié' : s === 'archive' ? 'archivé' : 'brouillon')

export function ParcoursFormationsManager() {
  const [parcours, setParcours] = useState<Parcours[]>([])
  const [formations, setFormations] = useState<Formation[]>([])
  const [liens, setLiens] = useState<Lien[]>([])
  const [selected, setSelected] = useState('')
  const [addId, setAddId] = useState('')
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rp, rf, rl] = await Promise.all([
        fetch(`${LMS}/parcours`, { credentials: 'same-origin' }),
        fetch(`${LMS}/formations`, { credentials: 'same-origin' }),
        fetch(`${LMS}/parcours_formations`, { credentials: 'same-origin' }),
      ])
      const [jp, jf, jl] = await Promise.all([rp.json(), rf.json(), rl.json()])
      if (jp.demo || jf.demo || jl.demo) { setDemo(true); setLoading(false); return }
      if (jp.ok) setParcours(jp.data || [])
      if (jf.ok) setFormations(jf.data || [])
      if (jl.ok) setLiens(jl.data || [])
      if (!jp.ok || !jf.ok || !jl.ok) setError('Certaines listes n’ont pas pu être chargées. Réessayez.')
    } catch { setError('Erreur réseau — impossible de charger les listes.') }
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const refreshLiens = useCallback(async () => {
    try {
      const r = await fetch(`${LMS}/parcours_formations`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setLiens(j.data || [])
    } catch { /* garde l'état courant */ }
  }, [])

  const formationsById = useMemo(() => new Map(formations.map((f) => [f.id, f])), [formations])

  const liensDuParcours = useMemo(
    () => liens.filter((l) => l.parcours_id === selected).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
    [liens, selected],
  )

  const disponibles = useMemo(() => {
    const linked = new Set(liensDuParcours.map((l) => l.formation_id))
    return formations.filter((f) => !linked.has(f.id))
  }, [formations, liensDuParcours])

  async function add() {
    if (!selected || !addId || busy) return
    setBusy(true); setError(null)
    try {
      const nextOrdre = liensDuParcours.reduce((m, l) => Math.max(m, l.ordre ?? 0), -1) + 1
      const r = await fetch(`${LMS}/parcours_formations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ parcours_id: selected, formation_id: addId, ordre: nextOrdre }),
      })
      const j = await r.json()
      if (j.ok) { setAddId(''); await refreshLiens() }
      else {
        const m = String(j.message || '').toLowerCase()
        setError(m.includes('duplicate') || m.includes('unique') ? 'Cette formation est déjà associée à ce parcours.' : (j.message || 'Ajout impossible.'))
      }
    } catch { setError('Erreur réseau pendant l’ajout.') }
    setBusy(false)
  }

  async function remove(l: Lien) {
    if (busy) return
    if (!confirm('Retirer cette formation du parcours ? La formation elle-même n’est pas supprimée.')) return
    setBusy(true); setError(null)
    try {
      const r = await fetch(`${LMS}/parcours_formations`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ id: l.id }),
      })
      const j = await r.json()
      if (j.ok) await refreshLiens(); else setError(j.message || 'Retrait impossible.')
    } catch { setError('Erreur réseau pendant le retrait.') }
    setBusy(false)
  }

  async function move(l: Lien, dir: -1 | 1) {
    if (busy) return
    const idx = liensDuParcours.findIndex((x) => x.id === l.id)
    const swap = liensDuParcours[idx + dir]
    if (!swap) return
    setBusy(true); setError(null)
    try {
      const la = l.ordre ?? idx
      const lb = swap.ordre ?? (idx + dir)
      // Ordres distincts requis pour un vrai échange ; sinon on retombe sur les index.
      const newL = la === lb ? idx + dir : lb
      const newSwap = la === lb ? idx : la
      await fetch(`${LMS}/parcours_formations`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: l.id, ordre: newL }) })
      await fetch(`${LMS}/parcours_formations`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: swap.id, ordre: newSwap }) })
      await refreshLiens()
    } catch { setError('Erreur réseau pendant le réordonnancement.') }
    setBusy(false)
  }

  return (
    <section className="bg-abyss pb-20">
      <div className="container-royal">
        <div className="card-cinematic p-5 md:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4" style={{ color: '#D4AF37' }} />
            <h2 className="font-cinzel text-lg font-bold text-pearl">Composer les formations d’un parcours</h2>
          </div>
          <p className="font-inter text-sm text-pearl/50 mb-4">
            Organisez les formations qui composent un parcours — ajout, retrait et ordre, sans SQL ni identifiant technique.
          </p>

          {/* Avertissement impact progression */}
          <div className="flex items-start gap-2 p-3 mb-5 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <p className="font-inter text-xs" style={{ color: '#F59E0B' }}>
              L’ordre des formations peut influencer la progression et le déverrouillage des parcours côté membre.
            </p>
          </div>

          {error && <div className="card-cinematic p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

          {demo ? (
            <p className="font-inter text-sm text-pearl/50">Mode démo : connectez Supabase pour composer les parcours.</p>
          ) : loading ? (
            <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-8"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
          ) : (
            <>
              {/* Sélecteur de parcours */}
              <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Parcours</label>
              <select value={selected} onChange={(e) => { setSelected(e.target.value); setAddId('') }} className="input-royal mb-6">
                <option value="">— Sélectionnez un parcours —</option>
                {parcours.map((p) => (
                  <option key={p.id} value={p.id}>{`${p.titre || 'Sans titre'} — ${parcoursStatut(p.status)}`}</option>
                ))}
              </select>

              {!selected ? (
                <p className="font-inter text-sm text-pearl/40 py-4">Sélectionnez un parcours pour composer son contenu.</p>
              ) : (
                <>
                  {/* Formations associées */}
                  <h3 className="font-cinzel text-sm font-bold text-pearl mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-gold" /> Formations associées ({liensDuParcours.length})
                  </h3>

                  {liensDuParcours.length === 0 ? (
                    <p className="font-inter text-sm text-pearl/40 mb-6">Aucune formation associée pour l’instant.</p>
                  ) : (
                    <div className="space-y-2 mb-6">
                      {liensDuParcours.map((l, i) => {
                        const f = formationsById.get(l.formation_id)
                        return (
                          <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-inter text-sm text-pearl/85 truncate">{f?.titre || <span className="text-danger">Formation introuvable ({l.formation_id.slice(0, 8)}…)</span>}</p>
                              {f && (
                                <p className="font-inter text-[11px] text-pearl/40">
                                  {f.type ? <span className="capitalize">{f.type}</span> : null}{f.type ? ' · ' : ''}{formationStatut(f.statut)} · ordre {l.ordre ?? '—'}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => move(l, -1)} disabled={i === 0 || busy} title="Monter" className="text-pearl/40 hover:text-gold disabled:opacity-20 p-1.5"><ArrowUp className="w-4 h-4" /></button>
                              <button onClick={() => move(l, 1)} disabled={i === liensDuParcours.length - 1 || busy} title="Descendre" className="text-pearl/40 hover:text-gold disabled:opacity-20 p-1.5"><ArrowDown className="w-4 h-4" /></button>
                              <button onClick={() => remove(l)} disabled={busy} title="Retirer du parcours" className="text-pearl/40 hover:text-danger disabled:opacity-30 p-1.5"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Ajouter une formation */}
                  <label className="block text-xs font-semibold text-pearl/50 font-inter mb-1.5 uppercase tracking-wider">Ajouter une formation</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select value={addId} onChange={(e) => setAddId(e.target.value)} disabled={disponibles.length === 0 || busy} className="input-royal flex-1">
                      <option value="">{disponibles.length === 0 ? 'Aucune formation disponible à associer' : '— Choisir une formation —'}</option>
                      {disponibles.map((f) => (
                        <option key={f.id} value={f.id}>{`${f.titre || 'Sans titre'}${f.type ? ' · ' + f.type : ''} — ${formationStatut(f.statut)}`}</option>
                      ))}
                    </select>
                    <button onClick={add} disabled={!addId || busy} className="btn-gold-cinematic px-4 py-2 text-sm justify-center disabled:opacity-40 inline-flex items-center gap-1.5">
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ajouter
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
