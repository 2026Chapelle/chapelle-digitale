'use client'
/**
 * PODCAST-4 — Admin : Analytics audio « La Voix du Royaume ».
 * Agrégats uniquement (aucune identité d'auditeur). Garde réelle = /api/admin/* (isAdminRequest).
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Headphones, Users, Clock, CheckCircle2, RotateCcw, LogOut, Gauge,
  Mic, ListMusic, Loader2, RefreshCw, TrendingUp, Lock, Compass,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

interface Kpis {
  total_plays: number; unique_listeners: number; total_listening_seconds: number
  avg_listening_seconds: number; completion_rate: number; resume_rate: number
  abandon_rate: number; started_sessions: number
}
interface EpisodeStat { podcast_id: string; title: string; serie: string | null; plays: number; unique_listeners: number; listening_seconds: number; completion_rate: number }
interface SeriesStat { serie: string; plays: number; unique_listeners: number; listening_seconds: number; completion_rate: number }
interface PlaylistStat { playlist_id: string; title: string; playlist_type: string; plays: number; unique_listeners: number; listening_seconds: number; completion_rate: number }
interface AccessStat { access_context: string; plays: number; unique_listeners: number; listening_seconds: number }
interface SourceStat { source_context: string; plays: number; unique_listeners: number; listening_seconds: number }
interface TrendPoint { bucket: string; plays: number; unique_listeners: number }
interface Payload {
  ok: boolean; range: string; granularity: string; sampled: boolean
  available_series: string[]
  filters: { serie: string | null; access: string | null; playlist: string | null }
  kpis: Kpis; top_episodes: EpisodeStat[]; top_series: SeriesStat[]
  playlists: PlaylistStat[]; access_breakdown: AccessStat[]; source_breakdown?: SourceStat[]; trend: TrendPoint[]
}

const RANGES = [{ v: '7d', l: '7 jours' }, { v: '30d', l: '30 jours' }, { v: '90d', l: '90 jours' }, { v: 'all', l: 'Tout' }]
const ACCESS_LABEL: Record<string, string> = { public: 'Public', member: 'Membre', premium: 'Premium', inconnu: 'Inconnu' }
const ACCESS_COLOR: Record<string, string> = { public: '#22C55E', member: '#0EA5E9', premium: '#D4AF37', inconnu: '#6B7280' }
// PODCAST-9 / D1 : libellés FR des rails d'origine de lecture (source_context).
const SOURCE_LABEL: Record<string, string> = {
  catalog: 'Catalogue', featured: 'À la une', new_release: 'Nouveautés',
  continue_listening: "Continuer l'écoute", official_playlist: 'Playlist officielle',
  personal_playlist: 'Playlist perso', homepage_instant: 'Accueil · Instant',
  homepage_premium: 'Accueil · Premium', direct: 'Direct',
  personalized: 'Pour toi', popular: 'Populaire', inconnu: 'Inconnu',
}

function fmtDur(s: number): string {
  if (!s || s < 0) return '0s'
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60)
  return h ? `${h}h ${m}m` : m ? `${m}m ${sec}s` : `${sec}s`
}
const pct = (r: number) => `${Math.round((r || 0) * 100)}%`

export default function PodcastAnalyticsPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [range, setRange] = useState('7d')
  const [serie, setSerie] = useState('')
  const [access, setAccess] = useState('')
  const [lastUpdate, setLastUpdate] = useState('')

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ range })
      if (serie) p.set('serie', serie)
      if (access) p.set('access', access)
      const r = await fetch(`/api/admin/podcast-analytics?${p}`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.demo) setDemo(true)
      else if (j.ok) { setData(j); setLastUpdate(new Date().toLocaleTimeString('fr-FR')) }
    } catch { /* */ }
    setLoading(false)
  }, [range, serie, access])

  useEffect(() => { setLoading(true); load() }, [range, serie, access, load])

  const k = data?.kpis

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal space-y-6">
        <PageHeader
          eyebrow="Administration · Podcast"
          title={<>La Voix du Royaume — <span className="text-cinematic-gold">Analytics audio</span></>}
          description="Écoutes réelles agrégées : lectures, auditeurs, temps d'écoute, complétion, abandon. Aucune identité d'auditeur exposée (agrégats uniquement)."
        />

        {/* Contrôles */}
        <div className="card-cinematic p-3 flex flex-wrap items-center gap-2.5">
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button key={r.v} onClick={() => setRange(r.v)}
                className={`text-xs font-inter px-3 py-1.5 rounded-lg border ${range === r.v ? 'bg-gold text-black border-transparent font-semibold' : 'bg-white/5 text-pearl/55 border-white/10'}`}>{r.l}</button>
            ))}
          </div>
          <select value={serie} onChange={(e) => setSerie(e.target.value)} className="input-royal text-sm w-52">
            <option value="">Toutes les émissions</option>
            {(data?.available_series || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={access} onChange={(e) => setAccess(e.target.value)} className="input-royal text-sm w-40">
            <option value="">Tous les accès</option>
            <option value="public">Public</option>
            <option value="member">Membre</option>
            <option value="premium">Premium</option>
          </select>
          <button onClick={() => { setLoading(true); load() }} className="btn-gold text-xs px-3 py-1.5 inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Actualiser</button>
          {lastUpdate && <span className="text-[11px] font-inter text-pearl/30 ml-auto">MàJ {lastUpdate}</span>}
        </div>

        {demo && <div className="card-cinematic p-4 text-sm text-pearl/60 font-inter">Mode démo : connectez Supabase pour les chiffres réels.</div>}
        {data?.sampled && <div className="card-cinematic p-3 text-xs text-amber-300/80 font-inter">Échantillon tronqué (fenêtre très dense) : les chiffres portent sur les événements les plus récents.</div>}

        {loading && !data ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : !data ? (
          <div className="card-cinematic p-10 text-center text-pearl/40 font-inter">Aucune donnée d'écoute pour le moment.</div>
        ) : (
          <>
            {/* KPI principaux */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={Headphones} color="#D4AF37" value={k!.total_plays} label="Lectures" sub={`${k!.started_sessions} écoutes distinctes`} />
              <Kpi icon={Users} color="#0EA5E9" value={k!.unique_listeners} label="Auditeurs uniques" sub="membres + sessions anon." />
              <Kpi icon={Clock} color="#8B5CF6" value={fmtDur(k!.total_listening_seconds)} label="Temps d'écoute total" />
              <Kpi icon={CheckCircle2} color="#22C55E" value={pct(k!.completion_rate)} label="Taux de complétion" />
            </div>

            {/* KPI secondaires */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={Gauge} color="#EC4899" value={fmtDur(k!.avg_listening_seconds)} label="Temps moyen / écoute" />
              <Kpi icon={RotateCcw} color="#F59E0B" value={pct(k!.resume_rate)} label="Taux de reprise" />
              <Kpi icon={LogOut} color="#EF4444" value={pct(k!.abandon_rate)} label="Taux d'abandon" />
              <Kpi icon={TrendingUp} color="#14B8A6" value={data.trend.reduce((a, t) => a + t.plays, 0)} label={`Lectures (tendance ${data.granularity === 'week' ? 'hebdo' : 'jour'})`} />
            </div>

            {/* Tendance */}
            <Panel icon={TrendingUp} title={`Tendance des écoutes (${data.granularity === 'week' ? 'par semaine' : 'par jour'})`}>
              {data.trend.length ? <Trend points={data.trend} /> : <Empty />}
            </Panel>

            {/* Top épisodes + Top émissions */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Panel icon={Mic} title="Épisodes les plus écoutés">
                {data.top_episodes.length ? <EpisodeTable rows={data.top_episodes} /> : <Empty />}
              </Panel>
              <Panel icon={Headphones} title="Émissions les plus écoutées">
                {data.top_series.length ? <SeriesTable rows={data.top_series} /> : <Empty />}
              </Panel>
            </div>

            {/* Playlists officielles + Répartition accès */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Panel icon={ListMusic} title="Playlists officielles (écoutes générées)">
                {data.playlists.filter((p) => p.playlist_type === 'official').length
                  ? <PlaylistTable rows={data.playlists.filter((p) => p.playlist_type === 'official')} />
                  : <Empty hint="Aucune écoute rattachée à une playlist officielle sur la période." />}
              </Panel>
              <Panel icon={Lock} title="Répartition par niveau d'accès">
                {data.access_breakdown.length ? (
                  <div className="space-y-2.5">
                    {data.access_breakdown.map((a) => {
                      const tot = data.access_breakdown.reduce((s, x) => s + x.plays, 0) || 1
                      return (
                        <div key={a.access_context}>
                          <div className="flex justify-between text-[11px] font-inter mb-1">
                            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: ACCESS_COLOR[a.access_context] || '#6B7280' }} /><span className="text-pearl/70">{ACCESS_LABEL[a.access_context] || a.access_context}</span></span>
                            <span className="font-bold text-white">{a.plays.toLocaleString('fr-FR')} <span className="text-pearl/30 font-normal">· {fmtDur(a.listening_seconds)}</span></span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/6"><div className="h-full rounded-full" style={{ width: `${(a.plays / tot) * 100}%`, background: ACCESS_COLOR[a.access_context] || '#6B7280' }} /></div>
                        </div>
                      )
                    })}
                  </div>
                ) : <Empty />}
              </Panel>
            </div>

            {/* PODCAST-9 / D1 — Répartition par rail d'origine (efficacité « Pour toi » / « Populaire » / catalogue) */}
            <Panel icon={Compass} title="Répartition par rail d'origine">
              {data.source_breakdown && data.source_breakdown.length ? (
                <div className="space-y-2.5">
                  {data.source_breakdown.map((s) => {
                    const tot = data.source_breakdown!.reduce((acc, x) => acc + x.plays, 0) || 1
                    return (
                      <div key={s.source_context}>
                        <div className="flex justify-between text-[11px] font-inter mb-1">
                          <span className="text-pearl/70">{SOURCE_LABEL[s.source_context] || s.source_context}</span>
                          <span className="font-bold text-white">{s.plays.toLocaleString('fr-FR')} <span className="text-pearl/30 font-normal">· {fmtDur(s.listening_seconds)} · {s.unique_listeners.toLocaleString('fr-FR')} aud.</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/6"><div className="h-full rounded-full bg-gold" style={{ width: `${(s.plays / tot) * 100}%` }} /></div>
                      </div>
                    )
                  })}
                </div>
              ) : <Empty hint="Aucune écoute contextualisée par rail sur la période." />}
            </Panel>

            <p className="text-[10px] font-inter text-pearl/25 text-center pt-2">
              Confidentialité : événements d'écoute agrégés, aucune identité d'auditeur exposée. Auditeurs uniques anonymes estimés par session (précision limitée, aucun fingerprint).
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

function Trend({ points }: { points: TrendPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.plays))
  return (
    <div className="flex items-end gap-1.5 h-40 overflow-x-auto pb-1">
      {points.map((p) => (
        <div key={p.bucket} className="flex flex-col items-center gap-1 flex-1 min-w-[22px]" title={`${p.bucket} · ${p.plays} lectures · ${p.unique_listeners} auditeurs`}>
          <span className="text-[9px] font-inter text-pearl/40">{p.plays}</span>
          <div className="w-full rounded-t bg-gradient-to-t from-gold/30 to-gold/80" style={{ height: `${(p.plays / max) * 100}%`, minHeight: p.plays ? 4 : 1 }} />
          <span className="text-[8px] font-inter text-pearl/25 whitespace-nowrap">{p.bucket.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

function EpisodeTable({ rows }: { rows: EpisodeStat[] }) {
  return (
    <div className="space-y-1">
      <Head cols={['Épisode', 'Lectures', 'Uniques', 'Temps', 'Compl.']} />
      {rows.map((r, i) => (
        <div key={r.podcast_id} className="grid grid-cols-[1.6rem_1fr_auto_auto_auto_auto] gap-2 items-center text-xs font-inter py-1.5 border-b border-white/[0.03] last:border-0">
          <span className="text-pearl/30 font-mono">{i + 1}</span>
          <span className="min-w-0"><span className="text-pearl/85 truncate block">{r.title}</span>{r.serie && <span className="text-pearl/30 text-[10px]">{r.serie}</span>}</span>
          <span className="text-gold/80 font-bold w-12 text-right">{r.plays}</span>
          <span className="text-pearl/50 w-12 text-right">{r.unique_listeners}</span>
          <span className="text-pearl/50 w-16 text-right">{fmtDur(r.listening_seconds)}</span>
          <span className="text-green-400/70 w-12 text-right">{pct(r.completion_rate)}</span>
        </div>
      ))}
    </div>
  )
}

function SeriesTable({ rows }: { rows: SeriesStat[] }) {
  return (
    <div className="space-y-1">
      <Head cols={['Émission', 'Lectures', 'Uniques', 'Temps', 'Compl.']} />
      {rows.map((r, i) => (
        <div key={r.serie} className="grid grid-cols-[1.6rem_1fr_auto_auto_auto_auto] gap-2 items-center text-xs font-inter py-1.5 border-b border-white/[0.03] last:border-0">
          <span className="text-pearl/30 font-mono">{i + 1}</span>
          <span className="text-pearl/85 truncate">{r.serie}</span>
          <span className="text-gold/80 font-bold w-12 text-right">{r.plays}</span>
          <span className="text-pearl/50 w-12 text-right">{r.unique_listeners}</span>
          <span className="text-pearl/50 w-16 text-right">{fmtDur(r.listening_seconds)}</span>
          <span className="text-green-400/70 w-12 text-right">{pct(r.completion_rate)}</span>
        </div>
      ))}
    </div>
  )
}

function PlaylistTable({ rows }: { rows: PlaylistStat[] }) {
  return (
    <div className="space-y-1">
      <Head cols={['Playlist', 'Lectures', 'Uniques', 'Temps', 'Compl.']} />
      {rows.map((r, i) => (
        <div key={r.playlist_id} className="grid grid-cols-[1.6rem_1fr_auto_auto_auto_auto] gap-2 items-center text-xs font-inter py-1.5 border-b border-white/[0.03] last:border-0">
          <span className="text-pearl/30 font-mono">{i + 1}</span>
          <span className="text-pearl/85 truncate">{r.title}</span>
          <span className="text-gold/80 font-bold w-12 text-right">{r.plays}</span>
          <span className="text-pearl/50 w-12 text-right">{r.unique_listeners}</span>
          <span className="text-pearl/50 w-16 text-right">{fmtDur(r.listening_seconds)}</span>
          <span className="text-green-400/70 w-12 text-right">{pct(r.completion_rate)}</span>
        </div>
      ))}
    </div>
  )
}

function Head({ cols }: { cols: string[] }) {
  return (
    <div className="grid grid-cols-[1.6rem_1fr_auto_auto_auto_auto] gap-2 text-[9px] font-inter uppercase tracking-wider text-pearl/30 pb-1 border-b border-white/[0.05]">
      <span />
      <span>{cols[0]}</span>
      <span className="w-12 text-right">{cols[1]}</span>
      <span className="w-12 text-right">{cols[2]}</span>
      <span className="w-16 text-right">{cols[3]}</span>
      <span className="w-12 text-right">{cols[4]}</span>
    </div>
  )
}
