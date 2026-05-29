'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Play, ChevronLeft, ChevronRight, Check, Sparkles, MapPin, User, Heart,
  Compass, Award, Crown, Gift,
} from 'lucide-react'
import { PremiumImage } from '@/components/ui/PremiumImage'
import { HERO_IMAGES } from '@/lib/images'

const TOTAL_STEPS = 5

const ANCIENNETE = [
  { value: 'nouveau', label: 'Nouveau croyant', emoji: '🌱', desc: 'Je viens de commencer' },
  { value: '1-5', label: '1 à 5 ans', emoji: '🌿', desc: 'En croissance' },
  { value: '5-10', label: '5 à 10 ans', emoji: '🌳', desc: 'Établi dans la foi' },
  { value: '10+', label: '10 ans et +', emoji: '⛪', desc: 'Mature spirituellement' },
]

const MOTIVATIONS = [
  { value: 'former', label: 'Se former', emoji: '📖', desc: 'Connaissances spirituelles' },
  { value: 'prier', label: 'Prier', emoji: '🙏', desc: 'Vie de prière profonde' },
  { value: 'engager', label: "S'engager", emoji: '🔥', desc: 'Servir la communauté' },
  { value: 'grandir', label: 'Grandir', emoji: '💎', desc: 'Développement spirituel' },
]

const REGIONS = [
  { value: 'afrique', label: 'Afrique', emoji: '🌍', desc: 'RDC, Côte d\'Ivoire, Cameroun…' },
  { value: 'europe', label: 'Europe', emoji: '🇪🇺', desc: 'France, Belgique, Suisse…' },
  { value: 'amerique', label: 'Amériques', emoji: '🌎', desc: 'Canada, USA, Brésil…' },
  { value: 'autre', label: 'Autre', emoji: '🌐', desc: 'Asie, Océanie, Moyen-Orient…' },
]

const PLATEFORMES = [
  { emoji: '⛪', name: 'CIER Global', desc: 'La communauté mondiale', color: '#D4AF37' },
  { emoji: '🔥', name: 'Jeunesse', desc: 'La génération qui change le monde', color: '#EF4444' },
  { emoji: '👑', name: "Femmes d'Exceptions", desc: 'Femmes de valeur et de foi', color: '#EC4899' },
  { emoji: '👨‍👩‍👧', name: 'Chapelle Familiale', desc: 'Familles chrétiennes épanouies', color: '#F97316' },
  { emoji: '🙏', name: 'Intercession', desc: 'Guerriers de la prière 24/7', color: '#8B5CF6' },
  { emoji: '📖', name: 'Académie CFIC', desc: 'Formation biblique avancée', color: '#0EA5E9' },
  { emoji: '🏠', name: 'Cité du Refuge', desc: 'Restauration et accompagnement', color: '#22C55E' },
  { emoji: '💚', name: 'Cellules', desc: 'Groupes de croissance', color: '#10B981' },
]

const STEP_LABELS = ['Bienvenue', 'Identité', 'Profil', 'Plateforme', 'Prêt']

