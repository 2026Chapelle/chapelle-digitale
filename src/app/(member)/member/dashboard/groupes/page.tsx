'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, MapPin, Calendar, Globe, Video, Star, LogOut, Check, Loader2, MessageCircle,
  ShieldCheck, UserCheck, X, ChevronDown, ChevronRight, Crown,
} from 'lucide-react'
import toast from 'react-hot-toast'

/** Libellés (8 plateformes fixes + types) — aucune donnée fictive. */
const PLATEFORMES: Record<string, string> = {
  cier: 'CIER', 'familles-chapelle': 'Familles de la Chapelle', 'chapelle-familiale': 'Chapelle Familiale',
  jeunesse: 'Jeunesse', 'femmes-exceptions': "Femmes d'Exceptions", 'cite-refuge': 'Cité du Refuge',
  mahanaim: 'Mahanaïm', cfic: 'CFIC / Académie des Élus',
}
const TYPES: Record<string, string> = {
  cellule: 'Cellule', groupe_priere: 'Groupe de prière', equipe_service: 'Équipe de service',
  equipe_ministere: 'Équipe de ministère', formation: 'Formation', departement: 'Département',
}
const platLabel = (id?: string | null) => (id && PLATEFORMES[id]) || id || '—'
const typeLabel = (t?: string | null) => (t && TYPES[t]) || t || '—'
const roleLabel = (r?: string | null) => r === 'leader' ? 'Leader' : r === 'co-leader' ? 'Co-leader' : 'Membre'

async function api(action: string, payload: Record<string, unknown> = {}) {
  const r = await fetch('/api/member/groupes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
    body: JSON.stringify({ action, ...payload }),
  })
  return r.json()
}

