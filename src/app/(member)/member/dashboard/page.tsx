'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  BookOpen, Heart, Calendar, Bell, ChevronRight,
  Trophy, Clock, Play, TrendingUp, Zap, Radio,
  Star, Shield, Users, ArrowUpRight, Flame, Sparkles, CheckCircle2,
  GraduationCap, Crown, Sprout, Award, Tv, type LucideIcon
} from 'lucide-react'
import { BADGES, PARCOURS_DISCIPLE } from '@/lib/constants'
import { SpiritualEngagement } from '@/components/features/member/SpiritualEngagement'

const DAILY_VERSE = {
  reference: 'Philippiens 4 : 13',
  text: '"Je puis tout par celui qui me fortifie."',
  theme: 'Force & Foi',
}

type QuickWin = { icon: LucideIcon; label: string; sub: string; xp: number; href: string; color: string }
const QUICK_WINS: QuickWin[] = [
  { icon: BookOpen,  label: 'Module suivant',       sub: 'École de Prière — Module 6', xp: 50, href: '/member/dashboard/formations', color: '#8B5CF6' },
  { icon: Heart,     label: 'Prière du jour',       sub: '3 min — thème : Gratitude',  xp: 20, href: '/member/dashboard/prieres',    color: '#EC4899' },
  { icon: Flame,     label: 'Maintenir le streak',  sub: '7 jours de suite',           xp: 15, href: '/member/dashboard/engagement', color: '#F97316' },
]

const MOCK_USER = {
  prenom: 'Jean',
  nom: 'Dupont',
  membre_statut: 'disciple',
  score_engagement: 72,
  parcours_disciple_etape: 3,
  pays: 'France',
}

type FormationItem = { id: string; titre: string; progression: number; modules: number; couleur: string; icon: LucideIcon }
const RECENT_FORMATIONS: FormationItem[] = [
  { id: '1', titre: 'École de Prière',       progression: 65,  modules: 8,  couleur: '#0EA5E9', icon: Heart },
  { id: '2', titre: 'Leader de Demain',      progression: 30,  modules: 12, couleur: '#D4AF37', icon: Crown },
  { id: '3', titre: 'Fondements de la Foi',  progression: 100, modules: 6,  couleur: '#22C55E', icon: Sprout },
]

const UPCOMING_EVENTS = [
  { id: '1', titre: 'Culte Principal', date: '2026-05-11', heure: '10:00', type: 'Culte', color: '#D4AF37' },
  { id: '2', titre: 'Veillée de Prière', date: '2026-05-09', heure: '22:00', type: 'Prière', color: '#8B5CF6' },
  { id: '3', titre: 'Étude Biblique', date: '2026-05-14', heure: '20:00', type: 'Enseignement', color: '#0EA5E9' },
]

const QUICK_STATS = [
  { label: 'Formations', value: '4', suffix: 'en cours', icon: BookOpen, color: '#8B5CF6' },
  { label: 'Prières', value: '23', suffix: 'soumises', icon: Heart, color: '#EC4899' },
  { label: 'Événements', value: '12', suffix: 'assistés', icon: Calendar, color: '#0EA5E9' },
  { label: 'Points', value: '1 240', suffix: 'gagnés', icon: Trophy, color: '#D4AF37' },
]

type ActivityItem = { icon: LucideIcon; text: string; time: string; color: string }
const ACTIVITY_FEED: ActivityItem[] = [
  { icon: GraduationCap, text: 'Module 5 de "École de Prière" complété',     time: 'Il y a 2h', color: '#0EA5E9' },
  { icon: Heart,         text: 'Votre demande de prière a reçu 45 priants',  time: 'Il y a 5h', color: '#EC4899' },
  { icon: Tv,            text: 'Culte du dimanche disponible en replay',     time: 'Il y a 1j', color: '#D4AF37' },
  { icon: Award,         text: 'Badge "Intercesseur" débloqué',              time: 'Il y a 2j', color: '#8B5CF6' },
]

