'use client'
import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Wifi, Eye, HandCoins, Clock, Activity, AlertTriangle, Globe, TrendingUp,
  Heart, GraduationCap, Loader2, RefreshCw, ShieldAlert, ArrowUpRight, Sparkles,
  UserPlus, Award, MapPin, Building2, CalendarDays, BookOpen,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import PresenceCard from './PresenceCard'
import ConversionsCard from './ConversionsCard'
import NotificationsActivityCard from './NotificationsActivityCard'

interface LCN { level?: string; stage?: string; label: string; color?: string; n: number }
interface KV { label: string; count: number }
interface Nation { pays: string; membres: number; nouveaux_30j: number; visiteurs: number; croissance_pct: number }
interface AlertItem { type: string; severite: string; nom: string; pays: string | null; detail: string }
interface MembreRow {
  user_id: string; nom: string; pays: string | null; stage: string; niveau: string; score: number
  connexions: number; temps: number; temps_moyen: number; jours_actifs_30: number
  derniere_activite_jours: number | null; prieres: number; formations: number; dons: number
}
interface Modules {
  croissance: { nouveaux_visiteurs: number; nouveaux_inscrits: number; nouveaux_membres: number; taux_conversion: number; pays_en_croissance: Nation[]; pages_convertissantes: KV[] }
  sante: { engages: number; a_suivre: number; absents: number; inactifs: number; score_moyen: number; alertes: number; niveaux: LCN[] }
  formation: { cours_commences: number; cours_termines: number; cours_abandons: number; certifications: number; top_formations: KV[] }
  priere: { recues: number; traitees: number; en_attente: number; temoignages: number }
  finance: { dons_count: number; dons_total_fcfa: number; dons_par_devise: Record<string, number>; par_source: Record<string, number>; par_type: Record<string, number>; achats_marketplace: number }
  mission: { pays_touches: number; villes_touchees: number; groupes_actifs: number; evenements: number; antennes: number }
}
interface Intelligence {
  churn: { niveau: string; label: string; color: string; n: number }[]
  suivi: { user_id: string; nom: string; pays: string | null; score: number; niveau: string; action: string; action_label: string; facteurs: string[]; jours: number | null }[]
  suivi_total: number
  mobilisation: { pays: string; total: number; part_risque: number }[]
}
interface Gouv {
  pays: string | null
  modules: Modules
  intelligence: Intelligence
  pilotage: {
    membres_total: number; connectes_now: number; connectes_membres: number
    visiteurs_aujourdhui: number; visiteurs_anon_aujourdhui: number
    dons_count: number; dons_total_fcfa: number; formations_inscrits: number; formations_abandons: number
    events_inscriptions: number; prieres_total: number; prieres_sans_suivi: number; temps_total_sec: number
  }
  alertes: { counts: { type: string; label: string; severite: string; n: number }[]; total: number; items: AlertItem[] }
  carte: { nations: Nation[]; croissance: { mois: string; n: number }[] }
  membres: MembreRow[]
}

const NIVEAU_COLOR: Record<string, string> = { tres_engage: '#22C55E', engage: '#84CC16', stable: '#EAB308', a_suivre: '#F59E0B', en_risque: '#EF4444', inactif: '#6B7280' }
const NIVEAU_LABEL: Record<string, string> = { tres_engage: 'Très engagé', engage: 'Engagé', stable: 'Stable', a_suivre: 'À suivre', en_risque: 'En risque', inactif: 'Inactif' }
const STAGE_LABEL: Record<string, string> = { visiteur: 'Visiteur', inscrit: 'Inscrit', disciple: 'Disciple', membre: 'Membre', serviteur: 'Serviteur', leader: 'Leader' }
const SEV_COLOR: Record<string, string> = { haute: '#EF4444', moyenne: '#F59E0B', info: '#0EA5E9' }
const RISK_COLOR: Record<string, string> = { critique: '#EF4444', eleve: '#F59E0B', moyen: '#EAB308', faible: '#22C55E' }
const RISK_LABEL: Record<string, string> = { critique: 'Critique', eleve: 'Élevé', moyen: 'Moyen', faible: 'Faible' }
const fmtDur = (s: number) => { if (!s) return '0s'; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : m ? `${m}m` : `${s}s` }
const fmtN = (n: number) => n.toLocaleString('fr-FR')

