'use client'
import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, Users, Eye, Clock, Globe, Smartphone, Tablet, Monitor, TrendingUp,
  MousePointerClick, Radio, Loader2, RefreshCw, FileText, Wifi, ArrowDownRight,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

interface LC { label: string; count: number }
interface Analytics {
  range: string; pays: string | null
  temps_reel: { connectes: number; connectes_auth: number; connectes_anon: number; pages_actives: LC[] }
  kpis: { visiteurs_aujourdhui: number; sessions_periode: number; duree_moyenne_sec: number; temps_total_sec: number; progression_moyenne: number | null }
  top_pages: LC[]; top_actions: LC[]
  repartition: { device: LC[]; navigateur: LC[]; source: LC[]; pays: LC[] }
  funnel: { etape: string; n: number }[]
  top_membres: { user_id: string; nom: string; pays: string | null; duration_sec: number; events: number; views: number }[]
}

const RANGES = [{ v: '24h', l: '24 h' }, { v: '7d', l: '7 jours' }, { v: '30d', l: '30 jours' }, { v: '90d', l: '90 jours' }]
const DEVICE_ICON: Record<string, any> = { mobile: Smartphone, tablet: Tablet, desktop: Monitor }
const SOURCE_COLOR: Record<string, string> = {
  direct: '#6B7280', whatsapp: '#22C55E', facebook: '#1877F2', youtube: '#EF4444',
  google: '#EAB308', email: '#0EA5E9', instagram: '#EC4899', tiktok: '#A855F7', referral: '#8B5CF6',
}
const fmtDur = (s: number) => {
  if (!s) return '0s'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h ? `${h}h ${m}m` : m ? `${m}m ${sec}s` : `${sec}s`
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [range, setRange] = useState('7d')
  const [pays, setPays] = useState('')
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ range })
      if (pays.trim()) p.set('pays', pays.trim())
      const r = await fetch(`/api/admin/analytics?${p}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) { setDemo(true) }
      else if (j.ok) { setData(j); setLastUpdate(new Date().toLocaleTimeString('fr-FR')) }
    } catch { /* */ }
    setLoading(false)
  }, [range, pays])

  useEffect(() => { setLoading(true); load() }, [range])
  useEffect(() => {
    if (timer.current) clearInterval(timer.current)
    // Pause si l'onglet est masqué (économise réseau/DB à l'échelle).
    if (autoRefresh) timer.current = setInterval(() => { if (document.visibilityState === 'visible') load() }, 20_000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [autoRefresh, load])

  const tr = data?.temps_reel
  const k = data?.kpis

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal space-y-6">
        <PageHeader
          eyebrow="Administration"
          title={<>Analytics <span className="text-cinematic-gold">Citadelle</span></>}
          description="Activité du site en temps réel et historique — relié aux membres, dons, formations et lives. Visiteurs anonymes non identifiés (confidentialité stricte)."
        />

        {/* Barre de contrôle */}
        <div className="card-cinematic p-3 flex flex-wrap items-center gap-2.5">
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button key={r.v} onClick={() => setRange(r.v)}
                className={`text-xs font-inter px-3 py-1.5 rounded-lg border ${range === r.v ? 'bg-gold text-black border-transparent font-semibold' : 'bg-white/5 text-pearl/55 border-white/10'}`}>{r.l}</button>
            ))}
          </div>
          <input value={pays} onChange={(e) => setPays(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Pays (ex. CD)" maxLength={2} className="input-royal text-sm w-28" />
          <button onClick={() => { setLoading(true); load() }} className="btn-gold text-xs px-3 py-1.5 inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Actualiser</button>
          <label className="flex items-center gap-1.5 text-xs font-inter text-pearl/55 cursor-pointer ml-auto">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-gold" />
            Auto (20s){lastUpdate && <span className="text-pearl/30">· {lastUpdate}</span>}
          </label>
        </div>

        {demo && <div className="card-cinematic p-4 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase pour les chiffres réels.</div>}

        {loading && !data ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : !data ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune donnée d'activité pour le moment.</div>
        ) : (
          <>
            {/* TEMPS RÉEL */}
            <div className="flex items-center gap-2 text-[11px] font-inter uppercase tracking-wider text-pearl/40">
              <span className="relative flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full bg-green-500 opacity-75 animate-ping" /><span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" /></span>
              Temps réel
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={Wifi} color="#22C55E" value={tr!.connectes} label="Connectés maintenant"
                sub={`${tr!.connectes_auth} membres · ${tr!.connectes_anon} anonymes`} />
              <Kpi icon={Users} color="#D4AF37" value={k!.visiteurs_aujourdhui} label="Visiteurs aujourd'hui" />
              <Kpi icon={Eye} color="#0EA5E9" value={tr!.pages_actives.reduce((a, p) => a + p.count, 0)} label="Pages actives"
                sub={`${tr!.pages_actives.length} URL`} />
              <Kpi icon={Clock} color="#8B5CF6" value={fmtDur(k!.duree_moyenne_sec)} label="Durée moyenne / session" />
            </div>

            {/* Pages actives en direct */}
            {tr!.pages_actives.length > 0 && (
              <div className="card-royal">
                <h2 className="font-cinzel text-sm font-bold text-pearl mb-3 flex items-center gap-2"><Radio className="w-4 h-4 text-green-400" /> Pages actuellement consultées</h2>
                <BarList items={tr!.pages_actives} color="#22C55E" />
              </div>
            )}

            {/* KPIs période */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={Activity} color="#EAB308" value={k!.sessions_periode} label={`Sessions (${data.range})`} />
              <Kpi icon={Clock} color="#EC4899" value={fmtDur(k!.temps_total_sec)} label="Temps total cumulé" />
              <Kpi icon={TrendingUp} color="#22C55E" value={k!.progression_moyenne != null ? `${k!.progression_moyenne}%` : '—'} label="Progression moyenne" />
              <Kpi icon={Globe} color="#0EA5E9" value={data.repartition.pays.length} label="Pays actifs" />
            </div>

            {/* Top pages + Top actions */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Panel icon={FileText} title="Pages les plus consultées">
                {data.top_pages.length ? <BarList items={data.top_pages} color="#D4AF37" /> : <Empty />}
              </Panel>
              <Panel icon={MousePointerClick} title="Actions clés (live · don · formation · PDF · événement · inscription)">
                {data.top_actions.length ? <BarList items={data.top_actions} color="#EC4899" /> : <Empty />}
              </Panel>
            </div>

            {/* Répartitions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <Panel icon={Smartphone} title="Appareils">
                {data.repartition.device.length ? (
                  <div className="space-y-2.5">
                    {data.repartition.device.map((d) => {
                      const Icon = DEVICE_ICON[d.label] || Monitor
                      const tot = data.repartition.device.reduce((a, x) => a + x.count, 0) || 1
                      return (
                        <div key={d.label} className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-gold/70 flex-shrink-0" />
                          <span className="text-xs font-inter text-pearl/70 capitalize w-16">{d.label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/6"><div className="h-full rounded-full bg-gold/70" style={{ width: `${(d.count / tot) * 100}%` }} /></div>
                          <span className="text-xs font-inter text-pearl/40 w-10 text-right">{d.count}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : <Empty />}
              </Panel>
              <Panel icon={ArrowDownRight} title="Sources d'entrée">
                {data.repartition.source.length ? (
                  <div className="space-y-2">
                    {data.repartition.source.map((s) => (
                      <div key={s.label} className="flex items-center justify-between text-xs font-inter">
                        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: SOURCE_COLOR[s.label] || '#9CA3AF' }} /><span className="text-pearl/70 capitalize">{s.label}</span></span>
                        <span className="font-bold text-white">{s.count}</span>
                      </div>
                    ))}
                  </div>
                ) : <Empty />}
              </Panel>
              <Panel icon={Globe} title="Pays / régions">
                {data.repartition.pays.length ? <BarList items={data.repartition.pays} color="#22C55E" /> : <Empty />}
              </Panel>
            </div>

            {/* Entonnoir + Membres engagés */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Panel icon={TrendingUp} title="Parcours de conversion (visite → inscription → don → formation)">
                {data.funnel.some((f) => f.n > 0) ? (
                  <div className="space-y-2">
                    {data.funnel.map((step, i) => {
                      const pct = Math.round((step.n / (data.funnel[0].n || 1)) * 100)
                      const fill = ['#6B7280', '#0EA5E9', '#EAB308', '#22C55E'][i] || '#D4AF37'
                      return (
                        <div key={step.etape}>
                          <div className="flex justify-between text-[11px] font-inter mb-1">
                            <span className="text-pearl/55">{step.etape}</span>
                            <span className="font-bold" style={{ color: fill }}>{step.n.toLocaleString('fr-FR')} <span className="text-pearl/30">({pct}%)</span></span>
                          </div>
                          <div className="h-7 rounded-lg overflow-hidden bg-white/4"><div className="h-full rounded-lg" style={{ width: `${pct}%`, background: `${fill}30`, border: `1px solid ${fill}40` }} /></div>
                        </div>
                      )
                    })}
                  </div>
                ) : <Empty />}
              </Panel>
              <Panel icon={Users} title="Membres les plus engagés">
                {data.top_membres.length ? (
                  <div className="space-y-1.5">
                    {data.top_membres.map((m, i) => (
                      <div key={m.user_id} className="flex items-center gap-3 text-xs font-inter py-1 border-b border-white/[0.03] last:border-0">
                        <span className="w-5 text-pearl/30 font-mono">{i + 1}</span>
                        <span className="flex-1 text-pearl/80 truncate">{m.nom}{m.pays && <span className="text-pearl/30 ml-1">· {m.pays}</span>}</span>
                        <span className="text-pearl/45">{fmtDur(m.duration_sec)}</span>
                        <span className="text-gold/70 w-16 text-right">{m.events} act.</span>
                      </div>
                    ))}
                  </div>
                ) : <Empty hint="Aucune session membre identifiée sur la période." />}
              </Panel>
            </div>

            <p className="text-[10px] font-inter text-pearl/25 text-center pt-2">
              Confidentialité : aucune IP stockée, visiteurs anonymes non identifiés ; les contenus de prière et de cure d'âme ne sont jamais tracés.
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

function BarList({ items, color }: { items: LC[]; color: string }) {
  const max = items[0]?.count || 1
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={`${it.label}-${i}`}>
          <div className="flex justify-between text-[11px] font-inter mb-1">
            <span className="text-pearl/70 truncate max-w-[75%]">{it.label}</span>
            <span className="font-bold text-white">{it.count.toLocaleString('fr-FR')}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/6"><div className="h-full rounded-full" style={{ width: `${(it.count / max) * 100}%`, background: `linear-gradient(90deg, ${color}, ${color}66)` }} /></div>
        </div>
      ))}
    </div>
  )
}
