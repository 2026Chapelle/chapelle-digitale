'use client'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import {
  Trophy, TrendingUp, Star, Zap, Award,
  BarChart2, Target, Heart, BookOpen,
  Sprout, Crown, Building2, ArrowUpRight, ArrowDownRight,
  type LucideIcon,
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
const CommunityRadar = dynamic(() => import('./EngagementCharts').then(m => m.CommunityRadar), {
  ssr: false,
  loading: ChartSkeleton,
})
const ActionsBar = dynamic(() => import('./EngagementCharts').then(m => m.ActionsBar), {
  ssr: false,
  loading: ChartSkeleton,
})

const LEADERBOARD = [
  { rang: 1, nom: 'Grâce K.', pays: '🇨🇮', score: 98, badges: 9, formations: 12, prières: 145, couleur: '#D4AF37' },
  { rang: 2, nom: 'David M.', pays: '🇨🇩', score: 94, badges: 8, formations: 10, prières: 128, couleur: '#C0C0C0' },
  { rang: 3, nom: 'Sarah P.', pays: '🇫🇷', score: 91, badges: 7, formations: 9, prières: 102, couleur: '#CD7F32' },
  { rang: 4, nom: 'John A.', pays: '🇬🇭', score: 87, badges: 6, formations: 8, prières: 89, couleur: '#8B5CF6' },
  { rang: 5, nom: 'Marie C.', pays: '🇧🇪', score: 83, badges: 6, formations: 7, prières: 76, couleur: '#0EA5E9' },
  { rang: 6, nom: 'Paul N.', pays: '🇨🇲', score: 79, badges: 5, formations: 6, prières: 65, couleur: '#22C55E' },
  { rang: 7, nom: 'Hope T.', pays: '🇳🇬', score: 76, badges: 5, formations: 6, prières: 58, couleur: '#EC4899' },
  { rang: 8, nom: 'Samuel R.', pays: '🇷🇼', score: 72, badges: 4, formations: 5, prières: 51, couleur: '#F59E0B' },
]

const ENGAGEMENT_BY_ACTION = [
  { action: 'Formations', valeur: 740, color: '#8B5CF6' },
  { action: 'Prières', valeur: 1240, color: '#EC4899' },
  { action: 'Lives', valeur: 892, color: '#EF4444' },
  { action: 'Événements', valeur: 345, color: '#22C55E' },
  { action: 'Ressources', valeur: 523, color: '#0EA5E9' },
  { action: 'Dons', valeur: 180, color: '#D4AF37' },
]

const RADAR_DATA = [
  { subject: 'Prière', A: 92, fullMark: 100 },
  { subject: 'Formation', A: 78, fullMark: 100 },
  { subject: 'Communauté', A: 65, fullMark: 100 },
  { subject: 'Don', A: 45, fullMark: 100 },
  { subject: 'Évangélisation', A: 58, fullMark: 100 },
  { subject: 'Live', A: 83, fullMark: 100 },
]

type BadgeStat = { icon: LucideIcon; nom: string; count: number; rare: boolean; color: string }
const BADGE_STATS: BadgeStat[] = [
  { icon: Sprout,     nom: 'Premier Pas',     count: 4127, rare: false, color: '#22C55E' },
  { icon: Star,       nom: 'Fidèle',          count: 892,  rare: false, color: '#D4AF37' },
  { icon: Heart,      nom: 'Intercesseur',    count: 524,  rare: false, color: '#0EA5E9' },
  { icon: BookOpen,   nom: 'Étudiant',        count: 741,  rare: false, color: '#8B5CF6' },
  { icon: Crown,      nom: 'Leader',          count: 89,   rare: true,  color: '#D4AF37' },
  { icon: Building2,  nom: 'Pilier',          count: 145,  rare: true,  color: '#6366F1' },
  { icon: Zap,        nom: 'Apôtre Digital',  count: 12,   rare: true,  color: '#D4AF37' },
]

const KPI = [
  { title: 'Score moyen', value: '67', unit: '/100', icon: Target, color: '#D4AF37', delta: 4, deltaLabel: 'vs mois dernier' },
  { title: 'Badges distribués', value: '8 420', unit: '', icon: Award, color: '#8B5CF6', delta: 12, deltaLabel: 'vs mois dernier' },
  { title: 'Actions / jour', value: '3.2K', unit: '', icon: Zap, color: '#22C55E', delta: 8, deltaLabel: 'vs mois dernier' },
  { title: 'Taux rétention', value: '78%', unit: '', icon: TrendingUp, color: '#0EA5E9', delta: -2, deltaLabel: 'vs mois dernier' },
]

export default function AdminEngagementPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Administration"
          title={<>Système <span className="text-cinematic-gold">d&apos;Engagement</span></>}
          description="Gamification, badges, leaderboard et métriques d'engagement."
        />

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          {KPI.map((k, i) => {
            const positive = k.delta >= 0
            return (
              <motion.div
                key={k.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="card-royal"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${k.color}18`, border: `1px solid ${k.color}30` }}
                  >
                    <k.icon className="w-4 h-4" style={{ color: k.color }} />
                  </div>
                  <div
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-inter font-semibold"
                    style={{
                      background: positive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: positive ? '#22C55E' : '#EF4444',
                    }}
                  >
                    {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {positive ? '+' : ''}{k.delta}%
                  </div>
                </div>
                <div className="font-cinzel text-2xl md:text-3xl font-black" style={{ color: k.color }}>
                  {k.value}
                  <span className="text-sm text-pearl/30">{k.unit}</span>
                </div>
                <div className="text-[11px] uppercase tracking-wider text-pearl/40 font-inter mt-1">{k.title}</div>
                <div className="text-[10px] text-pearl/30 font-inter mt-0.5">{k.deltaLabel}</div>
              </motion.div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-royal lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-cinzel text-sm font-bold text-pearl flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gold" />
                Classement Top Membres
              </h2>
              <span className="text-xs text-pearl/30 font-inter">Ce mois · Mai 2026</span>
            </div>
            <div className="space-y-2">
              {LEADERBOARD.map((m, i) => (
                <motion.div
                  key={m.rang}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors duration-200 hover:bg-pearl/[0.02]"
                >
                  {/* Rang */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-cinzel font-black flex-shrink-0"
                    style={{
                      background: i < 3 ? `${m.couleur}20` : 'rgba(255,255,255,0.04)',
                      color: i < 3 ? m.couleur : 'rgba(255,255,255,0.3)',
                      border: `1px solid ${i < 3 ? `${m.couleur}30` : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    {m.rang}
                  </div>
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-abyss font-cinzel flex-shrink-0"
                    style={{ background: m.couleur }}
                  >
                    {m.nom[0]}{m.nom.split(' ')[1]?.[0]}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-pearl font-inter">{m.nom}</span>
                      <span className="text-sm">{m.pays}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-pearl/30 font-inter mt-0.5">
                      <span>{m.badges} badges</span>
                      <span>{m.formations} formations</span>
                      <span>{m.prières} prières</span>
                    </div>
                  </div>
                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className="font-cinzel text-lg font-black" style={{ color: i < 3 ? m.couleur : '#D4AF37' }}>
                      {m.score}
                    </div>
                    <div className="text-[9px] text-pearl/25 font-inter">points</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Radar engagement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card-royal"
          >
            <h2 className="font-cinzel text-sm font-bold text-pearl mb-6 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-gold" />
              Profil d'Engagement Communauté
            </h2>
            <div className="flex justify-center w-full h-[260px]">
              <CommunityRadar data={RADAR_DATA} />
            </div>
          </motion.div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Actions chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-royal"
          >
            <h2 className="font-cinzel text-sm font-bold text-pearl mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold" />
              Actions par Type ce Mois
            </h2>
            <div className="h-[200px]">
              <ActionsBar data={ENGAGEMENT_BY_ACTION} />
            </div>
          </motion.div>

          {/* Badges distributed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="card-royal"
          >
            <h2 className="font-cinzel text-sm font-bold text-pearl mb-6 flex items-center gap-2">
              <Award className="w-4 h-4 text-gold" />
              Badges Distribués
            </h2>
            <div className="space-y-3">
              {BADGE_STATS.map((b, i) => {
                const max = BADGE_STATS[0].count
                return (
                  <div key={b.nom} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${b.color}18`, border: `1px solid ${b.color}30` }}
                    >
                      <b.icon className="w-4 h-4" style={{ color: b.color }} fill={b.rare ? b.color : 'transparent'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-inter text-xs text-pearl/70 truncate">{b.nom}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {b.rare && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider"
                              style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}>RARE</span>
                          )}
                          <span className="font-cinzel text-xs font-bold text-gold tabular-nums">{b.count.toLocaleString('fr')}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(b.count / max) * 100}%` }}
                          transition={{ duration: 1, delay: 0.4 + i * 0.08 }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${b.color}80, ${b.color})` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
