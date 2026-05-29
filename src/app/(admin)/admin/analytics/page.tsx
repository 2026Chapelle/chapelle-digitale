'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  TrendingUp, Users, DollarSign, Play, BookOpen,
  Globe, Heart, Zap, Calendar, ChevronDown, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

const ChartSkeleton = () => (
  <div
    className="w-full h-full rounded-xl animate-pulse"
    style={{
      background: 'linear-gradient(180deg, rgba(212,175,55,0.04) 0%, rgba(212,175,55,0.01) 100%)',
      border: '1px solid rgba(212,175,55,0.06)',
    }}
  />
)
const GrowthArea = dynamic(() => import('./AnalyticsCharts').then(m => m.GrowthArea), { ssr: false, loading: ChartSkeleton })
const EngagementPie = dynamic(() => import('./AnalyticsCharts').then(m => m.EngagementPie), { ssr: false, loading: ChartSkeleton })
const EngagementBars = dynamic(() => import('./AnalyticsCharts').then(m => m.EngagementBars), { ssr: false, loading: ChartSkeleton })

const PERIODS = ['7 jours', '30 jours', '3 mois', '12 mois']

const GROWTH_DATA = [
  { mois: 'Déc', membres: 41200, dons: 18400, vues: 124000 },
  { mois: 'Jan', membres: 43800, dons: 21200, vues: 138000 },
  { mois: 'Fév', membres: 45100, dons: 19800, vues: 142000 },
  { mois: 'Mar', membres: 47300, dons: 24600, vues: 156000 },
  { mois: 'Avr', membres: 49100, dons: 27800, vues: 168000 },
  { mois: 'Mai', membres: 51400, dons: 31200, vues: 184000 },
]

const ENGAGEMENT_DATA = [
  { jour: 'Lun', lives: 2840, formations: 1240, podcast: 890, prieres: 540 },
  { jour: 'Mar', lives: 1920, formations: 1580, podcast: 1120, prieres: 620 },
  { jour: 'Mer', lives: 1380, formations: 1840, podcast: 980, prieres: 710 },
  { jour: 'Jeu', lives: 1650, formations: 1290, podcast: 840, prieres: 580 },
  { jour: 'Ven', lives: 2100, formations: 1150, podcast: 760, prieres: 920 },
  { jour: 'Sam', lives: 3240, formations: 980, podcast: 1340, prieres: 1180 },
  { jour: 'Dim', lives: 5800, formations: 720, podcast: 1580, prieres: 2100 },
]

const GEO_DATA = [
  { pays: '🇫🇷 France', membres: 12400, pct: 24.1 },
  { pays: '🇨🇩 Rép. Dém. Congo', membres: 9800, pct: 19.1 },
  { pays: '🇨🇲 Cameroun', membres: 7200, pct: 14.0 },
  { pays: '🇨🇦 Canada', membres: 5100, pct: 9.9 },
  { pays: '🇧🇪 Belgique', membres: 4300, pct: 8.4 },
  { pays: '🇨🇮 Côte d\'Ivoire', membres: 3800, pct: 7.4 },
  { pays: '🇬🇳 Guinée', membres: 2100, pct: 4.1 },
  { pays: 'Autres', membres: 6700, pct: 13.0 },
]

const FUNNEL_DATA = [
  { name: 'Visiteurs uniques', value: 184000, fill: '#6B7280' },
  { name: 'Inscriptions', value: 12400, fill: '#0EA5E9' },
  { name: 'Membres actifs', value: 8700, fill: '#8B5CF6' },
  { name: 'Abonnés Disciple', value: 3200, fill: '#D4AF37' },
  { name: 'Partenaires', value: 480, fill: '#22C55E' },
]

const CONTENT_PERF = [
  { titre: 'La Prière qui Change Tout', type: 'Podcast', vues: 12400, taux: 84 },
  { titre: "Culte Pentecôte 2026", type: 'Live', vues: 8700, taux: 91 },
  { titre: "L'Identité en Christ", type: 'Podcast', vues: 9200, taux: 78 },
  { titre: 'Leadership Serviteur — Séance 1', type: 'Formation', vues: 6800, taux: 72 },
  { titre: 'Veillée de Prière Nations', type: 'Live', vues: 5900, taux: 88 },
]

const KPI_CARDS = [
  { label: 'Membres total', value: '51 400', delta: '+4.7%', up: true, icon: Users, color: '#D4AF37' },
  { label: 'Revenu mensuel', value: '31 200€', delta: '+12.2%', up: true, icon: DollarSign, color: '#22C55E' },
  { label: 'Spectateurs live (mois)', value: '184K', delta: '+9.1%', up: true, icon: Play, color: '#EF4444' },
  { label: 'Modules complétés', value: '8 740', delta: '-2.3%', up: false, icon: BookOpen, color: '#8B5CF6' },
  { label: 'Prières soumises', value: '2 190', delta: '+18.5%', up: true, icon: Heart, color: '#EC4899' },
  { label: 'Taux rétention 30j', value: '76.4%', delta: '+1.8pt', up: true, icon: Zap, color: '#0EA5E9' },
]

