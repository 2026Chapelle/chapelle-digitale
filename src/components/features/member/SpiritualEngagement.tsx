'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Heart, BookOpen, Award, Plus, Check, Sparkles, Sun, Moon,
  TrendingUp, Target, Trophy, Lock,
} from 'lucide-react'

const STREAK_DAYS = [
  { day: 'L', done: true }, { day: 'M', done: true }, { day: 'M', done: true },
  { day: 'J', done: true }, { day: 'V', done: true }, { day: 'S', done: true },
  { day: 'D', done: false, today: true },
]

const DAILY_HABITS = [
  { id: 'priere', label: 'Prière du matin', emoji: '🙏', xp: 10, done: true, color: '#EC4899' },
  { id: 'parole', label: 'Lire la Parole', emoji: '📖', xp: 15, done: true, color: '#0EA5E9' },
  { id: 'gratitude', label: 'Journal de gratitude', emoji: '✨', xp: 10, done: false, color: '#D4AF37' },
  { id: 'meditation', label: 'Méditation 10min', emoji: '🕊️', xp: 20, done: false, color: '#8B5CF6' },
]

const GRATITUDE_PROMPTS = [
  'Pour quoi rends-tu grâce aujourd\'hui ?',
  'Qui aimerais-tu bénir aujourd\'hui ?',
  'Quel verset t\'a parlé cette semaine ?',
  'Quelle prière a été exaucée récemment ?',
]

