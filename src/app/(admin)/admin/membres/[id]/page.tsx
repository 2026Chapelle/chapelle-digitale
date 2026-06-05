'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Mail, Phone, MapPin, CalendarDays, Clock, ShieldCheck, UserCog,
  GraduationCap, Award, HandHeart, BookOpen, Bell, MessageSquare, Users as UsersIcon,
  HeartHandshake, StickyNote, History, KeyRound, Ban, RotateCcw, Trash2, Archive, Send,
  Activity, AlertTriangle, CalendarCheck,
} from 'lucide-react'

const scoreColor = (v: number) => v >= 76 ? '#22C55E' : v >= 51 ? '#84CC16' : v >= 26 ? '#F59E0B' : '#EF4444'
const alertStyle = (lvl: string) => lvl === 'alert' ? { bg: 'rgba(239,68,68,0.12)', fg: '#EF4444' } : lvl === 'warn' ? { bg: 'rgba(245,158,11,0.12)', fg: '#F59E0B' } : { bg: 'rgba(255,255,255,0.06)', fg: 'rgba(255,255,255,0.6)' }
const tlColor = (t: string) => ({ inscription: '#0EA5E9', statut: '#D4AF37', role: '#22C55E', certificat: '#8B5CF6', priere: '#EC4899', evenement: '#F59E0B', groupe: '#F97316', don: '#22C55E', note: '#94A3B8' } as Record<string, string>)[t] || '#94A3B8'
import toast from 'react-hot-toast'
import { getPermissions, PERMISSION_LABELS, ASSIGNABLE_ROLES } from '@/lib/permissions'

const MEMBRE_STATUTS = ['visiteur', 'nouveau_membre', 'membre_actif', 'disciple', 'leader_cellule', 'berger', 'pasteur']
const COMPTE_STATUTS = ['actif', 'inactif', 'suspendu', 'en_attente']

function fmt(iso?: string | null, withTime = false) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }) } catch { return '—' }
}