const PIE_DATA = [
  { name: 'Lives', value: 38, color: '#EF4444' },
  { name: 'Formations', value: 27, color: '#8B5CF6' },
  { name: 'Podcast', value: 19, color: '#D4AF37' },
  { name: 'Prières', value: 10, color: '#EC4899' },
  { name: 'Autre', value: 6, color: '#6B7280' },
]

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('30 jours')

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal space-y-7">

        <PageHeader
          eyebrow="Administration"
          title={<>Analytics &amp; <span className="text-cinematic-gold">Rapports</span></>}
          description="Croissance, engagement, conversion et entonnoir membres."
          className="!mb-0"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {PERIODS.map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-inter font-semibold transition-all"
                  style={{
                    background: period === p ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${period === p ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    color: period === p ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                  }}>
                  {p}
                </button>
              ))}
            </div>
          }
        />

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {KPI_CARDS.map((kpi, i) => (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-royal p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <div className={`flex items-center gap-0.5 text-[10px] font-inter font-bold ${kpi.up ? 'text-green-400' : 'text-red-400'}`}>
                  {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {kpi.delta}
                </div>
              </div>
              <div className="font-cinzel text-lg font-black" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="font-inter text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Growth chart + Pie */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="card-royal xl:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold" /> Croissance — Membres & Revenus
              </h2>
            </div>
            <div className="h-[240px]">
              <GrowthArea data={GROWTH_DATA} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="card-royal">
            <h2 className="font-cinzel text-sm font-bold text-pearl mb-5">Répartition Engagement</h2>
            <div className="h-[160px]">
              <EngagementPie data={PIE_DATA} />
            </div>
            <div className="space-y-2 mt-3">
              {PIE_DATA.map(d => (
                <div key={d.name} className="flex items-center justify-between text-[10px] font-inter">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{d.name}</span>
                  </div>
                  <span className="font-bold text-white">{d.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Engagement by day + Funnel */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="card-royal">
            <h2 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gold" /> Engagement par Jour
            </h2>
            <div className="h-[220px]">
              <EngagementBars data={ENGAGEMENT_DATA} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="card-royal">
            <h2 className="font-cinzel text-sm font-bold text-pearl mb-5">Entonnoir de Conversion</h2>
            <div className="space-y-2">
              {FUNNEL_DATA.map((step, i) => {
                const pct = Math.round((step.value / FUNNEL_DATA[0].value) * 100)
                return (
                  <div key={step.name}>
                    <div className="flex justify-between text-[11px] font-inter mb-1">
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{step.name}</span>
                      <span className="font-bold" style={{ color: step.fill }}>{step.value.toLocaleString()} <span style={{ color: 'rgba(255,255,255,0.3)' }}>({pct}%)</span></span>
                    </div>
                    <div className="h-7 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <motion.div
                        className="h-full rounded-lg flex items-center pl-3"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: `${step.fill}30`, border: `1px solid ${step.fill}40` }}
                      >
                        {pct > 15 && <span className="text-[9px] font-inter font-bold" style={{ color: step.fill }}>{pct}%</span>}
                      </motion.div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-pearl/5 text-[11px] font-inter" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Taux de conversion visiteur → membre : <span className="font-bold text-gold">6.7%</span>
            </div>
          </motion.div>
        </div>

        {/* Geo + Top content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="card-royal">
            <h2 className="font-cinzel text-sm font-bold text-pearl mb-5 flex items-center gap-2">
              <Globe className="w-4 h-4 text-gold" /> Présence Géographique
            </h2>
            <div className="space-y-3">
              {GEO_DATA.map((g, i) => (
                <div key={g.pays}>
                  <div className="flex justify-between text-[11px] font-inter mb-1">
                    <span className="text-white">{g.pays}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{g.membres.toLocaleString()} · <span className="font-bold text-gold">{g.pct}%</span></span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${g.pct * 4}%` }}
                      transition={{ duration: 0.7, delay: 0.35 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                      style={{ background: `linear-gradient(90deg, #D4AF37, rgba(212,175,55,0.4))` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="card-royal">
            <h2 className="font-cinzel text-sm font-bold text-pearl mb-5">Contenus les plus Performants</h2>
            <div className="space-y-3">
              {CONTENT_PERF.map((c, i) => (
                <div key={c.titre} className="flex items-center gap-3 py-2"
                  style={{ borderBottom: i < CONTENT_PERF.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
                    style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-inter text-xs font-semibold text-white truncate">{c.titre}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-inter px-1.5 py-0.5 rounded"
                        style={{ background: c.type === 'Live' ? 'rgba(239,68,68,0.12)' : c.type === 'Podcast' ? 'rgba(212,175,55,0.12)' : 'rgba(139,92,246,0.12)',
                          color: c.type === 'Live' ? '#EF4444' : c.type === 'Podcast' ? '#D4AF37' : '#8B5CF6' }}>
                        {c.type}
                      </span>
                      <span className="text-[10px] font-inter" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {c.vues.toLocaleString()} vues
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-cinzel text-sm font-black text-green-400">{c.taux}%</div>
                    <div className="text-[9px] font-inter" style={{ color: 'rgba(255,255,255,0.3)' }}>rétention</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  )
}