export default function MesGroupesPage() {
  const [tab, setTab] = useState<'mes-groupes' | 'decouvrir' | 'animation'>('mes-groupes')
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [mes, setMes] = useState<any[]>([])
  const [annuaire, setAnnuaire] = useState<any[]>([])
  const [demandes, setDemandes] = useState<any[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  // Vue animation (leader / périmètre)
  const [canManage, setCanManage] = useState(false)
  const [managed, setManaged] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/member/groupes', { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) { setDemo(true); setLoading(false); return }
      if (j.ok) {
        setMes(j.data.mes_groupes || [])
        setAnnuaire(j.data.annuaire || [])
        setDemandes(j.data.demandes || [])
      }
    } catch { /* noop */ }
    setLoading(false)
  }, [])

  const loadManage = useCallback(async () => {
    try {
      const r = await fetch('/api/member/groupes?manage=1', { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) { setCanManage(true); setManaged(j.data || []); setPending(j.demandes || []) }
      else { setCanManage(false); setManaged([]); setPending([]) }
    } catch { setCanManage(false) }
  }, [])

  useEffect(() => { load(); loadManage() }, [load, loadManage])

  const mesActifs = mes.filter((m) => m.statut === 'actif')
  const demandeGroupIds = new Set(demandes.map((d) => d.group_id))
  const mesGroupIds = new Set(mesActifs.map((m) => m.groupe_id))

  async function act(key: string, action: string, payload: Record<string, unknown>, after: () => Promise<void> | void = load) {
    setBusy(key)
    try {
      const j = await api(action, payload)
      if (j.ok) { toast.success('Effectué ✓'); await after() }
      else toast.error(j.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
    setBusy(null)
  }

  async function toggleGroupMembers(groupeId: string) {
    if (openGroup === groupeId) { setOpenGroup(null); return }
    setOpenGroup(groupeId)
    if (!groupMembers[groupeId]) {
      try {
        const r = await fetch(`/api/member/groupes?manage=1&members=${groupeId}`, { credentials: 'same-origin' })
        const j = await r.json()
        if (j.ok) setGroupMembers((m) => ({ ...m, [groupeId]: j.data || [] }))
      } catch { /* noop */ }
    }
  }

  if (demo) return (
    <div className="min-h-screen pt-24 pb-16"><div className="container-royal">
      <div className="card-royal p-8 text-center text-pearl/60 font-inter">Mode démo : connectez Supabase pour gérer vos groupes.</div>
    </div></div>
  )

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        {/* Header */}
        <div className="mb-8">
          <div className="section-label mb-2">Espace Membre</div>
          <h1 className="font-cinzel font-black text-pearl" style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', lineHeight: 1.05 }}>
            Mes <span className="text-cinematic-gold">Groupes</span>
          </h1>
          <p className="text-pearl/50 text-sm font-inter mt-2">Votre communauté de croissance — cellules, équipes et groupes.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {([['mes-groupes', 'Mes Groupes'], ['decouvrir', 'Découvrir']] as const).map(([t, label]) => (
            <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{label}</TabBtn>
          ))}
          {canManage && <TabBtn active={tab === 'animation'} onClick={() => setTab('animation')}>Animation</TabBtn>}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="card-royal h-32 animate-pulse opacity-40" />)}</div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ── MES GROUPES ── */}
            {tab === 'mes-groupes' && (
              <motion.div key="mes" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {mes.length === 0 ? (
                  <EmptyState title="Vous n'appartenez à aucun groupe" hint="Découvrez les groupes disponibles et envoyez une demande d'adhésion.">
                    <button onClick={() => setTab('decouvrir')} className="btn-gold text-sm px-5 py-2.5 mt-4">Découvrir les groupes</button>
                  </EmptyState>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {mes.map((m) => {
                      const g = m.groupe
                      const pending = m.statut === 'en_attente'
                      return (
                        <div key={m.groupe_id} className="card-royal" style={{ borderColor: m.is_primary ? 'rgba(212,175,55,0.35)' : undefined }}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <div className="text-[10px] uppercase tracking-widest font-inter" style={{ color: '#D4AF37' }}>{platLabel(g?.plateforme_id)}</div>
                              <h3 className="font-cinzel text-base font-bold text-pearl truncate">{g?.nom}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {m.is_primary && <Badge color="#D4AF37"><Star className="w-3 h-3" /> Principal</Badge>}
                              {pending && <Badge color="#F59E0B">En attente</Badge>}
                              {m.role !== 'membre' && <Badge color="#22C55E"><Crown className="w-3 h-3" /> {roleLabel(m.role)}</Badge>}
                            </div>
                          </div>
                          <Meta g={g} />
                          {!pending && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {!m.is_primary && (
                                <button disabled={busy === `prim-${m.groupe_id}`} onClick={() => act(`prim-${m.groupe_id}`, 'set_primary', { groupe_id: m.groupe_id })}
                                  className="btn-ghost text-xs py-2 px-3 inline-flex items-center gap-1.5 disabled:opacity-50">
                                  <Star className="w-3.5 h-3.5" /> Définir comme principal
                                </button>
                              )}
                              <Link href="/member/dashboard/messages" className="btn-ghost text-xs py-2 px-3 inline-flex items-center gap-1.5">
                                <MessageCircle className="w-3.5 h-3.5" /> Message
                              </Link>
                              <button disabled={busy === `leave-${m.groupe_id}`} onClick={() => { if (confirm('Quitter ce groupe ?')) act(`leave-${m.groupe_id}`, 'leave', { groupe_id: m.groupe_id }) }}
                                className="text-xs py-2 px-3 rounded-xl inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <LogOut className="w-3.5 h-3.5" /> Quitter
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── DÉCOUVRIR ── */}
            {tab === 'decouvrir' && (
              <motion.div key="dec" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {annuaire.length === 0 ? (
                  <EmptyState title="Aucun groupe disponible pour le moment" hint="De nouveaux groupes seront bientôt proposés." />
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {annuaire.map((g) => {
                      const already = mesGroupIds.has(g.id)
                      const requested = demandeGroupIds.has(g.id)
                      const cap = g.capacite_max ?? 0, cnt = g.membres_count ?? 0
                      const full = cap > 0 && cnt >= cap
                      const disabled = already || requested || full || busy === `join-${g.id}`
                      return (
                        <div key={g.id} className="card-royal">
                          <div className="text-[10px] uppercase tracking-widest font-inter mb-0.5" style={{ color: '#D4AF37' }}>{platLabel(g.plateforme_id)}</div>
                          <h3 className="font-cinzel text-sm font-bold text-pearl mb-1">{g.nom}</h3>
                          {g.description && <p className="text-xs text-pearl/45 font-inter line-clamp-2 mb-2">{g.description}</p>}
                          <Meta g={g} />
                          <button disabled={disabled}
                            onClick={() => act(`join-${g.id}`, 'join', { groupe_id: g.id }, load)}
                            className="w-full mt-4 py-2 rounded-xl text-xs font-inter font-semibold transition-all disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                            style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}>
                            {already ? <><Check className="w-3.5 h-3.5" /> Déjà membre</>
                              : requested ? <><Check className="w-3.5 h-3.5" /> Demande envoyée</>
                              : full ? 'Complet'
                              : busy === `join-${g.id}` ? 'Envoi…' : 'Rejoindre'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── ANIMATION (leader / périmètre) ── */}
            {tab === 'animation' && canManage && (
              <motion.div key="anim" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Demandes en attente */}
                <div className="card-royal">
                  <h3 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2"><UserCheck className="w-4 h-4 text-gold" /> Demandes d'adhésion ({pending.length})</h3>
                  {pending.length === 0 ? (
                    <p className="text-xs text-pearl/35 font-inter">Aucune demande en attente.</p>
                  ) : (
                    <div className="space-y-2">
                      {pending.map((d) => (
                        <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/5 p-3">
                          <div className="min-w-0">
                            <p className="text-sm text-pearl/80 font-inter truncate">{d.user_nom || d.user_email || 'Membre'}</p>
                            <p className="text-[11px] text-pearl/35 font-inter">souhaite rejoindre « {d.group_nom} »</p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button disabled={busy === `app-${d.id}`} onClick={() => act(`app-${d.id}`, 'approve_request', { id: d.id }, async () => { await load(); await loadManage() })}
                              className="p-2 rounded-lg transition-colors disabled:opacity-50" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }} title="Approuver"><Check className="w-4 h-4" /></button>
                            <button disabled={busy === `rej-${d.id}`} onClick={() => act(`rej-${d.id}`, 'reject_request', { id: d.id }, loadManage)}
                              className="p-2 rounded-lg transition-colors disabled:opacity-50" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }} title="Refuser"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Groupes animés */}
                <div className="card-royal">
                  <h3 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-gold" /> Groupes que j'anime ({managed.length})</h3>
                  {managed.length === 0 ? (
                    <p className="text-xs text-pearl/35 font-inter">Aucun groupe à animer.</p>
                  ) : (
                    <div className="space-y-2">
                      {managed.map((g) => (
                        <div key={g.id} className="rounded-xl bg-white/[0.02] border border-white/5">
                          <button onClick={() => toggleGroupMembers(g.id)} className="w-full flex items-center justify-between gap-3 p-3 text-left">
                            <div className="min-w-0">
                              <p className="text-sm text-pearl/80 font-inter truncate">{g.nom}</p>
                              <p className="text-[11px] text-pearl/35 font-inter">{typeLabel(g.type)} · {platLabel(g.plateforme_id)} · {g.membres_count} membre(s)</p>
                            </div>
                            {openGroup === g.id ? <ChevronDown className="w-4 h-4 text-pearl/40" /> : <ChevronRight className="w-4 h-4 text-pearl/40" />}
                          </button>
                          {openGroup === g.id && (
                            <div className="px-3 pb-3 space-y-1.5">
                              {!groupMembers[g.id] ? (
                                <div className="flex items-center gap-2 text-xs text-pearl/40 font-inter py-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…</div>
                              ) : groupMembers[g.id].length === 0 ? (
                                <p className="text-xs text-pearl/35 font-inter py-2">Aucun membre.</p>
                              ) : groupMembers[g.id].filter((m: any) => m.statut === 'actif').map((m: any) => (
                                <div key={m.user_id} className="flex items-center justify-between gap-2 text-xs font-inter py-1.5 border-b border-white/[0.03] last:border-0">
                                  <span className="text-pearl/70 truncate">{m.profile ? `${m.profile.prenom ?? ''} ${m.profile.nom ?? ''}`.trim() || m.profile.email : m.user_id}</span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {m.is_primary && <Star className="w-3 h-3" style={{ color: '#D4AF37' }} />}
                                    <span className="text-pearl/40">{roleLabel(m.role)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <div className="mt-8">
          <Link href="/groupes" className="btn-ghost text-sm py-2.5 px-4 inline-flex items-center gap-2"><Globe className="w-4 h-4" /> Annuaire de tous les groupes</Link>
        </div>
      </div>
    </div>
  )
}

// ── Sous-composants ──────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="px-5 py-2 rounded-xl text-sm font-inter font-medium transition-all"
      style={{ background: active ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)', color: active ? '#D4AF37' : 'rgba(255,255,255,0.45)', border: `1px solid ${active ? 'rgba(212,175,55,0.3)' : 'transparent'}` }}>
      {children}
    </button>
  )
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-[9px] font-inter font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${color}1f`, color }}>{children}</span>
}

function Meta({ g }: { g: any }) {
  if (!g) return null
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-inter text-pearl/45">
      <span className="inline-flex items-center gap-1">{g.est_virtuel ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}{g.est_virtuel ? 'En ligne' : (g.ville || typeLabel(g.type))}</span>
      {(g.jour_reunion || g.heure_reunion) && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{[g.jour_reunion, g.heure_reunion].filter(Boolean).join(' · ')}</span>}
      {typeof g.membres_count === 'number' && <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{g.membres_count}{g.capacite_max > 0 ? `/${g.capacite_max}` : ''}</span>}
    </div>
  )
}

function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="card-royal text-center py-14">
      <Users className="w-8 h-8 mx-auto mb-3 text-gold/40" />
      <p className="font-inter text-sm text-pearl/55">{title}</p>
      {hint && <p className="font-inter text-xs text-pearl/30 mt-1">{hint}</p>}
      {children}
    </div>
  )
}
