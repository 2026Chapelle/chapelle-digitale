'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  Users, UserPlus, Heart, BookOpen, DollarSign, FileText,
  Eye, MousePointerClick, TrendingUp, ArrowUp, ArrowDown,
  Globe, Activity, MessageCircle, CheckCircle, AlertTriangle, XCircle,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  emptyDashboardStats, RANGE_LABELS, type DateRange, type Stat,
} from '@/lib/admin-analytics'
import { useAdminData } from '@/lib/chapelle/useAdminData'

const ChartSkeleton = () => (
  <div className="w-full h-full rounded-xl animate-pulse"
    style={{ background: 'linear-gradient(180deg, rgba(212,175,55,0.04) 0%, rgba(212,175,55,0.01) 100%)', border: '1px solid rgba(212,175,55,0.06)' }} />
)
const TrendChart = dynamic(() => import('./TrendChart'), { ssr: false, loading: ChartSkeleton })

// ── helpers d'affichage ──────────────────────────────────────────────
function fmt(stat: Stat): string {
  if (stat.unit === 'currency') return `${stat.value.toLocaleString('fr-FR')} €`
  if (stat.unit === 'percent') return `${stat.value.toLocaleString('fr-FR')} %`
  return stat.value.toLocaleString('fr-FR')
}

function card(s: Stat, title: string, subtitle: string, icon: LucideIcon, color: string) {
  return { s, title, subtitle, icon, color }
}

const RANGES: DateRange[] = ['today', '7d', '30d']