export default function GouvernementPage() {
  const [d, setD] = useState<Gouv | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [pays, setPays] = useState('')
  const [last, setLast] = useState('')
  const [auto, setAuto] = useState(true)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams(); if (pays.trim()) p.set('pays', pays.trim())
      const r = await fetch(`/api/admin/gouvernement?${p}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      else if (j.ok) { setD(j); setLast(new Date().toLocaleTimeString('fr-FR')) }
    } catch { /* */ }
    setLoading(false)
  }, [pays])

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (timer.current) clearInterval(timer.current)
    if (auto) timer.current = setInterval(() => { if (document.visibilityState === 'visible') load() }, 30_000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [auto, load])

  const pil = d?.pilotage
  const mod = d?.modules

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal space-y-6">
        <PageHeader
          eyebrow="Centre d'intelligence pastorale"
          title={<>Gouvernement <span className="text-cinematic-gold">de l'Église</span></>}
          description="L'état complet de l'œuvre en moins de 60 secondes : croissance, santé spirituelle, formation, prière, finance et mission — temps réel, multi-pays."
        />

        <div className="card-cinematic p-3 flex flex-wrap items-center gap-2.5">
          <input value={pays} onChange={(e) => setPays(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Filtre pays (ex. CD)" maxLength={2} className="input-royal text-sm w-36" />
          <button onClick={() => { setLoading(true); load() }} className="btn-gold text-xs px-3 py-1.5 inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Actualiser</button>
          <label className="flex items-center gap-1.5 text-xs font-inter text-pearl/55 cursor-pointer ml-auto">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-gold" /> Auto (30s){last && <span className="text-pearl/30">· {last}</span>}
          </label>
        </div>

        {demo && <div className="card-cinematic p-4 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase.</div>}

        {loading && !d ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement du cockpit…</div>
        ) : !d || !mod || !pil || !d.intelligence || !d.alertes || !d.carte || !d.membres ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune donnée disponible.</div>
        ) : (
          <>
            {/* BANDEAU TEMPS RÉEL */}
            <div className="flex items-center gap-2 text-[11px] font-inter uppercase tracking-wider text-pearl/40">
              <span className="relative flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full bg-green-500 opacity-75 animate-ping" /><span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" /></span>
              Temps réel
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <Kpi icon={Wifi} color="#22C55E" value={pil.connectes_now} label="Connectés" sub={`${pil.connectes_membres} membres`} />
              <Kpi icon={Users} color="#D4AF37" value={pil.membres_total} label="Membres" />
              <Kpi icon={Eye} color="#0EA5E9" value={pil.visiteurs_aujourdhui} label="Visiteurs auj." sub={`${pil.visiteurs_anon_aujourdhui} anon.`} />
              <Kpi icon={HandCoins} color="#EAB308" value={fmtN(pil.dons_total_fcfa)} label="Dons FCFA" sub={`${pil.dons_count} dons`} />
              <Kpi icon={GraduationCap} color="#8B5CF6" value={pil.formations_inscrits} label="En formation" />
              <Kpi icon={Clock} color="#EC4899" value={fmtDur(pil.temps_total_sec)} label="Temps cumulé" />
            </div>

            {/* ════ LES 6 MODULES ════ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

              {/* 1 — CROISSANCE */}
              <Module n={1} icon={TrendingUp} title="Croissance" color="#22C55E">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Stat icon={Eye} label="Nouveaux visiteurs (30j)" value={mod.croissance.nouveaux_visiteurs} />
                  <Stat icon={UserPlus} label="Nouveaux inscrits (30j)" value={mod.croissance.nouveaux_inscrits} />
                  <Stat icon={Users} label="Nouveaux membres (30j)" value={mod.croissance.nouveaux_membres} />
                  <Stat icon={TrendingUp} label="Taux de conversion" value={`${mod.croissance.taux_conversion}%`} />
                </div>
                <MiniList title="Pays en croissance" items={mod.croissance.pays_en_croissance.map((p) => ({ label: p.pays, count: p.croissance_pct, suffix: '%' }))} color="#22C55E" />
                <MiniList title="Pages les plus convertissantes" items={mod.croissance.pages_convertissantes} color="#0EA5E9" />
              </Module>

              {/* 2 — SANTÉ SPIRITUELLE */}
              <Module n={2} icon={Activity} title="Santé spirituelle" color="#EC4899">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Stat icon={Heart} label="Membres engagés" value={mod.sante.engages} color="#22C55E" />
                  <Stat icon={Activity} label="À suivre" value={mod.sante.a_suivre} color="#EAB308" />
                  <Stat icon={AlertTriangle} label="Absents (en risque)" value={mod.sante.absents} color="#EF4444" />
                  <Stat icon={Clock} label="Inactifs" value={mod.sante.inactifs} color="#6B7280" />
                  <Stat icon={Sparkles} label="Score d'engagement moyen" value={`${mod.sante.score_moyen}/100`} />
                  <Stat icon={ShieldAlert} label="Alertes automatiques" value={mod.sante.alertes} color="#F59E0B" />
                </div>
                <div className="space-y-1.5">
                  {mod.sante.niveaux.map((s) => {
                    const tot = mod.sante.niveaux.reduce((a, x) => a + x.n, 0) || 1
                    const color = s.color || NIVEAU_COLOR[s.level || ''] || '#9CA3AF'
                    return (
                      <div key={s.level} className="flex items-center gap-2">
                        <span className="text-[10px] font-inter text-pearl/60 w-20 flex-shrink-0">{s.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-white/6"><div className="h-full rounded-full" style={{ width: `${(s.n / tot) * 100}%`, background: color }} /></div>
                        <span className="text-[10px] font-inter text-pearl/45 w-8 text-right">{s.n}</span>
                      </div>
                    )
                  })}
                </div>
              </Module>

              {/* 3 — FORMATION */}
              <Module n={3} icon={GraduationCap} title="Formation" color="#8B5CF6">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Stat icon={BookOpen} label="Cours commencés" value={mod.formation.cours_commences} />
                  <Stat icon={Award} label="Cours terminés" value={mod.formation.cours_termines} color="#22C55E" />
                  <Stat icon={AlertTriangle} label="Abandons" value={mod.formation.cours_abandons} color="#EF4444" />
                  <Stat icon={Award} label="Certifications" value={mod.formation.certifications} color="#D4AF37" />
                </div>
                <MiniList title="Top formations" items={mod.formation.top_formations} color="#8B5CF6" />
              </Module>

              {/* 4 — PRIÈRE */}
              <Module n={4} icon={Heart} title="Prière" color="#F472B6">
                <div className="grid grid-cols-2 gap-2">
                  <Stat icon={Heart} label="Demandes reçues" value={mod.priere.recues} />
                  <Stat icon={Award} label="Demandes traitées" value={mod.priere.traitees} color="#22C55E" />
                  <Stat icon={Clock} label="En attente" value={mod.priere.en_attente} color="#F59E0B" />
                  <Stat icon={Sparkles} label="Témoignages générés" value={mod.priere.temoignages} color="#D4AF37" />
                </div>
              </Module>

              {/* 5 — FINANCE */}
              <Module n={5} icon={HandCoins} title="Finance" color="#EAB308">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <Stat icon={HandCoins} label="Total FCFA (validé)" value={fmtN(mod.finance.dons_total_fcfa)} />
                  <Stat icon={Activity} label="Transactions" value={mod.finance.dons_count} />
                  <Stat icon={GraduationCap} label="Achats marketplace" value={mod.finance.achats_marketplace} color="#8B5CF6" />
                </div>
                {Object.keys(mod.finance.dons_par_devise).length > 1 && (
                  <MiniList title="Par devise" items={Object.entries(mod.finance.dons_par_devise).map(([d2, v]) => ({ label: d2, count: v }))} color="#EAB308" />
                )}
                <MiniList title="Par source" items={Object.entries(mod.finance.par_source).map(([k, v]) => ({ label: k, count: v })).sort((a, b) => b.count - a.count).slice(0, 6)} color="#F59E0B" />
              </Module>

              {/* 6 — MISSION */}
              <Module n={6} icon={Globe} title="Mission" color="#0EA5E9">
                <div className="grid grid-cols-2 gap-2">
                  <Stat icon={Globe} label="Pays touchés" value={mod.mission.pays_touches} />
                  <Stat icon={MapPin} label="Villes touchées" value={mod.mission.villes_touchees} />
                  <Stat icon={Users} label="Groupes actifs" value={mod.mission.groupes_actifs} />
                  <Stat icon={CalendarDays} label="Événements" value={mod.mission.evenements} />
                  <Stat icon={Building2} label="Antennes" value={mod.mission.antennes} />
                </div>
              </Module>

            </div>

            {/* ════ ASSIDUITÉ AUX RÉUNIONS (Chantier 4 — additif) ════ */}
            <PresenceCard />

            {/* ════ CONVERSIONS & PROGRESSION (P4 — additif) ════ */}
            <ConversionsCard />

            {/* ════ ACTIVITÉ NOTIFICATIONS (Super Admin — additif) ════ */}
            <NotificationsActivityCard />

            {/* ════ V3 — INTELLIGENCE PRÉDICTIVE ════ */}
            <Panel icon={Sparkles} title="Intelligence prédictive — décrochage & suivi pastoral">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                {/* Distribution churn */}
                <div className="lg:col-span-1">
                  <div className="text-[10px] font-inter uppercase tracking-wider text-pearl/35 mb-2">Risque de décrochage</div>
                  <div className="space-y-2">
                    {d.intelligence.churn.map((c) => {
                      const tot = d.intelligence.churn.reduce((a, x) => a + x.n, 0) || 1
                      return (
                        <div key={c.niveau} className="flex items-center gap-2">
                          <span className="text-[10px] font-inter w-16 flex-shrink-0" style={{ color: c.color }}>{c.label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/6"><div className="h-full rounded-full" style={{ width: `${(c.n / tot) * 100}%`, background: c.color }} /></div>
                          <span className="text-[10px] font-inter text-pearl/45 w-8 text-right">{c.n}</span>
                        </div>
                      )
                    })}
                  </div>
                  {d.intelligence.mobilisation.length > 0 && (
                    <div className="mt-4">
                      <div className="text-[10px] font-inter uppercase tracking-wider text-pearl/35 mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-400" /> Mobilisation requise</div>
                      <div className="flex flex-wrap gap-1.5">
                        {d.intelligence.mobilisation.map((mb) => (
                          <span key={mb.pays} className="text-[10px] font-inter px-2 py-1 rounded-full" style={{ background: '#EF44441A', color: '#EF4444', border: '1px solid #EF444433' }}>{mb.pays} · {mb.part_risque}% à risque</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* File de suivi pastoral */}
                <div className="lg:col-span-2">
                  <div className="text-[10px] font-inter uppercase tracking-wider text-pearl/35 mb-2">File de suivi prioritaire {d.intelligence.suivi_total > 0 && `(${d.intelligence.suivi_total})`}</div>
                  {d.intelligence.suivi.length === 0 ? (
                    <Empty hint="Aucun membre à risque — continuez ainsi 🙌" />
                  ) : (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                      {d.intelligence.suivi.slice(0, 30).map((s) => (
                        <div key={s.user_id} className="flex items-center gap-2.5 text-xs font-inter py-1.5 border-b border-white/[0.03] last:border-0">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-bold" style={{ background: `${RISK_COLOR[s.niveau] || '#9CA3AF'}1A`, color: RISK_COLOR[s.niveau] || '#9CA3AF' }}>{RISK_LABEL[s.niveau] || s.niveau}</span>
                          <span className="text-pearl/80 truncate flex-1 min-w-0">{s.nom}{s.pays && <span className="text-pearl/30 ml-1">· {s.pays}</span>}</span>
                          <span className="text-pearl/45 hidden md:inline truncate max-w-[40%]">{s.action_label}</span>
                          <span className="text-pearl/30 w-8 text-right flex-shrink-0">{s.score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] font-inter text-pearl/25">Prédictions heuristiques explicables (récence, fréquence, diversité d'engagement) — sans boîte noire. Action suggérée par membre à risque.</p>
            </Panel>

            {/* ALERTES PASTORALES */}
            <Panel icon={ShieldAlert} title={`Alertes pastorales${d.alertes.total ? ` (${d.alertes.total})` : ''}`}>
              {d.alertes.total === 0 ? (
                <Empty hint="Aucune alerte — l'église est sereine ✅" />
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {d.alertes.counts.map((a) => (
                      <span key={a.type} className="inline-flex items-center gap-1.5 text-[11px] font-inter px-2.5 py-1 rounded-full" style={{ background: `${SEV_COLOR[a.severite || 'info']}1A`, color: SEV_COLOR[a.severite || 'info'], border: `1px solid ${SEV_COLOR[a.severite || 'info']}33` }}>
                        <AlertTriangle className="w-3 h-3" /> {a.label} · {a.n}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {d.alertes.items.map((a, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs font-inter py-1.5 border-b border-white/[0.03] last:border-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SEV_COLOR[a.severite] || '#9CA3AF' }} />
                        <span className="text-pearl/80 truncate flex-1">{a.nom}{a.pays && <span className="text-pearl/30 ml-1">· {a.pays}</span>}</span>
                        <span className="text-pearl/45 hidden md:inline">{a.detail}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>

            {/* CARTE MONDIALE */}
            <Panel icon={Globe} title="Carte du Royaume — présence par nation">
              {d.carte.nations.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-inter">
                    <thead><tr className="text-pearl/40 text-[11px] uppercase tracking-wider text-left border-b border-white/5">
                      <th className="py-2 pr-3">Pays</th><th className="py-2 px-2 text-right">Membres</th><th className="py-2 px-2 text-right">Visiteurs</th><th className="py-2 px-2 text-right">Nouveaux 30j</th><th className="py-2 px-2 text-right">Croissance</th>
                    </tr></thead>
                    <tbody>
                      {d.carte.nations.slice(0, 30).map((n) => (
                        <tr key={n.pays} className="border-b border-white/[0.03]">
                          <td className="py-2 pr-3 text-pearl/80">{n.pays}</td>
                          <td className="py-2 px-2 text-right text-pearl/70">{fmtN(n.membres)}</td>
                          <td className="py-2 px-2 text-right text-pearl/50">{fmtN(n.visiteurs)}</td>
                          <td className="py-2 px-2 text-right text-gold/70">{n.nouveaux_30j}</td>
                          <td className="py-2 px-2 text-right"><span className="inline-flex items-center gap-0.5" style={{ color: n.croissance_pct > 0 ? '#22C55E' : 'rgba(245,230,216,0.3)' }}>{n.croissance_pct > 0 && <ArrowUpRight className="w-3 h-3" />}{n.croissance_pct}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty />}
            </Panel>

            {/* INTELLIGENCE MEMBRE */}
            <Panel icon={Users} title="Intelligence membre — les plus engagés">
              {d.membres.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-inter">
                    <thead><tr className="text-pearl/40 text-[11px] uppercase tracking-wider text-left border-b border-white/5">
                      <th className="py-2 pr-3">Membre</th><th className="py-2 px-2">Niveau</th><th className="py-2 px-2">Étape</th>
                      <th className="py-2 px-2 text-right">Connexions</th><th className="py-2 px-2 text-right">Tps moy.</th>
                      <th className="py-2 px-2 text-right">Jours actifs</th><th className="py-2 px-2 text-right">Dern. activité</th>
                    </tr></thead>
                    <tbody>
                      {d.membres.slice(0, 50).map((m) => (
                        <tr key={m.user_id} className="border-b border-white/[0.03]">
                          <td className="py-2 pr-3 text-pearl/80 truncate max-w-[180px]">{m.nom}{m.pays && <span className="text-pearl/30 ml-1">· {m.pays}</span>}</td>
                          <td className="py-2 px-2"><span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${NIVEAU_COLOR[m.niveau] || '#9CA3AF'}1A`, color: NIVEAU_COLOR[m.niveau] || '#9CA3AF' }}>{NIVEAU_LABEL[m.niveau] || m.niveau}</span></td>
                          <td className="py-2 px-2 text-pearl/55">{STAGE_LABEL[m.stage] || m.stage}</td>
                          <td className="py-2 px-2 text-right text-pearl/60">{m.connexions}</td>
                          <td className="py-2 px-2 text-right text-pearl/50">{fmtDur(m.temps_moyen)}</td>
                          <td className="py-2 px-2 text-right text-pearl/60">{m.jours_actifs_30}/30</td>
                          <td className="py-2 px-2 text-right text-pearl/45">{m.derniere_activite_jours == null ? '—' : `${m.derniere_activite_jours}j`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty hint="Aucune session membre identifiée." />}
            </Panel>

            <p className="text-[10px] font-inter text-pearl/25 text-center pt-2 flex items-center justify-center gap-1.5">
              <Heart className="w-3 h-3" /> Confidentialité : le contenu des prières et de la cure d'âme n'est jamais affiché ici ; visiteurs anonymes non identifiés.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, color, value, label, sub }: { icon: any; color: string; value: number | string; label: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-royal p-4">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5" style={{ background: `${color}18`, border: `1px solid ${color}30` }}><Icon className="w-4 h-4" style={{ color }} /></div>
      <div className="font-cinzel text-xl font-black leading-none" style={{ color }}>{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</div>
      <div className="font-inter text-[10px] mt-1 text-pearl/40">{label}</div>
      {sub && <div className="font-inter text-[9px] mt-0.5 text-pearl/25">{sub}</div>}
    </motion.div>
  )
}