export default function MemberFichePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [d, setD] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [respEmail, setRespEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [roleMotif, setRoleMotif] = useState('')
  const [msgBody, setMsgBody] = useState('')

  async function sendMessage() {
    if (!msgBody.trim()) return
    try {
      const r = await fetch('/api/admin/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ recipient_id: params.id, body: msgBody }) })
      const j = await r.json()
      if (j.ok) { toast.success('Message envoyé ✓'); setMsgBody('') } else toast.error(j.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
  }

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/membres/${params.id}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setD(j.data)
    } catch { /* noop */ }
    setLoading(false)
  }, [params.id])
  useEffect(() => { load() }, [load])

  const act = useCallback(async (action: string, payload: Record<string, unknown> = {}, reloadAfter = true) => {
    setBusy(true)
    try {
      const r = await fetch(`/api/admin/membres/${params.id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ action, ...payload }),
      })
      const j = await r.json()
      if (j.ok) { toast.success('Action effectuée ✓'); if (reloadAfter) await load() }
      else toast.error(j.message || 'Échec')
      return j.ok
    } catch { toast.error('Erreur réseau'); return false }
    finally { setBusy(false) }
  }, [params.id, load])

  const treatAlert = useCallback(async (id: string, action: string) => {
    try {
      const r = await fetch('/api/admin/pastoral-alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id, action }) })
      const j = await r.json()
      if (j.ok) { toast.success('Alerte mise à jour ✓'); await load() } else toast.error(j.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
  }, [load])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
  if (!d) return (
    <div className="min-h-screen pt-24 text-center">
      <p className="font-cinzel text-pearl/60 mb-4">Membre introuvable.</p>
      <Link href="/admin/membres" className="btn-gold-cinematic px-5 py-2.5 text-sm">Retour</Link>
    </div>
  )

  const p = d.profile || {}
  const s = d.spiritual || {}
  const a = d.activite || {}
  const com = d.communaute || []
  const roleComLabel = (r: string) => r === 'leader' ? 'Leader' : r === 'co-leader' ? 'Co-leader' : 'Membre'
  const pres = d.presence || { stats: { total: 0, present: 0, absent: 0, excuse: 0, taux_presence: 0, taux_assiduite: 0 }, recent: [] }
  const presLabel = (s: string) => s === 'present' ? 'Présent' : s === 'absent' ? 'Absent' : s === 'excuse' ? 'Excusé' : '—'

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <Link href="/admin/membres" className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-6"><ArrowLeft className="w-4 h-4" /> Membres</Link>

        {/* En-tête fiche */}
        <div className="card-royal mb-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
              {(p.prenom?.[0] || '') + (p.nom?.[0] || '') || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-cinzel text-2xl font-black text-pearl">{p.prenom} {p.nom}
                {p.archived_at && <span className="ml-3 text-xs font-inter text-red-400/80 align-middle">Archivé</span>}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-pearl/55 font-inter">
                <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {p.email}</span>
                {p.telephone && <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {p.telephone}</span>}
                {(p.ville || p.pays) && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {[p.ville, p.pays].filter(Boolean).join(', ')}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge label={`Compte : ${p.statut}`} />
                <Badge label={`Spirituel : ${(p.membre_statut || '').replace('_', ' ')}`} gold />
                <Badge label={`Rôle : ${p.role}`} />
              </div>
            </div>
            <div className="text-right text-xs text-pearl/45 font-inter space-y-1">
              <div className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Inscrit le {fmt(p.date_inscription)}</div><br />
              <div className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Vu le {fmt(a.derniere_connexion, true)}</div><br />
              <div className="inline-flex items-center gap-1.5"><UserCog className="w-3.5 h-3.5" /> Responsable : {d.responsable ? `${d.responsable.prenom} ${d.responsable.nom}` : 'Aucun'}</div>
            </div>
          </div>
        </div>

        {/* Score d'engagement + Alertes pastorales */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="card-royal">
            <h2 className="font-cinzel font-bold text-pearl text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-gold" /> Score d'engagement</h2>
            <div className="font-cinzel font-black text-4xl text-pearl leading-none">{d.score?.value ?? 0}<span className="text-base text-pearl/40 font-inter"> /100</span></div>
            <div className="text-xs font-inter mt-1 capitalize" style={{ color: scoreColor(d.score?.value ?? 0) }}>{d.score?.band || 'donnée indisponible'}</div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden mt-3"><div className="h-full rounded-full" style={{ width: `${d.score?.value ?? 0}%`, background: scoreColor(d.score?.value ?? 0) }} /></div>
          </div>
          <div className="card-royal md:col-span-2">
            <h2 className="font-cinzel font-bold text-pearl text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-gold" /> Alertes pastorales</h2>

            {/* Alertes persistées (suivi + escalade) */}
            {(d.alerts_suivi || []).filter((a: any) => a.status !== 'resolue').length > 0 && (
              <div className="space-y-2 mb-3">
                {d.alerts_suivi.filter((a: any) => a.status !== 'resolue').map((a: any) => {
                  const st = alertStyle(a.level)
                  return (
                    <div key={a.id} className="flex items-center gap-2 flex-wrap rounded-xl bg-white/[0.02] border border-white/5 px-3 py-2">
                      <span className="text-xs font-inter text-pearl/75 capitalize">{String(a.type).replace(/_/g, ' ')}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-inter capitalize" style={{ background: st.bg, color: st.fg }}>{a.level}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-inter" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)' }}>{String(a.status).replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-pearl/30 ml-auto">{fmt(a.created_at)}</span>
                      {a.status === 'nouvelle' && <button onClick={() => treatAlert(a.id, 'prise_en_charge')} className="text-[10px] px-2 py-1 rounded-lg font-inter" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>Prendre en charge</button>}
                      <button onClick={() => treatAlert(a.id, 'resolue')} className="text-[10px] px-2 py-1 rounded-lg font-inter" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>Résoudre</button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Indices temps réel (calculés) */}
            {(d.alertes || []).length === 0 ? <p className="text-xs text-pearl/40 font-inter">Aucun indice — tout est au vert.</p> : (
              <div className="flex flex-wrap gap-2">
                {d.alertes.map((a: any, i: number) => {
                  const st = alertStyle(a.level)
                  return <span key={i} className="text-xs font-inter px-3 py-1.5 rounded-full inline-flex items-center gap-1.5" style={{ background: st.bg, color: st.fg }}><Bell className="w-3 h-3" /> {a.label}</span>
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vie spirituelle */}
            <Section icon={GraduationCap} title="Vie spirituelle">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Kpi label="Intégration" value={`${s.integration_pct}%`} />
                <Kpi label="Modules terminés" value={s.modules_termines} />
                <Kpi label="Certificats" value={s.certificats.length} />
                <Kpi label="Académie" value={s.academie_unlocked ? 'Débloquée' : 'Verrouillée'} />
              </div>
              {s.parcours?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {s.parcours.map((pc: any) => (
                    <div key={pc.slug} className="flex items-center gap-3">
                      <span className="text-xs text-pearl/60 font-inter w-48 truncate">{pc.titre}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pc.pct}%`, background: pc.complete ? '#22C55E' : '#D4AF37' }} /></div>
                      <span className="text-[11px] text-pearl/45 w-10 text-right">{pc.pct}%</span>
                    </div>
                  ))}
                </div>
              )}
              {s.certificats.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {s.certificats.map((c: any) => (
                    <a key={c.id} href={c.reference ? `/certificat/${encodeURIComponent(c.reference)}` : '#'} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-inter px-3 py-1.5 rounded-lg" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                      <Award className="w-3.5 h-3.5" /> {c.titre}
                    </a>
                  ))}
                </div>
              )}
            </Section>

            {/* Communauté (appartenances réelles — membres_groupe) */}
            <Section icon={UsersIcon} title="Communauté">
              {com.length === 0 ? (
                <p className="text-xs text-pearl/35 font-inter">Aucune appartenance à un groupe.</p>
              ) : (
                <div className="space-y-2">
                  {com.map((g: any) => (
                    <div key={g.groupe_id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-inter text-sm text-pearl/80 truncate">{g.nom || 'Groupe'}</span>
                          {g.is_primary && (
                            <span className="text-[9px] font-inter font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>Principal</span>
                          )}
                          {g.statut !== 'actif' && (
                            <span className="text-[9px] font-inter px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>{g.statut}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-pearl/35 font-inter mt-0.5 flex flex-wrap gap-x-2">
                          {g.type && <span>{g.type}</span>}
                          {g.plateforme_id && <span>· {g.plateforme_id}</span>}
                          {g.ville && <span>· {g.ville}</span>}
                          {g.responsable && <span>· Resp. {g.responsable.prenom} {g.responsable.nom}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-inter px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: g.role === 'leader' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', color: g.role === 'leader' ? '#22C55E' : 'rgba(255,255,255,0.5)' }}>{roleComLabel(g.role)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Assiduité (Chantier 4 — présences réelles) */}
            <Section icon={CalendarCheck} title="Assiduité">
              {pres.stats.total === 0 ? (
                <p className="text-xs text-pearl/35 font-inter">Aucune présence enregistrée en réunion.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <Kpi label="Taux de présence" value={`${pres.stats.taux_presence}%`} icon={CalendarCheck} />
                    <Kpi label="Assiduité" value={`${pres.stats.taux_assiduite}%`} />
                    <Kpi label="Présences" value={pres.stats.present} />
                    <Kpi label="Absences" value={pres.stats.absent} />
                  </div>
                  <ListBlock title="Dernières réunions" icon={CalendarCheck} items={(pres.recent || []).map((r: any) => `${r.titre || 'Réunion'} — ${presLabel(r.statut)}${r.date ? ' · ' + fmt(r.date) : ''}`)} />
                </>
              )}
            </Section>

            {/* Activité */}
            <Section icon={History} title="Activité">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Kpi label="Événements" value={a.evenements.length} icon={CalendarDays} />
                <Kpi label="Groupes" value={a.groupes.length} icon={UsersIcon} />
                <Kpi label="Prières" value={a.prieres.length} icon={HeartHandshake} />
                <Kpi label="Messages" value={a.messages.length} icon={MessageSquare} />
              </div>
              <ListBlock title="Connexions récentes" icon={Bell} items={(a.connexions || []).map((c: any) => `${c.action_type || 'activité'}${c.resource_title ? ' — ' + c.resource_title : ''} · ${fmt(c.created_at, true)}`)} />
              <ListBlock title="Événements suivis" icon={CalendarDays} items={(a.evenements || []).map((e: any) => `${e.event_titre} (${e.type}) · ${fmt(e.created_at)}`)} />
              <ListBlock title="Demandes de prière" icon={HeartHandshake} items={(a.prieres || []).map((x: any) => `${x.sujet} [${x.statut}] · ${fmt(x.created_at)}`)} />
            </Section>

            {/* Timeline pastorale */}
            <Section icon={History} title="Timeline pastorale">
              {(d.timeline || []).length === 0 ? <p className="text-xs text-pearl/35 font-inter">Aucun événement.</p> : (
                <div className="space-y-2">
                  {d.timeline.map((t: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-xs font-inter">
                      <span className="text-pearl/30 w-24 flex-shrink-0">{fmt(t.date, true)}</span>
                      <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: tlColor(t.type) }} />
                      <span className="text-pearl/65">{t.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Générosité */}
            <Section icon={HandHeart} title="Générosité">
              <div className="grid grid-cols-3 gap-3">
                <Kpi label="Nombre de dons" value={d.generosite.count} />
                <Kpi label="Total donné" value={`${d.generosite.total} ${d.generosite.currency}`} />
                <Kpi label="Dernier don" value={d.generosite.dernier ? fmt(d.generosite.dernier.created_at) : '—'} />
              </div>
              {d.generosite.count === 0 && <p className="text-xs text-pearl/35 font-inter mt-3">Aucun don déclaré rapproché à cet email.</p>}
            </Section>

            {/* Notes pastorales */}
            <Section icon={StickyNote} title="Notes pastorales">
              <div className="flex gap-2 mb-4">
                <input className="input-royal flex-1" placeholder="Ajouter une note de suivi…" value={note} onChange={(e) => setNote(e.target.value)} />
                <button disabled={busy || !note.trim()} onClick={async () => { if (await act('add_note', { note })) setNote('') }} className="btn-gold text-sm px-4 inline-flex items-center gap-1.5 disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Noter</button>
              </div>
              <div className="space-y-2">
                {(d.notes || []).length === 0 && <p className="text-xs text-pearl/35 font-inter">Aucune note.</p>}
                {(d.notes || []).map((n: any) => (
                  <div key={n.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                    <p className="text-sm text-pearl/75 font-inter">{n.note}</p>
                    <p className="text-[10px] text-pearl/30 font-inter mt-1">{n.author_nom || 'Admin'} · {fmt(n.created_at, true)}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Historique statuts */}
            <Section icon={History} title="Historique des statuts">
              {(d.statut_history || []).length === 0 ? <p className="text-xs text-pearl/35 font-inter">Aucun changement enregistré.</p> : (
                <div className="space-y-1.5">
                  {d.statut_history.map((h: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-inter text-pearl/55">
                      <span className="text-pearl/30">{fmt(h.created_at, true)}</span>
                      <span>{h.ancien_statut || '—'} → <span className="text-gold">{h.nouveau_statut}</span></span>
                      {h.source && <span className="text-pearl/25">({h.source})</span>}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Colonne actions */}
          <div className="space-y-6">
            <Section icon={ShieldCheck} title="Statut & suivi">
              <label className="block text-[11px] text-pearl/45 font-inter mb-1">Statut spirituel</label>
              <select className="input-royal w-full mb-3" defaultValue={p.membre_statut} onChange={(e) => act('set_statut', { membre_statut: e.target.value })}>
                {MEMBRE_STATUTS.map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}
              </select>
              <label className="block text-[11px] text-pearl/45 font-inter mb-1">Statut du compte</label>
              <select className="input-royal w-full mb-3" defaultValue={p.statut} onChange={(e) => act('set_statut', { statut: e.target.value })}>
                {COMPTE_STATUTS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <label className="block text-[11px] text-pearl/45 font-inter mb-1">Responsable de suivi (email)</label>
              <div className="flex gap-2">
                <input className="input-royal flex-1" placeholder="email@…" value={respEmail} onChange={(e) => setRespEmail(e.target.value)} />
                <button disabled={busy || !respEmail.trim()} onClick={async () => { if (await act('set_responsable', { berger_email: respEmail })) setRespEmail('') }} className="btn-royal text-sm px-3 disabled:opacity-50">OK</button>
              </div>
            </Section>

            <Section icon={ShieldCheck} title="Rôle & accès">
              <p className="text-[11px] text-pearl/45 font-inter mb-1">Rôle fonctionnel</p>
              <select className="input-royal w-full mb-2" value={newRole || p.role || 'membre'} onChange={(e) => setNewRole(e.target.value)}>
                {ASSIGNABLE_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <input className="input-royal w-full mb-2" placeholder="Motif du changement (optionnel)" value={roleMotif} onChange={(e) => setRoleMotif(e.target.value)} />
              <button disabled={busy || !newRole || newRole === p.role}
                onClick={async () => { if (confirm(`Changer le rôle de ce membre en « ${newRole} » ?`)) { if (await act('set_role', { role: newRole, motif: roleMotif })) setRoleMotif('') } }}
                className="btn-gold text-sm w-full justify-center py-2 inline-flex items-center gap-2 disabled:opacity-50">
                <UserCog className="w-4 h-4" /> Appliquer le rôle
              </button>
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-[11px] text-pearl/45 font-inter mb-1.5">Permissions débloquées ({(newRole || p.role) ? '' : ''}{Array.from(getPermissions({ role: newRole || p.role, membre_statut: p.membre_statut })).length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(getPermissions({ role: newRole || p.role, membre_statut: p.membre_statut })).map((perm) => (
                    <span key={perm} className="text-[10px] font-inter px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{PERMISSION_LABELS[perm]}</span>
                  ))}
                  {Array.from(getPermissions({ role: newRole || p.role, membre_statut: p.membre_statut })).length === 0 && (
                    <span className="text-[11px] text-pearl/35 font-inter">Membre standard — aucun accès spécial.</span>
                  )}
                </div>
              </div>
              {(d.role_history || []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-[11px] text-pearl/45 font-inter mb-1">Dernier changement de rôle</p>
                  <p className="text-xs text-pearl/60 font-inter">{d.role_history[0].detail?.ancien_role || '—'} → <span className="text-gold">{d.role_history[0].detail?.nouveau_role}</span> · {fmt(d.role_history[0].created_at, true)}</p>
                </div>
              )}
            </Section>

            <Section icon={MessageSquare} title="Message">
              <textarea className="input-royal w-full resize-none mb-2" rows={3} placeholder="Écrire un message à ce membre…" value={msgBody} onChange={(e) => setMsgBody(e.target.value)} />
              <button onClick={sendMessage} disabled={!msgBody.trim()} className="btn-gold text-sm w-full justify-center py-2 inline-flex items-center gap-2 disabled:opacity-50">
                <Send className="w-4 h-4" /> Envoyer le message
              </button>
            </Section>

            <Section icon={KeyRound} title="Accès & sécurité">
              <button disabled={busy} onClick={() => act('reset_password', {}, false)} className="w-full btn-royal text-sm py-2.5 mb-2 inline-flex items-center justify-center gap-2"><KeyRound className="w-4 h-4" /> Réinitialiser le mot de passe</button>
              {p.statut !== 'suspendu' ? (
                <button disabled={busy} onClick={() => { if (confirm('Suspendre ce compte ?')) act('suspend') }} className="w-full text-sm py-2.5 mb-2 inline-flex items-center justify-center gap-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}><Ban className="w-4 h-4" /> Suspendre</button>
              ) : (
                <button disabled={busy} onClick={() => act('reactivate')} className="w-full text-sm py-2.5 mb-2 inline-flex items-center justify-center gap-2 rounded-xl" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}><RotateCcw className="w-4 h-4" /> Réactiver</button>
              )}
            </Section>

            <Section icon={Trash2} title="Zone sensible">
              <button disabled={busy} onClick={() => { if (confirm('Archiver (suppression douce, réversible) ?')) act('archive') }} className="w-full text-sm py-2.5 mb-2 inline-flex items-center justify-center gap-2 rounded-xl" style={{ background: 'rgba(107,114,128,0.15)', color: '#9CA3AF' }}><Archive className="w-4 h-4" /> Archiver (réversible)</button>
              <button disabled={busy} onClick={async () => {
                if (!confirm('SUPPRESSION DÉFINITIVE du compte. Irréversible. Continuer ?')) return
                if (!confirm('Dernière confirmation : supprimer définitivement ' + p.email + ' ?')) return
                const ok = await act('hard_delete', {}, false)
                if (ok) { toast.success('Compte supprimé.'); router.push('/admin/membres') }
              }} className="w-full text-sm py-2.5 inline-flex items-center justify-center gap-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}><Trash2 className="w-4 h-4" /> Supprimer définitivement</button>
            </Section>

            {s.formations?.length > 0 && (
              <Section icon={BookOpen} title="Formations">
                <div className="space-y-2">
                  {s.formations.map((f: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs font-inter">
                      <span className="text-pearl/70 truncate">{f.formation?.titre || 'Formation'}</span>
                      <span className="text-pearl/40">{f.progression ?? 0}%</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Badge({ label, gold }: { label: string; gold?: boolean }) {
  return <span className="text-[10px] font-poppins px-2.5 py-1 rounded-full capitalize" style={{ background: gold ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.06)', color: gold ? '#D4AF37' : 'rgba(255,255,255,0.6)' }}>{label}</span>
}
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: ReactNode }) {
  return (
    <div className="card-royal">
      <h2 className="font-cinzel font-bold text-pearl text-sm mb-4 flex items-center gap-2"><Icon className="w-4 h-4 text-gold" /> {title}</h2>
      {children}
    </div>
  )
}
function Kpi({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-center">
      {Icon && <Icon className="w-4 h-4 text-gold/60 mx-auto mb-1" />}
      <div className="font-cinzel font-black text-pearl text-lg leading-none">{value}</div>
      <div className="text-[10px] text-pearl/40 font-inter mt-1">{label}</div>
    </div>
  )
}
function ListBlock({ title, icon: Icon, items }: { title: string; icon: any; items: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-3">
      <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-1.5 flex items-center gap-1.5"><Icon className="w-3 h-3" /> {title}</p>
      <div className="space-y-1">
        {items.slice(0, 6).map((it, i) => <p key={i} className="text-xs text-pearl/55 font-inter truncate">• {it}</p>)}
      </div>
    </div>
  )
}