export default function AdminDashboardPage() {
  const [range, setRange] = useState<DateRange>('7d')
  // Branché sur Supabase (v_admin_kpis, v_tunnel_par_stage, form_submissions) ;
  // fallback automatique sur le mock en mode démo.
  // Aucune donnée fictive : démarrage à zéro, remplacé par le réel (RPC) si disponible.
  const stats = useAdminData(`/api/admin/data/dashboard?range=${range}`, () => emptyDashboardStats(range))

  const cards = [
    card(stats.visiteursAujourdhui, 'Visiteurs aujourd’hui', 'sessions du jour', Eye, '#D4AF37'),
    card(stats.visiteursSemaine, 'Visiteurs cette semaine', '7 derniers jours', Activity, '#0EA5E9'),
    card(stats.inscriptions, 'Inscriptions', RANGE_LABELS[range], UserPlus, '#22C55E'),
    card(stats.formulairesRecus, 'Formulaires reçus', RANGE_LABELS[range], FileText, '#6366F1'),
    card(stats.demandesPriere, 'Demandes de prière', RANGE_LABELS[range], Heart, '#EC4899'),
    card(stats.nouveauxMembres, 'Nouveaux membres', RANGE_LABELS[range], Users, '#F97316'),
    card(stats.tauxConversion, 'Conversion visiteur→membre', 'taux moyen', TrendingUp, '#A855F7'),
    card(stats.formationsCommencees, 'Formations commencées', RANGE_LABELS[range], BookOpen, '#8B5CF6'),
    card(stats.donsRecus, 'Dons reçus', RANGE_LABELS[range], DollarSign, '#14B8A6'),
    card(stats.visiteursPeriode, 'Visiteurs (période)', RANGE_LABELS[range], Globe, '#F59E0B'),
  ]

  // Garde contre les listes vides (évite Math.max(...[]) = -Infinity).
  const mx = (arr: number[]) => (arr.length ? Math.max(...arr) : 1)
  const maxPage = mx(stats.topPages.map((p) => p.views))
  const maxCountry = mx(stats.paysVisiteurs.map((p) => p.visiteurs))
  const maxBtn = mx(stats.clicsBoutons.map((b) => b.clicks))
  const maxTunnel = mx(stats.tunnelActivite.map((t) => t.count))
  const maxProg = mx(stats.progressionMembres.map((p) => p.membres))

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={<>Tableau de <span className="text-cinematic-gold">bord</span></>}
          description="Vue d’ensemble de l’activité de la Citadelle du Royaume."
          actions={
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-3.5 py-1.5 rounded-lg font-inter text-xs font-semibold transition-all"
                  style={
                    range === r
                      ? { background: 'linear-gradient(135deg,#F5E6A7,#D4AF37)', color: '#1A0F00' }
                      : { color: 'rgba(255,255,255,0.5)' }
                  }
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
          }
        />

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.03 }}
              className="card-cinematic p-4 md:p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${c.color}1A`, border: `1px solid ${c.color}33` }}>
                  <c.icon className="w-4 h-4" style={{ color: c.color }} />
                </div>
                {c.s.delta !== null && (
                  <span className="flex items-center gap-0.5 font-inter text-[11px] font-semibold"
                    style={{ color: c.s.delta >= 0 ? '#22C55E' : '#EF4444' }}>
                    {c.s.delta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {Math.abs(c.s.delta)}%
                  </span>
                )}
              </div>
              <div className="font-cinzel font-black text-xl md:text-2xl text-pearl leading-none">{fmt(c.s)}</div>
              <div className="font-inter text-[11px] md:text-xs text-pearl/55 mt-1.5 leading-tight">{c.title}</div>
              <div className="font-inter text-[10px] text-pearl/30 mt-0.5">{c.subtitle}</div>
            </motion.div>
          ))}
        </div>

        {/* CHARTS ROW */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 card-cinematic p-5">
            <h2 className="font-inter text-sm font-bold text-pearl mb-1">Visiteurs & inscriptions</h2>
            <p className="font-inter text-xs text-pearl/40 mb-4">{RANGE_LABELS[range]}</p>
            <div className="h-64"><TrendChart data={stats.tendance} /></div>
          </div>
          <div className="card-cinematic p-5">
            <h2 className="font-inter text-sm font-bold text-pearl mb-1">Répartition plateformes</h2>
            <p className="font-inter text-xs text-pearl/40 mb-4">part d’audience</p>
            <div className="h-64 flex flex-col items-center justify-center text-center gap-2">
              <Globe className="w-7 h-7 text-pearl/15" />
              <p className="font-inter text-xs text-pearl/40 max-w-[200px]">
                La répartition d’audience par plateforme s’affichera dès que le suivi analytique par plateforme sera collecté.
              </p>
            </div>
          </div>
        </div>

        {/* LISTS ROW 1 : pages + pays + boutons */}
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <BarCard title="Pages les plus vues" icon={Eye}>
            {stats.topPages.map((p) => (
              <BarRow key={p.path} label={p.path} value={p.views} max={maxPage} color="#D4AF37" mono />
            ))}
          </BarCard>

          <BarCard title="Pays des visiteurs" icon={Globe}>
            {stats.paysVisiteurs.map((p) => (
              <BarRow key={p.pays} label={`${p.flag}  ${p.pays}`} value={p.visiteurs} max={maxCountry} color="#0EA5E9" />
            ))}
          </BarCard>

          <BarCard title="Clics boutons principaux" icon={MousePointerClick}>
            {stats.clicsBoutons.map((b) => (
              <BarRow key={b.label} label={b.label} value={b.clicks} max={maxBtn} color={b.color} />
            ))}
          </BarCard>
        </div>

        {/* LISTS ROW 2 : tunnel + progression */}
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          <BarCard title="Activité des tunnels" icon={Activity} subtitle="contacts par étape">
            {stats.tunnelActivite.map((t) => (
              <BarRow key={t.key} label={t.nom} value={t.count} max={maxTunnel} color={t.color} />
            ))}
          </BarCard>

          <BarCard title="Progression des membres" icon={TrendingUp} subtitle="répartition par étape">
            {stats.progressionMembres.map((p) => (
              <BarRow key={p.etape} label={p.etape} value={p.membres} max={maxProg} color={p.color} />
            ))}
          </BarCard>
        </div>

        {/* MESSAGES + ALERTES */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Messages récents */}
          <div className="card-cinematic p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4 text-gold" />
              <h2 className="font-inter text-sm font-bold text-pearl">Messages récents</h2>
            </div>
            <div className="space-y-2.5">
              {stats.messagesRecents.map((m, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-cinzel text-[11px] font-black"
                    style={{ background: `${m.color}1F`, color: m.color }}>
                    {m.nom.split(' ').map((x) => x[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-inter text-xs font-semibold text-pearl truncate">{m.nom}</span>
                      <span className="font-inter text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${m.color}1F`, color: m.color }}>{m.type}</span>
                    </div>
                    <p className="font-inter text-[11px] text-pearl/50 truncate mt-0.5">{m.extrait}</p>
                  </div>
                  <span className="font-inter text-[10px] text-pearl/30 flex-shrink-0">{m.temps}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alertes techniques */}
          <div className="card-cinematic p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-gold" />
              <h2 className="font-inter text-sm font-bold text-pearl">Alertes techniques</h2>
            </div>
            <div className="space-y-2.5">
              {stats.alertesTechniques.map((a, i) => {
                const cfg = {
                  ok: { Icon: CheckCircle, color: '#22C55E' },
                  warn: { Icon: AlertTriangle, color: '#F59E0B' },
                  error: { Icon: XCircle, color: '#EF4444' },
                }[a.niveau]
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: `${cfg.color}0D`, border: `1px solid ${cfg.color}26` }}>
                    <cfg.Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                    <div className="min-w-0 flex-1">
                      <div className="font-inter text-xs font-semibold text-pearl">{a.titre}</div>
                      <p className="font-inter text-[11px] text-pearl/50 mt-0.5">{a.detail}</p>
                    </div>
                    <span className="font-inter text-[10px] text-pearl/30 flex-shrink-0">{a.temps}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── sous-composants ──────────────────────────────────────────────────
function BarCard({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card-cinematic p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-gold" />
        <h2 className="font-inter text-sm font-bold text-pearl">{title}</h2>
        {subtitle && <span className="font-inter text-[10px] text-pearl/35 ml-auto">{subtitle}</span>}
      </div>
      <div className="space-y-3">{children}</div>
    </motion.div>
  )
}

function BarRow({ label, value, max, color, mono }: { label: string; value: number; max: number; color: string; mono?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs text-pearl/70 truncate pr-2 ${mono ? 'font-mono' : 'font-inter'}`}>{label}</span>
        <span className="font-inter text-xs font-semibold text-pearl flex-shrink-0">{value.toLocaleString('fr-FR')}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
      </div>
    </div>
  )
}