export default function DashboardPage() {
  const etape = PARCOURS_DISCIPLE[MOCK_USER.parcours_disciple_etape]

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10">

        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-10 mb-6"
          style={{
            background: 'linear-gradient(135deg, #0F0820 0%, #1A0535 40%, #0a000f 100%)',
            border: '1px solid rgba(212,175,55,0.12)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 60px rgba(212,175,55,0.04)',
          }}
        >
          {/* Gold halo top right */}
          <div
            className="absolute top-0 right-0 w-[500px] h-[300px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(212,175,55,0.18) 0%, transparent 65%)' }}
          />
          {/* Purple halo bottom left */}
          <div
            className="absolute bottom-0 left-0 w-[300px] h-[200px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 20% 80%, rgba(139,92,246,0.12) 0%, transparent 65%)' }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex-1">
              {/* Status badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="font-inter text-xs font-semibold" style={{ color: '#D4AF37' }}>
                  Membre Disciple · {MOCK_USER.pays}
                </span>
              </div>

              <h1
                className="font-cinzel font-black mb-3 text-balance"
                style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', color: '#FFFFFF', lineHeight: 1.05, letterSpacing: '-0.02em' }}
              >
                Bonjour,{' '}
                <span className="text-cinematic-gold">{MOCK_USER.prenom}</span>
              </h1>
              <p className="font-inter text-sm md:text-[15px] mb-6 leading-relaxed max-w-xl" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Étape actuelle :{' '}
                <span className="font-semibold" style={{ color: etape.couleur }}>{etape.nom}</span>
                {' '}— continuez votre progression spirituelle.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/member/dashboard/lives"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-inter font-semibold text-sm transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00', boxShadow: '0 4px 16px rgba(212,175,55,0.3)' }}
                >
                  <Radio className="w-3.5 h-3.5" />
                  Rejoindre le Live
                </Link>
                <Link
                  href="/member/dashboard/formations"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-inter font-medium text-sm transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Mes Formations
                </Link>
              </div>
            </div>

            {/* Right: Engagement score + parcours */}
            <div className="flex items-center gap-6 sm:gap-8 flex-shrink-0 w-full md:w-auto justify-between md:justify-end">
              {/* Circular score */}
              <div className="text-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle
                      cx="48" cy="48" r="40" fill="none"
                      stroke="url(#scoreGrad)" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - MOCK_USER.score_engagement / 100)}`}
                      style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                    />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4B0082" />
                        <stop offset="100%" stopColor="#D4AF37" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-cinzel font-black text-2xl leading-none" style={{ color: '#D4AF37' }}>
                      {MOCK_USER.score_engagement}
                    </span>
                    <span className="font-inter text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Score</span>
                  </div>
                </div>
                <p className="font-inter text-[11px] mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Engagement</p>
              </div>

              {/* Parcours steps — hidden on mobile to keep welcome banner tight */}
              <div className="hidden md:block">
                <p className="font-inter text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Parcours Disciple</p>
                <div className="flex items-center gap-1.5">
                  {PARCOURS_DISCIPLE.map((p, i) => (
                    <div
                      key={p.etape}
                      title={p.nom}
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-cinzel font-black text-[10px] transition-all"
                      style={{
                        background: i <= MOCK_USER.parcours_disciple_etape
                          ? `${p.couleur}CC`
                          : 'rgba(255,255,255,0.05)',
                        color: i <= MOCK_USER.parcours_disciple_etape ? '#1A0F00' : 'rgba(255,255,255,0.2)',
                        boxShadow: i === MOCK_USER.parcours_disciple_etape
                          ? `0 0 12px ${p.couleur}60`
                          : 'none',
                      }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <p className="font-inter text-[11px] mt-2 font-semibold" style={{ color: etape.couleur }}>
                  {etape.nom}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Daily Verse + Quick Wins */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          {/* Verse of the day */}
          <div
            className="md:col-span-1 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between"
            style={{
              background: 'linear-gradient(135deg, rgba(75,0,130,0.25) 0%, rgba(212,175,55,0.08) 100%)',
              border: '1px solid rgba(212,175,55,0.2)',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(212,175,55,0.15) 0%, transparent 70%)' }} />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
                <span className="font-inter text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(212,175,55,0.7)' }}>
                  Verset du Jour
                </span>
              </div>
              <p className="font-cormorant italic text-base leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {DAILY_VERSE.text}
              </p>
              <p className="font-cinzel text-[11px] font-semibold" style={{ color: '#D4AF37' }}>
                {DAILY_VERSE.reference}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="font-inter text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
                {DAILY_VERSE.theme}
              </span>
              <span className="font-inter text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Méditer aujourd'hui
              </span>
            </div>
          </div>

          {/* Quick wins */}
          <div
            className="md:col-span-2 rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-cinzel text-sm font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                <Flame className="w-4 h-4" style={{ color: '#F97316' }} />
                Actions du Jour
              </h3>
              <span className="font-inter text-[10px] px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
                +85 XP disponibles
              </span>
            </div>
            <div className="space-y-2.5">
              {QUICK_WINS.map((win, i) => (
                <motion.div
                  key={win.label}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                >
                  <Link
                    href={win.href}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${win.color}10`; e.currentTarget.style.borderColor = `${win.color}30` }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${win.color}18`, border: `1px solid ${win.color}28` }}>
                      <win.icon className="w-4 h-4" style={{ color: win.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-sm font-semibold" style={{ color: '#FFFFFF' }}>{win.label}</p>
                      <p className="font-inter text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{win.sub}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-inter text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${win.color}18`, color: win.color }}>
                        +{win.xp} XP
                      </span>
                      <CheckCircle2 className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {QUICK_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.06 }}
              className="rounded-2xl p-5 transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}28` }}
                >
                  <stat.icon className="w-[18px] h-[18px]" style={{ color: stat.color }} />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div className="font-cinzel font-black text-2xl mb-0.5" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="font-inter text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {stat.suffix}
              </div>
              <div className="font-inter text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">

            {/* Formations en cours */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-cinzel text-sm font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                  <BookOpen className="w-4 h-4" style={{ color: '#D4AF37' }} />
                  Formations en Cours
                </h2>
                <Link
                  href="/member/dashboard/formations"
                  className="inline-flex items-center gap-1 font-inter text-xs transition-colors"
                  style={{ color: 'rgba(212,175,55,0.7)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#D4AF37' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(212,175,55,0.7)' }}
                >
                  Voir tout <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {RECENT_FORMATIONS.map((f, i) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.08 }}
                  >
                    <Link
                      href={`/member/dashboard/formations/${f.id}`}
                      className="flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 group"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = `${f.couleur}30` }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)' }}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${f.couleur}18`, border: `1px solid ${f.couleur}28` }}
                      >
                        <f.icon className="w-[18px] h-[18px]" style={{ color: f.couleur }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-inter text-sm font-semibold truncate" style={{ color: '#FFFFFF' }}>
                            {f.titre}
                          </p>
                          <span className="font-inter text-xs ml-3 flex-shrink-0" style={{ color: f.couleur }}>
                            {f.progression}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${f.progression}%` }}
                            transition={{ duration: 1, delay: 0.4 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full rounded-full"
                            style={{ background: f.progression === 100
                              ? `linear-gradient(90deg, ${f.couleur}, ${f.couleur}CC)`
                              : `linear-gradient(90deg, #6B21A8, ${f.couleur})`
                            }}
                          />
                        </div>
                      </div>
                      {f.progression === 100
                        ? <Star className="w-4 h-4 flex-shrink-0" style={{ color: '#D4AF37' }} fill="#D4AF37" />
                        : <ChevronRight className="w-4 h-4 flex-shrink-0 transition-colors" style={{ color: 'rgba(255,255,255,0.2)' }} />
                      }
                    </Link>
                  </motion.div>
                ))}

                <Link
                  href="/member/dashboard/formations"
                  className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-inter text-sm transition-all duration-200"
                  style={{ border: '1px dashed rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.5)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.color = '#D4AF37'; e.currentTarget.style.background = 'rgba(212,175,55,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'; e.currentTarget.style.color = 'rgba(212,175,55,0.5)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <Zap className="w-4 h-4" />
                  Découvrir plus de formations
                </Link>
              </div>
            </motion.div>

            {/* Activity feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <h2 className="font-cinzel text-sm font-bold flex items-center gap-2 mb-5" style={{ color: '#FFFFFF' }}>
                <TrendingUp className="w-4 h-4" style={{ color: '#D4AF37' }} />
                Activité Récente
              </h2>
              <div className="space-y-1">
                {ACTIVITY_FEED.map((activity, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.07 }}
                    className="flex items-start gap-3 p-3 rounded-xl transition-colors duration-200"
                    style={{ cursor: 'default' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${activity.color}15`, border: `1px solid ${activity.color}25` }}
                    >
                      <activity.icon className="w-4 h-4" style={{ color: activity.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                        {activity.text}
                      </p>
                      <p className="font-inter text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {activity.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Quick actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <h2 className="font-cinzel text-sm font-bold mb-4" style={{ color: '#FFFFFF' }}>Actions Rapides</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Play,     label: 'Live',     href: '/member/dashboard/lives',         color: '#EF4444' },
                  { icon: Heart,    label: 'Prières',  href: '/member/dashboard/prieres',       color: '#EC4899' },
                  { icon: BookOpen, label: 'Cours',    href: '/member/dashboard/formations',    color: '#8B5CF6' },
                  { icon: Calendar, label: 'Agenda',   href: '/member/dashboard/evenements',    color: '#22C55E' },
                  { icon: Users,    label: 'Groupes',  href: '/member/dashboard/groupes',       color: '#F97316' },
                  { icon: Bell,     label: 'Alertes',  href: '/member/dashboard/notifications', color: '#0EA5E9' },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 group"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${action.color}12`; e.currentTarget.style.borderColor = `${action.color}30` }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${action.color}20` }}
                    >
                      <action.icon className="w-4 h-4" style={{ color: action.color }} />
                    </div>
                    <span className="font-inter text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {action.label}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Upcoming events */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-cinzel text-sm font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                  <Calendar className="w-4 h-4" style={{ color: '#D4AF37' }} />
                  Prochains
                </h2>
                <Link
                  href="/member/dashboard/evenements"
                  className="font-inter text-xs transition-colors"
                  style={{ color: 'rgba(212,175,55,0.6)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#D4AF37' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(212,175,55,0.6)' }}
                >
                  Tout voir
                </Link>
              </div>
              <div className="space-y-2.5">
                {UPCOMING_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="text-center rounded-xl px-2 py-1.5 flex-shrink-0 min-w-[44px]"
                      style={{ background: `${event.color}15`, border: `1px solid ${event.color}25` }}
                    >
                      <div className="font-inter text-[9px] font-semibold uppercase" style={{ color: event.color }}>
                        {new Date(event.date).toLocaleDateString('fr', { weekday: 'short' })}
                      </div>
                      <div className="font-cinzel text-lg font-black leading-none" style={{ color: '#FFFFFF' }}>
                        {new Date(event.date).getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-inter text-sm font-semibold truncate" style={{ color: '#FFFFFF' }}>
                        {event.titre}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        <Clock className="w-3 h-3" />
                        <span className="font-inter text-[11px]">{event.heure}</span>
                      </div>
                    </div>
                    <span
                      className="font-inter text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${event.color}18`, color: event.color }}
                    >
                      {event.type}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-cinzel text-sm font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                  <Trophy className="w-4 h-4" style={{ color: '#D4AF37' }} />
                  Mes Badges
                </h2>
                <span className="font-inter text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>3 / 10</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {BADGES.slice(0, 10).map((badge, i) => {
                  const unlocked = i < 3
                  return (
                    <div
                      key={badge.id}
                      title={badge.nom}
                      className="aspect-square rounded-xl flex items-center justify-center transition-all duration-200"
                      style={{
                        background: unlocked ? `${badge.couleur}18` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${unlocked ? `${badge.couleur}30` : 'rgba(255,255,255,0.05)'}`,
                        opacity: unlocked ? 1 : 0.4,
                        boxShadow: unlocked ? `0 2px 12px ${badge.couleur}20` : 'none',
                      }}
                    >
                      <badge.icone
                        className="w-4 h-4"
                        style={{ color: unlocked ? badge.couleur : 'rgba(255,255,255,0.25)' }}
                        fill={unlocked && badge.rare ? badge.couleur : 'transparent'}
                      />
                    </div>
                  )
                })}
              </div>
              <p className="font-inter text-[11px] mt-3 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
                7 badges à débloquer
              </p>
            </motion.div>

            {/* Spiritual Engagement System */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 }}
            >
              <SpiritualEngagement />
            </motion.div>

            {/* Spiritual score card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                href="/member/dashboard/profil"
                className="flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 group"
                style={{
                  background: 'linear-gradient(135deg, rgba(75,0,130,0.15) 0%, rgba(212,175,55,0.06) 100%)',
                  border: '1px solid rgba(212,175,55,0.15)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(212,175,55,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: 'rgba(212,175,55,0.1)' }}
                >
                  <Shield className="w-6 h-6" style={{ color: '#D4AF37' }} />
                </div>
                <div className="flex-1">
                  <p className="font-cinzel text-sm font-bold" style={{ color: '#FFFFFF' }}>Mon Profil</p>
                  <p className="font-inter text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Compléter mon profil
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