function Module({ n, icon: Icon, title, color, children }: { n: number; icon: any; title: string; color: string; children: ReactNode }) {
  return (
    <div className="card-royal">
      <h2 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0" style={{ background: `${color}1A`, color, border: `1px solid ${color}33` }}>{n}</span>
        <Icon className="w-4 h-4" style={{ color }} /> {title}
      </h2>
      {children}
    </div>
  )
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3 h-3 flex-shrink-0" style={{ color: color || 'rgba(245,230,216,0.4)' }} /><span className="text-[10px] font-inter text-pearl/45 leading-tight">{label}</span></div>
      <div className="font-cinzel text-lg font-black" style={{ color: color || '#F5E6A7' }}>{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}</div>
    </div>
  )
}

function MiniList({ title, items, color }: { title: string; items: { label: string; count: number; suffix?: string }[]; color: string }) {
  if (!items.length) return null
  const max = Math.max(...items.map((i) => i.count), 1)
  return (
    <div className="mt-3">
      <div className="text-[10px] font-inter uppercase tracking-wider text-pearl/35 mb-1.5">{title}</div>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={`${it.label}-${i}`}>
            <div className="flex justify-between text-[11px] font-inter mb-0.5"><span className="text-pearl/65 truncate max-w-[75%]">{it.label}</span><span className="font-bold text-white">{it.count.toLocaleString('fr-FR')}{it.suffix || ''}</span></div>
            <div className="h-1 rounded-full bg-white/6"><div className="h-full rounded-full" style={{ width: `${(it.count / max) * 100}%`, background: color }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Panel({ icon: Icon, title, children }: { icon: any; title: string; children: ReactNode }) {
  return (
    <div className="card-royal">
      <h2 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2"><Icon className="w-4 h-4 text-gold" /> {title}</h2>
      {children}
    </div>
  )
}

function Empty({ hint }: { hint?: string }) {
  return <div className="py-8 text-center"><p className="font-inter text-sm text-pearl/40">Aucune donnée disponible</p>{hint && <p className="font-inter text-xs text-pearl/25 mt-1">{hint}</p>}</div>
}