export function SpiritualEngagement() {
  const [habits, setHabits] = useState(DAILY_HABITS)
  const [gratitude, setGratitude] = useState('')
  const [promptIdx, setPromptIdx] = useState(0)
  const [meditationTime, setMeditationTime] = useState(0)
  const [meditating, setMeditating] = useState(false)

  // Cycle prompts every 6s
  useEffect(() => {
    const t = setInterval(() => setPromptIdx((i) => (i + 1) % GRATITUDE_PROMPTS.length), 6000)
    return () => clearInterval(t)
  }, [])

  // Meditation timer
  useEffect(() => {
    if (!meditating) return
    const t = setInterval(() => setMeditationTime((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [meditating])

  const toggleHabit = (id: string) =>
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h)))

  const completed = habits.filter((h) => h.done).length
  const totalXP = habits.filter((h) => h.done).reduce((sum, h) => sum + h.xp, 0)
  const minutesElapsed = Math.floor(meditationTime / 60)
  const secondsElapsed = meditationTime % 60

  return (
    <div className="space-y-5">
      {/* HEADER CARD — STREAK */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 md:p-7"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, rgba(249,115,22,0.18) 0%, transparent 60%),
            radial-gradient(circle at 100% 100%, rgba(212,175,55,0.15) 0%, transparent 60%),
            linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))
          `,
          border: '1px solid rgba(249,115,22,0.25)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(249,115,22,0.1)',
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
              style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}>
              <Flame className="w-3 h-3" style={{ color: '#F97316' }} />
              <span className="font-inter text-[10px] font-bold tracking-widest uppercase"
                style={{ color: '#FDBA74' }}>
                Engagement Spirituel
              </span>
            </div>
            <h3 className="font-cinzel font-black text-2xl md:text-3xl text-white">
              7 jours de suite
            </h3>
            <p className="font-inter text-sm mt-1"
              style={{ color: 'rgba(245,230,216,0.55)' }}>
              Continue ta marche quotidienne avec Dieu.
            </p>
          </div>

          <div className="text-center flex-shrink-0">
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-5xl drop-shadow-[0_4px_16px_rgba(249,115,22,0.5)]"
            >
              🔥
            </motion.div>
            <div className="font-cinzel font-black text-2xl mt-1"
              style={{
                background: 'linear-gradient(135deg, #FDBA74, #F97316)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
              7
            </div>
          </div>
        </div>

        {/* Days */}
        <div className="flex items-center justify-between gap-2">
          {STREAK_DAYS.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: d.done
                    ? 'linear-gradient(135deg, #F97316, #C2410C)'
                    : d.today
                      ? 'rgba(212,175,55,0.18)'
                      : 'rgba(255,255,255,0.04)',
                  border: d.today
                    ? '2px solid rgba(212,175,55,0.6)'
                    : `1px solid ${d.done ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: d.done
                    ? '0 4px 16px rgba(249,115,22,0.4)'
                    : d.today
                      ? '0 0 16px rgba(212,175,55,0.3)'
                      : 'none',
                }}
              >
                {d.done
                  ? <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  : d.today
                    ? <Sparkles className="w-3.5 h-3.5" style={{ color: '#D4AF37' }} />
                    : <Lock className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
                }
              </div>
              <span className="font-inter text-[10px] font-bold uppercase"
                style={{
                  color: d.today
                    ? '#D4AF37'
                    : d.done
                      ? 'rgba(245,230,216,0.85)'
                      : 'rgba(245,230,216,0.3)',
                }}>
                {d.day}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* DAILY HABITS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-cinzel text-sm font-bold flex items-center gap-2 text-white">
            <Target className="w-4 h-4" style={{ color: '#D4AF37' }} />
            Habitudes du jour
          </h3>
          <div className="flex items-center gap-3">
            <span className="font-inter text-[11px]"
              style={{ color: 'rgba(245,230,216,0.5)' }}>
              {completed}/{habits.length}
            </span>
            <span className="text-[10px] font-inter font-bold px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(212,175,55,0.15)',
                color: '#F5E6A7',
                border: '1px solid rgba(212,175,55,0.3)',
              }}>
              +{totalXP} XP
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {habits.map((h) => (
            <button
              key={h.id}
              onClick={() => toggleHabit(h.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group"
              style={{
                background: h.done ? `${h.color}10` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${h.done ? `${h.color}35` : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              <div className="text-xl w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: h.done ? `${h.color}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${h.done ? `${h.color}40` : 'rgba(255,255,255,0.08)'}`,
                }}>
                {h.emoji}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-inter text-sm font-semibold"
                  style={{
                    color: h.done ? h.color : '#FFFFFF',
                    textDecoration: h.done ? 'line-through' : 'none',
                    textDecorationColor: `${h.color}50`,
                  }}>
                  {h.label}
                </p>
                <p className="font-inter text-[11px]"
                  style={{ color: 'rgba(245,230,216,0.4)' }}>
                  +{h.xp} XP
                </p>
              </div>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  background: h.done ? h.color : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${h.done ? h.color : 'rgba(255,255,255,0.15)'}`,
                }}
              >
                {h.done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* MEDITATION TIMER */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, rgba(139,92,246,0.18) 0%, transparent 70%),
            linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))
          `,
          border: '1px solid rgba(139,92,246,0.25)',
        }}
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <Sun className="w-3 h-3" style={{ color: '#A78BFA' }} />
            <span className="font-inter text-[10px] font-bold tracking-widest uppercase"
              style={{ color: '#C4B5FD' }}>
              Méditation Guidée
            </span>
          </div>

          <motion.div
            animate={meditating ? {
              scale: [1, 1.08, 1],
              boxShadow: [
                '0 0 40px rgba(139,92,246,0.3)',
                '0 0 80px rgba(139,92,246,0.5)',
                '0 0 40px rgba(139,92,246,0.3)',
              ],
            } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-32 h-32 rounded-full mx-auto mb-5 flex items-center justify-center cursor-pointer"
            style={{
              background:
                'radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(75,0,130,0.2) 100%)',
              border: '2px solid rgba(139,92,246,0.4)',
            }}
            onClick={() => {
              if (meditating) setMeditationTime(0)
              setMeditating(!meditating)
            }}
          >
            <div className="text-center">
              <div className="font-cinzel font-black text-3xl text-white tabular-nums">
                {minutesElapsed.toString().padStart(2, '0')}:{secondsElapsed.toString().padStart(2, '0')}
              </div>
              <div className="text-[10px] font-inter uppercase tracking-widest mt-1"
                style={{ color: 'rgba(196,181,253,0.7)' }}>
                {meditating ? 'En cours' : 'Cliquer pour démarrer'}
              </div>
            </div>
          </motion.div>

          <p className="font-cormorant italic text-base"
            style={{ color: 'rgba(245,230,216,0.7)' }}>
            « Demeurez en moi, et je demeurerai en vous. »
          </p>
          <p className="font-inter text-[11px] mt-1"
            style={{ color: 'rgba(245,230,216,0.4)' }}>
            — Jean 15:4
          </p>
        </div>
      </motion.div>

      {/* GRATITUDE JOURNAL */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-6"
        style={{
          background: `
            radial-gradient(circle at 100% 0%, rgba(212,175,55,0.15) 0%, transparent 60%),
            linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))
          `,
          border: '1px solid rgba(212,175,55,0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cinzel text-sm font-bold flex items-center gap-2 text-white">
            <Heart className="w-4 h-4" style={{ color: '#EC4899' }} />
            Journal de Gratitude
          </h3>
          <span className="font-inter text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(236,72,153,0.15)',
              color: '#F9A8D4',
              border: '1px solid rgba(236,72,153,0.3)',
            }}>
            +10 XP
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={promptIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="font-cormorant italic text-base mb-3"
            style={{ color: 'rgba(245,230,167,0.85)' }}
          >
            {GRATITUDE_PROMPTS[promptIdx]}
          </motion.p>
        </AnimatePresence>

        <textarea
          value={gratitude}
          onChange={(e) => setGratitude(e.target.value)}
          placeholder="Aujourd'hui, je rends grâce pour..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl font-inter text-sm transition-all duration-300 outline-none resize-none"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#F5E6D8',
            caretColor: '#D4AF37',
          }}
        />

        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] font-inter"
            style={{ color: 'rgba(245,230,216,0.4)' }}>
            {gratitude.length} caractère{gratitude.length !== 1 ? 's' : ''}
          </span>
          <button
            disabled={!gratitude.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-inter font-semibold text-xs transition-all disabled:opacity-40"
            style={{
              background: gratitude.trim()
                ? 'linear-gradient(135deg, #F5E6A7, #D4AF37)'
                : 'rgba(255,255,255,0.04)',
              color: gratitude.trim() ? '#1A0F00' : 'rgba(245,230,216,0.4)',
              boxShadow: gratitude.trim() ? '0 4px 16px rgba(212,175,55,0.3)' : 'none',
            }}
          >
            <Plus className="w-3 h-3" />
            Enregistrer
          </button>
        </div>
      </motion.div>

      {/* PRAYER CHAIN */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 0% 100%, rgba(14,165,233,0.18) 0%, transparent 60%),
            linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))
          `,
          border: '1px solid rgba(14,165,233,0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cinzel text-sm font-bold flex items-center gap-2 text-white">
            <Moon className="w-4 h-4" style={{ color: '#0EA5E9' }} />
            Chaîne d'Intercession
          </h3>
          <span className="chip-gold">
            <Trophy className="w-2.5 h-2.5" />
            En cours
          </span>
        </div>

        <p className="font-inter text-sm mb-4"
          style={{ color: 'rgba(245,230,216,0.6)' }}>
          Vous êtes sur le créneau <span className="font-bold" style={{ color: '#0EA5E9' }}>22h00 → 22h15</span> ce soir.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Jours', value: 12 },
            { label: 'Heures', value: 4 },
            { label: 'Minutes', value: 32 },
          ].map((s) => (
            <div key={s.label} className="text-center p-3 rounded-xl"
              style={{
                background: 'rgba(14,165,233,0.10)',
                border: '1px solid rgba(14,165,233,0.2)',
              }}>
              <div className="font-cinzel font-black text-xl"
                style={{ color: '#0EA5E9' }}>
                {s.value.toString().padStart(2, '0')}
              </div>
              <div className="text-[10px] font-inter uppercase tracking-widest"
                style={{ color: 'rgba(245,230,216,0.5)' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <button className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-inter font-semibold text-sm transition-all"
          style={{
            background: 'linear-gradient(135deg, #0EA5E9, #0369A1)',
            color: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(14,165,233,0.3)',
          }}>
          <Heart className="w-4 h-4" fill="currentColor" />
          Rejoindre la veillée Mahanaïm
        </button>
      </motion.div>

      {/* WEEKLY GOAL */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cinzel text-sm font-bold flex items-center gap-2 text-white">
            <TrendingUp className="w-4 h-4" style={{ color: '#22C55E' }} />
            Objectif de la semaine
          </h3>
          <span className="font-inter text-[11px]"
            style={{ color: 'rgba(245,230,216,0.45)' }}>
            240 / 350 XP
          </span>
        </div>

        <div className="h-3 rounded-full overflow-hidden mb-4"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '68%' }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full relative"
            style={{
              background: 'linear-gradient(90deg, #22C55E, #16A34A, #D4AF37)',
              boxShadow: '0 0 12px rgba(34,197,94,0.4)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </motion.div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Lectures', icon: BookOpen, current: 12, goal: 15, color: '#0EA5E9' },
            { label: 'Prières', icon: Heart, current: 8, goal: 10, color: '#EC4899' },
            { label: 'Modules', icon: Award, current: 3, goal: 5, color: '#D4AF37' },
          ].map((g) => (
            <div key={g.label} className="text-center p-3 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
              <g.icon className="w-3.5 h-3.5 mx-auto mb-1.5" style={{ color: g.color }} />
              <div className="font-cinzel font-bold text-sm text-white">
                {g.current}<span className="opacity-40">/{g.goal}</span>
              </div>
              <div className="text-[10px] font-inter uppercase tracking-wider"
                style={{ color: 'rgba(245,230,216,0.4)' }}>
                {g.label}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
