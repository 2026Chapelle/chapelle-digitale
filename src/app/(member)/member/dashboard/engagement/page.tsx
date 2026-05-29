'use client'
import { motion } from 'framer-motion'
import {
  Lock, Plus, ChevronRight, Trophy, BookOpen, Heart, Church, UserPlus, PenLine, Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { PARCOURS_DISCIPLE, BADGES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'

const MOCK_SCORE = 72
const MOCK_ETAPE = 3

type ActionItem = { label: string; points: string; icon: LucideIcon; color: string }
const ACTIONS: ActionItem[] = [
  { label: 'Compléter une formation', points: '+20 pts', icon: BookOpen, color: '#8B5CF6' },
  { label: 'Soumettre une prière',    points: '+5 pts',  icon: Heart,    color: '#EC4899' },
  { label: 'Assister à un culte',     points: '+10 pts', icon: Church,   color: '#D4AF37' },
  { label: 'Inviter un membre',       points: '+15 pts', icon: UserPlus, color: '#22C55E' },
  { label: 'Compléter son profil',    points: '+10 pts', icon: PenLine,  color: '#0EA5E9' },
]

const UNLOCKED_COUNT = 3

export default function EngagementPage() {
  const currentEtape = PARCOURS_DISCIPLE[MOCK_ETAPE]
  const nextEtape = PARCOURS_DISCIPLE[MOCK_ETAPE + 1]
  const levelProgress = (MOCK_SCORE % 20) / 20 * 100

  const circumference = 2 * Math.PI * 58

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        <PageHeader
          eyebrow="Espace Membre"
          title={<>Engagement &amp; <span className="text-cinematic-gold">Parcours</span></>}
          description="Score, badges et progression dans votre parcours de discipolat."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Score circle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-royal text-center py-8"
            >
              <div className="relative w-40 h-40 mx-auto mb-6">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="58" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />
                  <circle
                    cx="70" cy="70" r="58" fill="none"
                    stroke="url(#engageGrad)" strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - MOCK_SCORE / 100)}
                    style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                  />
                  <defs>
                    <linearGradient id="engageGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#4B0082" />
                      <stop offset="100%" stopColor="#D4AF37" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-cinzel font-black text-gold text-4xl leading-none">{MOCK_SCORE}</span>
                  <span className="text-pearl/30 text-xs font-inter mt-1">sur 100</span>
                </div>
              </div>
              <h2 className="font-cinzel text-xl font-bold text-pearl mb-1">Score d'Engagement</h2>
              <p className="text-pearl/40 text-sm font-inter">Continuez à progresser pour atteindre le niveau suivant</p>

              {/* Level bar */}
              <div className="mt-6 max-w-xs mx-auto">
                <div className="flex justify-between text-xs text-pearl/40 mb-2 font-inter">
                  <span style={{ color: currentEtape.couleur }}>{currentEtape.nom}</span>
                  {nextEtape && <span className="text-pearl/25">{nextEtape.nom}</span>}
                </div>
                <div className="progress-royal">
                  <div className="progress-fill" style={{ width: `${levelProgress}%` }} />
                </div>
                <p className="text-xs text-pearl/30 font-inter mt-2">
                  {Math.round((1 - levelProgress / 100) * 20)} points pour le prochain niveau
                </p>
              </div>
            </motion.div>

            {/* Parcours stepper */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-royal"
            >
              <h2 className="font-cinzel text-base font-bold text-pearl mb-6">Parcours Disciple</h2>
              <div className="flex items-start gap-0 overflow-x-auto pb-2">
                {PARCOURS_DISCIPLE.map((p, i) => (
                  <div key={p.etape} className="flex flex-col items-center flex-1 min-w-[80px] relative">
                    {/* Connector line */}
                    {i < PARCOURS_DISCIPLE.length - 1 && (
                      <div
                        className="absolute top-5 left-1/2 w-full h-0.5"
                        style={{
                          background: i < MOCK_ETAPE ? currentEtape.couleur : 'rgba(255,255,255,0.05)',
                          zIndex: 0,
                        }}
                      />
                    )}
                    {/* Step circle */}
                    <div
                      className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2 transition-all"
                      style={{
                        background: i <= MOCK_ETAPE ? p.couleur : 'rgba(255,255,255,0.05)',
                        color: i <= MOCK_ETAPE ? '#050505' : 'rgba(255,255,255,0.2)',
                        boxShadow: i === MOCK_ETAPE ? `0 0 20px ${p.couleur}60` : 'none',
                        transform: i === MOCK_ETAPE ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {i < MOCK_ETAPE ? '✓' : i + 1}
                    </div>
                    <p className={`text-[10px] text-center font-inter leading-tight ${
                      i === MOCK_ETAPE ? 'text-pearl font-semibold' : i < MOCK_ETAPE ? 'text-pearl/40' : 'text-pearl/20'
                    }`}>{p.nom}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-royal"
            >
              <h2 className="font-cinzel text-base font-bold text-pearl mb-5">Comment augmenter mon score</h2>
              <div className="space-y-3">
                {ACTIONS.map((action, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-pearl/[0.02] hover:bg-pearl/[0.04] transition-colors group cursor-pointer">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${action.color}15`, border: `1px solid ${action.color}28` }}>
                      <action.icon className="w-[18px] h-[18px]" style={{ color: action.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-pearl font-inter">{action.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-cinzel" style={{ color: action.color }}>{action.points}</span>
                      <ChevronRight className="w-4 h-4 text-pearl/20 group-hover:text-pearl/50 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right — badges */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card-royal"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-cinzel text-base font-bold text-pearl flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold" />
                  Mes Badges
                </h2>
                <span className="text-xs text-pearl/30 font-inter">{UNLOCKED_COUNT}/10 débloqués</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {BADGES.slice(0, 10).map((badge, i) => {
                  const unlocked = i < UNLOCKED_COUNT
                  return (
                    <div
                      key={badge.id}
                      className={`relative p-3 rounded-2xl border transition-all ${
                        unlocked
                          ? 'border-transparent'
                          : 'border-pearl/5 opacity-40'
                      }`}
                      style={unlocked ? { background: `${badge.couleur}15`, borderColor: `${badge.couleur}30` } : { background: 'rgba(255,255,255,0.02)' }}
                    >
                      {!unlocked && (
                        <div className="absolute top-2 right-2">
                          <Lock className="w-3 h-3 text-pearl/20" />
                        </div>
                      )}
                      <div
                        className="w-9 h-9 rounded-xl mb-2 flex items-center justify-center"
                        style={{
                          background: unlocked ? `${badge.couleur}22` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${unlocked ? `${badge.couleur}40` : 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <badge.icone
                          className="w-4 h-4"
                          style={{ color: unlocked ? badge.couleur : 'rgba(255,255,255,0.25)' }}
                          fill={unlocked && badge.rare ? badge.couleur : 'transparent'}
                        />
                      </div>
                      <p className={`text-[11px] font-semibold font-inter leading-tight ${
                        unlocked ? 'text-pearl' : 'text-pearl/30'
                      }`}>{badge.nom}</p>
                      <p className="text-[10px] font-inter mt-0.5" style={{ color: unlocked ? badge.couleur : 'rgba(255,255,255,0.15)' }}>
                        +{badge.points} pts
                      </p>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Quick info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card-royal"
            >
              <h2 className="font-cinzel text-sm font-bold text-pearl mb-4">Étape actuelle</h2>
              <div className="flex items-center gap-3 p-3 rounded-2xl border"
                style={{ borderColor: `${currentEtape.couleur}30`, background: `${currentEtape.couleur}10` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${currentEtape.couleur}20`, border: `1px solid ${currentEtape.couleur}40` }}>
                  <Sparkles className="w-[18px] h-[18px]" style={{ color: currentEtape.couleur }} />
                </div>
                <div>
                  <p className="font-cinzel font-bold text-pearl text-sm" style={{ color: currentEtape.couleur }}>
                    {currentEtape.nom}
                  </p>
                  <p className="text-xs text-pearl/40 font-inter">{currentEtape.description}</p>
                </div>
              </div>
              {nextEtape && (
                <div className="mt-3 p-3 rounded-2xl bg-pearl/[0.02] border border-pearl/5">
                  <p className="text-xs text-pearl/30 font-inter mb-1">Prochain niveau</p>
                  <p className="text-sm font-semibold text-pearl/50 font-inter">{nextEtape.nom}</p>
                  <p className="text-xs text-pearl/25 font-inter">{nextEtape.description}</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