export default function BienventuePage() {
  const [step, setStep] = useState(1)
  const [prenom, setPrenom] = useState('')
  const [region, setRegion] = useState('')
  const [anciennete, setAnciennete] = useState('')
  const [motivation, setMotivation] = useState('')
  const [plateforme, setPlateforme] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)

  const next = () => { if (step < TOTAL_STEPS) setStep((s) => s + 1) }
  const prev = () => { if (step > 1) setStep((s) => s - 1) }

  const canNext =
    step === 1 ? true :
    step === 2 ? (prenom.trim().length > 0 && region !== '') :
    step === 3 ? (anciennete !== '' && motivation !== '') :
    step === 4 ? plateforme !== '' :
    true

  const selectedPlateforme = PLATEFORMES.find((p) => p.name === plateforme)

  // Trigger confetti on final step
  useEffect(() => {
    if (step === TOTAL_STEPS) {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(t)
    }
  }, [step])

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-2xl mx-auto px-4">
        {/* Stepper */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1
            const completed = num < step
            const current = num === step
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-cinzel font-bold text-[11px] transition-all duration-500"
                  style={{
                    background: completed
                      ? 'linear-gradient(135deg, #F5E6A7, #D4AF37)'
                      : current
                        ? 'rgba(212,175,55,0.18)'
                        : 'rgba(255,255,255,0.05)',
                    color: completed
                      ? '#1A0F00'
                      : current
                        ? '#F5E6A7'
                        : 'rgba(245,230,216,0.3)',
                    border: current
                      ? '2px solid rgba(212,175,55,0.6)'
                      : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: completed
                      ? '0 4px 12px rgba(212,175,55,0.4)'
                      : current
                        ? '0 0 16px rgba(212,175,55,0.4)'
                        : 'none',
                  }}
                >
                  {completed ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : num}
                </div>
                <span className="font-inter text-[9px] uppercase tracking-widest hidden sm:block"
                  style={{
                    color: current ? '#D4AF37' : completed ? 'rgba(245,230,216,0.6)' : 'rgba(245,230,216,0.25)',
                  }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full overflow-hidden mb-8 mt-3"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #D4AF37, #F5E6A7)',
              boxShadow: '0 0 12px rgba(212,175,55,0.5)',
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl p-7 md:p-9 relative overflow-hidden"
            style={{
              background: `
                radial-gradient(circle at 100% 0%, rgba(212,175,55,0.10) 0%, transparent 60%),
                linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))
              `,
              border: '1px solid rgba(212,175,55,0.18)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(212,175,55,0.06)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* STEP 1 — Welcome */}
            {step === 1 && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 backdrop-blur-md"
                  style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <Sparkles className="w-3 h-3" style={{ color: '#F5E6A7' }} />
                  <span className="font-inter text-xs font-bold tracking-widest uppercase"
                    style={{ color: '#F5E6A7' }}>
                    Message du Pasteur
                  </span>
                </div>

                <h1 className="font-cinzel font-black mb-3 text-cinematic-gold drop-shadow-[0_4px_24px_rgba(212,175,55,0.3)]"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', lineHeight: 1.1 }}>
                  Bienvenue dans la Chapelle !
                </h1>
                <p className="font-inter text-sm md:text-base mb-8 leading-relaxed max-w-md mx-auto"
                  style={{ color: 'rgba(245,230,216,0.65)' }}>
                  Regardez ce court message de bienvenue avant de commencer
                  votre parcours spirituel.
                </p>

                <div className="relative rounded-2xl overflow-hidden h-56 md:h-60 mb-8 flex items-center justify-center cursor-pointer group"
                  style={{
                    border: '1px solid rgba(212,175,55,0.2)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                  }}>
                  {/* Real welcome artwork — open royal doors */}
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                    <PremiumImage
                      image={HERO_IMAGES.welcome}
                      fill
                      overlay="cinematic"
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                    className="relative w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      background: 'rgba(212,175,55,0.18)',
                      border: '2px solid rgba(212,175,55,0.5)',
                      backdropFilter: 'blur(16px)',
                      boxShadow: '0 0 40px rgba(212,175,55,0.4)',
                    }}>
                    <Play className="w-7 h-7 ml-1" style={{ color: '#FFFFFF' }} fill="#FFFFFF" />
                  </motion.div>
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                    <p className="font-inter text-xs font-semibold"
                      style={{ color: 'rgba(245,230,216,0.7)' }}>
                      Message de bienvenue · 3 min
                    </p>
                    <span className="chip-gold backdrop-blur-md">HD</span>
                  </div>
                </div>

                <p className="font-cormorant italic text-base md:text-lg mb-2 leading-relaxed"
                  style={{ color: 'rgba(245,230,216,0.75)' }}>
                  « Nous sommes heureux de vous accueillir dans cette famille spirituelle mondiale. »
                </p>
                <p className="font-inter text-xs font-bold tracking-widest uppercase"
                  style={{ color: '#D4AF37' }}>
                  — Pasteur Principal
                </p>
              </div>
            )}

            {/* STEP 2 — Identity */}
            {step === 2 && (
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 backdrop-blur-md"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <User className="w-3 h-3" style={{ color: '#F5E6A7' }} />
                  <span className="font-inter text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: '#F5E6A7' }}>
                    Étape 2 · Identité
                  </span>
                </div>
                <h1 className="font-cinzel font-black mb-2 text-white"
                  style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.1 }}>
                  Comment vous appelez-vous ?
                </h1>
                <p className="font-inter text-sm mb-6"
                  style={{ color: 'rgba(245,230,216,0.55)' }}>
                  Pour personnaliser votre expérience dans la communauté.
                </p>

                <div className="mb-6">
                  <label className="font-cinzel text-[11px] font-bold tracking-widest uppercase mb-3 block"
                    style={{ color: 'rgba(212,175,55,0.7)' }}>
                    Votre prénom
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Jean, Marie, David…"
                    autoFocus
                    className="input-cinematic text-base"
                  />
                </div>

                <div>
                  <label className="font-cinzel text-[11px] font-bold tracking-widest uppercase mb-3 block flex items-center gap-1.5"
                    style={{ color: 'rgba(212,175,55,0.7)' }}>
                    <MapPin className="w-3 h-3" />
                    Votre région du monde
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {REGIONS.map((r) => {
                      const selected = region === r.value
                      return (
                        <button
                          key={r.value}
                          onClick={() => setRegion(r.value)}
                          className="flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-300"
                          style={{
                            background: selected ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${selected ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: selected ? '0 8px 24px rgba(212,175,55,0.15)' : 'none',
                          }}
                        >
                          <span className="text-2xl">{r.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-inter text-sm font-bold"
                              style={{ color: selected ? '#F5E6A7' : '#FFFFFF' }}>
                              {r.label}
                            </p>
                            <p className="font-inter text-[10px] truncate"
                              style={{ color: 'rgba(245,230,216,0.4)' }}>{r.desc}</p>
                          </div>
                          {selected && <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#D4AF37' }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 — Spiritual profile */}
            {step === 3 && (
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 backdrop-blur-md"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <Compass className="w-3 h-3" style={{ color: '#F5E6A7' }} />
                  <span className="font-inter text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: '#F5E6A7' }}>
                    Étape 3 · Profil spirituel
                  </span>
                </div>
                <h1 className="font-cinzel font-black mb-2 text-white"
                  style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.1 }}>
                  Votre profil spirituel
                </h1>
                <p className="font-inter text-sm mb-6"
                  style={{ color: 'rgba(245,230,216,0.55)' }}>
                  Pour vous recommander les bons enseignements et la bonne communauté.
                </p>

                <div className="mb-6">
                  <p className="font-cinzel text-[11px] font-bold tracking-widest uppercase mb-3"
                    style={{ color: 'rgba(212,175,55,0.7)' }}>
                    Depuis combien de temps êtes-vous chrétien(ne) ?
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {ANCIENNETE.map((a) => {
                      const selected = anciennete === a.value
                      return (
                        <button
                          key={a.value}
                          onClick={() => setAnciennete(a.value)}
                          className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-300"
                          style={{
                            background: selected ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${selected ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: selected ? '0 4px 16px rgba(212,175,55,0.12)' : 'none',
                          }}
                        >
                          <span className="text-xl">{a.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-inter text-sm font-bold"
                              style={{ color: selected ? '#F5E6A7' : '#FFFFFF' }}>
                              {a.label}
                            </p>
                            <p className="font-inter text-[10px] truncate"
                              style={{ color: 'rgba(245,230,216,0.4)' }}>{a.desc}</p>
                          </div>
                          {selected && <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#D4AF37' }} />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="font-cinzel text-[11px] font-bold tracking-widest uppercase mb-3"
                    style={{ color: 'rgba(212,175,55,0.7)' }}>
                    Votre principale motivation
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {MOTIVATIONS.map((m) => {
                      const selected = motivation === m.value
                      return (
                        <button
                          key={m.value}
                          onClick={() => setMotivation(m.value)}
                          className="p-4 rounded-xl text-left transition-all duration-300 group"
                          style={{
                            background: selected ? 'rgba(212,175,55,0.14)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${selected ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: selected ? '0 4px 16px rgba(212,175,55,0.12)' : 'none',
                          }}
                        >
                          <div className="text-2xl mb-2 transition-transform group-hover:scale-110">{m.emoji}</div>
                          <p className="font-inter text-sm font-bold mb-0.5"
                            style={{ color: selected ? '#F5E6A7' : '#FFFFFF' }}>
                            {m.label}
                          </p>
                          <p className="font-inter text-[10px]"
                            style={{ color: 'rgba(245,230,216,0.4)' }}>{m.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 — Platform */}
            {step === 4 && (
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 backdrop-blur-md"
                  style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}>
                  <Heart className="w-3 h-3" style={{ color: '#F5E6A7' }} />
                  <span className="font-inter text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: '#F5E6A7' }}>
                    Étape 4 · Votre famille
                  </span>
                </div>
                <h1 className="font-cinzel font-black mb-2 text-white"
                  style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.1 }}>
                  Choisissez votre plateforme
                </h1>
                <p className="font-inter text-sm mb-6"
                  style={{ color: 'rgba(245,230,216,0.55)' }}>
                  Rejoignez la communauté qui correspond à votre appel actuel.
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {PLATEFORMES.map((p) => {
                    const selected = plateforme === p.name
                    return (
                      <button
                        key={p.name}
                        onClick={() => setPlateforme(p.name)}
                        className="p-4 rounded-xl text-left transition-all duration-300 group"
                        style={{
                          background: selected ? `${p.color}15` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${selected ? `${p.color}50` : 'rgba(255,255,255,0.08)'}`,
                          boxShadow: selected ? `0 8px 24px ${p.color}25` : 'none',
                        }}
                      >
                        <div className="text-2xl mb-2 transition-transform group-hover:scale-110">{p.emoji}</div>
                        <p className="font-inter text-sm font-bold mb-0.5"
                          style={{ color: selected ? p.color : '#FFFFFF' }}>
                          {p.name}
                        </p>
                        <p className="font-inter text-[10px] leading-tight"
                          style={{ color: 'rgba(245,230,216,0.4)' }}>
                          {p.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* STEP 5 — Ready! */}
            {step === 5 && (
              <div className="text-center">
                {/* Confetti / particles */}
                {showConfetti && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(24)].map((_, i) => (
                      <motion.span
                        key={i}
                        className="absolute text-2xl"
                        initial={{ opacity: 0, y: 0, x: '50%', scale: 0 }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0, 1, 0.8],
                          x: `${50 + (Math.random() - 0.5) * 80}%`,
                          y: `${100 + Math.random() * 100}%`,
                          rotate: Math.random() * 360,
                        }}
                        transition={{
                          duration: 2 + Math.random() * 1.5,
                          delay: Math.random() * 0.3,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      >
                        {['✨', '⭐', '🌟', '💫', '🙏'][i % 5]}
                      </motion.span>
                    ))}
                  </div>
                )}

                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="relative inline-flex items-center justify-center mb-5"
                >
                  <motion.div
                    className="absolute inset-0 rounded-full blur-2xl"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ background: 'radial-gradient(circle, #D4AF37, transparent 65%)' }}
                  />
                  <div
                    className="relative w-24 h-24 rounded-full flex items-center justify-center text-5xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(75,0,130,0.2))',
                      border: '2px solid rgba(212,175,55,0.5)',
                      boxShadow: '0 0 40px rgba(212,175,55,0.5), inset 0 0 20px rgba(212,175,55,0.2)',
                    }}
                  >
                    <Crown className="w-12 h-12" style={{ color: '#F5E6A7' }} />
                  </div>
                </motion.div>

                <h1 className="font-cinzel font-black mb-3 text-cinematic-gold drop-shadow-[0_4px_24px_rgba(212,175,55,0.4)]"
                  style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', lineHeight: 1.1 }}>
                  {prenom ? `Bienvenue ${prenom} !` : 'Vous êtes prêt(e) !'}
                </h1>
                <p className="font-inter text-sm md:text-base mb-8 leading-relaxed max-w-md mx-auto"
                  style={{ color: 'rgba(245,230,216,0.7)' }}>
                  Votre profil spirituel est configuré. Bienvenue dans la famille CIER —
                  que Dieu bénisse votre parcours.
                </p>

                {/* Summary */}
                <div className="rounded-2xl p-5 text-left mb-6 space-y-3"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(212,175,55,0.18)',
                  }}>
                  {prenom && (
                    <div className="flex items-center justify-between">
                      <span className="font-inter text-xs uppercase tracking-widest"
                        style={{ color: 'rgba(245,230,216,0.45)' }}>Prénom</span>
                      <span className="font-inter text-sm font-bold text-white">{prenom}</span>
                    </div>
                  )}
                  {region && (
                    <div className="flex items-center justify-between">
                      <span className="font-inter text-xs uppercase tracking-widest"
                        style={{ color: 'rgba(245,230,216,0.45)' }}>Région</span>
                      <span className="font-inter text-sm font-bold text-white">
                        {REGIONS.find((r) => r.value === region)?.emoji} {REGIONS.find((r) => r.value === region)?.label}
                      </span>
                    </div>
                  )}
                  {anciennete && (
                    <div className="flex items-center justify-between">
                      <span className="font-inter text-xs uppercase tracking-widest"
                        style={{ color: 'rgba(245,230,216,0.45)' }}>Ancienneté</span>
                      <span className="font-inter text-sm font-bold text-white">
                        {ANCIENNETE.find((a) => a.value === anciennete)?.label}
                      </span>
                    </div>
                  )}
                  {motivation && (
                    <div className="flex items-center justify-between">
                      <span className="font-inter text-xs uppercase tracking-widest"
                        style={{ color: 'rgba(245,230,216,0.45)' }}>Motivation</span>
                      <span className="font-inter text-sm font-bold text-white">
                        {MOTIVATIONS.find((m) => m.value === motivation)?.label}
                      </span>
                    </div>
                  )}
                  {plateforme && selectedPlateforme && (
                    <div className="flex items-center justify-between">
                      <span className="font-inter text-xs uppercase tracking-widest"
                        style={{ color: 'rgba(245,230,216,0.45)' }}>Plateforme</span>
                      <span className="font-inter text-sm font-bold"
                        style={{ color: selectedPlateforme.color }}>
                        {selectedPlateforme.emoji} {plateforme}
                      </span>
                    </div>
                  )}
                </div>

                {/* Welcome gifts */}
                <div className="rounded-2xl p-4 mb-5 text-left"
                  style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-4 h-4" style={{ color: '#D4AF37' }} />
                    <span className="font-cinzel text-xs font-bold tracking-widest uppercase"
                      style={{ color: '#F5E6A7' }}>
                      Vos cadeaux de bienvenue
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: '🎓', label: 'Accès à 5 formations gratuites' },
                      { icon: '🏆', label: 'Badge "Premier Pas" débloqué' },
                      { icon: '💛', label: '50 XP de bienvenue' },
                    ].map((g) => (
                      <div key={g.label} className="flex items-center gap-2.5">
                        <span className="text-base">{g.icon}</span>
                        <span className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.85)' }}>
                          {g.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended */}
                <div className="rounded-2xl p-4 mb-6 text-left"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)' }}>
                  <div className="text-[10px] font-inter font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"
                    style={{ color: '#C4B5FD' }}>
                    <Award className="w-3 h-3" />
                    Recommandé pour vous
                  </div>
                  <div className="font-inter text-sm font-bold text-white mb-0.5">
                    {motivation === 'prier' ? '🙏 École de Prière — Module 1' :
                     motivation === 'former' ? '📖 Fondements de la Foi' :
                     motivation === 'engager' ? '🔥 Leadership Serviteur — Session 1' :
                     '💎 Identité en Christ — Séance d\'introduction'}
                  </div>
                  <div className="text-[11px] font-inter"
                    style={{ color: 'rgba(245,230,216,0.5)' }}>
                    Disponible dans votre espace membre · 30 min
                  </div>
                </div>

                <Link
                  href="/member/dashboard"
                  className="btn-gold-cinematic w-full justify-center"
                  style={{ padding: '18px 40px' }}
                >
                  Accéder à mon espace membre
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < TOTAL_STEPS && (
          <div className="flex items-center justify-between mt-6 gap-3">
            <button
              onClick={prev}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-inter font-medium text-sm transition-all duration-300"
              style={{
                visibility: step === 1 ? 'hidden' : 'visible',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(245,230,216,0.65)',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>
            <button
              onClick={next}
              disabled={!canNext}
              className="btn-gold-cinematic disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              style={!canNext ? {
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(245,230,216,0.3)',
                boxShadow: 'none',
              } : undefined}
            >
              {step === TOTAL_STEPS - 1 ? 'Terminer' : 'Suivant'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
