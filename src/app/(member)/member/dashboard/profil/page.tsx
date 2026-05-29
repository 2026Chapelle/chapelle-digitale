'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Save, Lock, Check, Church, Flame, Crown, Users, Heart, BookOpen, Home, HandHeart,
  type LucideIcon,
} from 'lucide-react'
import { PARCOURS_DISCIPLE, BADGES } from '@/lib/constants'
import { useAuth } from '@/components/providers/AuthProvider'

const MOCK_USER = {
  prenom: 'Jean',
  nom: 'Dupont',
  email: 'jean@email.com',
  pays: 'France',
  ville: 'Paris',
  bio: 'Disciple de Christ passionné par la prière et la formation spirituelle.',
  score: 72,
  etape: 3,
  role: 'Disciple',
  since: '15 Jan 2026',
  plateforme: 'CIER Global',
  formations: 4,
  badges: 3,
}

type Plateforme = { name: string; icon: LucideIcon; color: string }
const PLATEFORMES: Plateforme[] = [
  { name: 'CIER Global',         icon: Church,    color: '#D4AF37' },
  { name: 'Jeunesse',            icon: Flame,     color: '#EF4444' },
  { name: 'Femmes Exceptions',   icon: Crown,     color: '#EC4899' },
  { name: 'Chapelle Familiale',  icon: Users,     color: '#F97316' },
  { name: 'Intercession',        icon: Heart,     color: '#8B5CF6' },
  { name: 'Académie CFIC',       icon: BookOpen,  color: '#0EA5E9' },
  { name: 'Cité du Refuge',      icon: Home,      color: '#22C55E' },
  { name: 'Familles',            icon: HandHeart, color: '#F59E0B' },
]

export default function ProfilPage() {
  const { user } = useAuth()
  const [prenom, setPrenom] = useState(MOCK_USER.prenom)
  const [nom, setNom] = useState(MOCK_USER.nom)
  const [pays, setPays] = useState(MOCK_USER.pays)
  const [ville, setVille] = useState(MOCK_USER.ville)
  const [bio, setBio] = useState(MOCK_USER.bio)
  const [selectedPlateforme, setSelectedPlateforme] = useState(MOCK_USER.plateforme)
  const [saved, setSaved] = useState(false)

  const etapeActuelle = PARCOURS_DISCIPLE[MOCK_USER.etape]
  const initials = `${MOCK_USER.prenom[0]}${MOCK_USER.nom[0]}`

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl p-8 mb-8"
          style={{ background: 'linear-gradient(135deg, #0a0018 0%, #1a0033 50%, #0a000f 100%)' }}
        >
          <div className="absolute top-0 right-0 w-[400px] h-[300px] opacity-20 blur-[80px]"
            style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
          <div className="absolute inset-0 border border-gold/15 rounded-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-cinzel font-black shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #4B0082, #D4AF37)',
                  boxShadow: '0 12px 32px rgba(75,0,130,0.35), 0 0 0 1px rgba(212,175,55,0.25) inset',
                }}>
                <span className="text-white tracking-wider">{initials}</span>
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                style={{ boxShadow: '0 0 0 3px #050505, 0 0 12px rgba(34,197,94,0.6)' }}
                title="En ligne"
              >
                <span className="block w-1.5 h-1.5 rounded-full bg-white/80" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="section-label mb-2">Mon Profil</div>
              <h1
                className="font-cinzel font-black text-pearl mb-3 text-balance"
                style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.5rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
              >
                {MOCK_USER.prenom} {MOCK_USER.nom}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="badge-gold">{MOCK_USER.role}</span>
                <span className="text-pearl/45 text-sm font-inter">Membre depuis le {MOCK_USER.since}</span>
                <span className="hidden sm:inline text-pearl/20">·</span>
                <span className="text-pearl/45 text-sm font-inter">{MOCK_USER.pays}</span>
              </div>
            </div>

            {/* Score circle */}
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle
                    cx="48" cy="48" r="40" fill="none"
                    stroke="url(#profGrad)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - MOCK_USER.score / 100)}`}
                  />
                  <defs>
                    <linearGradient id="profGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#4B0082" />
                      <stop offset="100%" stopColor="#D4AF37" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-cinzel font-black text-gold text-xl leading-none">{MOCK_USER.score}</span>
                  <span className="text-pearl/30 text-[10px]">/ 100</span>
                </div>
              </div>
              <p className="text-xs text-pearl/40 mt-1 font-inter">Score Engagement</p>
            </div>
          </div>
        </motion.div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Profile form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Form card */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-6">Informations Personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="section-label block mb-2">Prénom</label>
                  <input
                    className="input-royal w-full"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Votre prénom"
                  />
                </div>
                <div>
                  <label className="section-label block mb-2">Nom</label>
                  <input
                    className="input-royal w-full"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label className="section-label block mb-2">Email</label>
                  <input
                    className="input-royal w-full opacity-50 cursor-not-allowed"
                    value={MOCK_USER.email}
                    readOnly
                  />
                </div>
                <div>
                  <label className="section-label block mb-2">Pays</label>
                  <input
                    className="input-royal w-full"
                    value={pays}
                    onChange={(e) => setPays(e.target.value)}
                    placeholder="Votre pays"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="section-label block mb-2">Ville</label>
                  <input
                    className="input-royal w-full"
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    placeholder="Votre ville"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="section-label block mb-2">Bio / Témoignage</label>
                  <textarea
                    className="input-royal w-full min-h-[100px] resize-none"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Partagez votre témoignage ou une courte biographie..."
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                className="btn-gold mt-6 flex items-center gap-2"
              >
                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Sauvegardé !' : 'Sauvegarder'}
              </button>
            </div>

            {/* Platform selection */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-2">Ma Plateforme</h2>
              <p className="text-pearl/40 text-sm font-inter mb-5">Choisissez votre communauté principale</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PLATEFORMES.map((p) => {
                  const isSelected = selectedPlateforme === p.name
                  return (
                    <button
                      key={p.name}
                      onClick={() => setSelectedPlateforme(p.name)}
                      className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all duration-300 ${
                        isSelected
                          ? 'border-gold bg-gold/10'
                          : 'border-pearl/10 bg-pearl/[0.02] hover:border-pearl/25 hover:bg-pearl/[0.04]'
                      }`}
                      style={
                        isSelected
                          ? { boxShadow: `0 8px 24px ${p.color}25, 0 0 0 1px ${p.color}40 inset` }
                          : undefined
                      }
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300"
                        style={{
                          background: isSelected ? `${p.color}22` : `${p.color}12`,
                          border: `1px solid ${p.color}${isSelected ? '50' : '25'}`,
                        }}
                      >
                        <p.icon className="w-5 h-5" style={{ color: p.color }} />
                      </div>
                      <span className={`text-xs font-inter font-semibold text-center leading-tight ${
                        isSelected ? 'text-pearl' : 'text-pearl/55'
                      }`}>{p.name}</span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gold flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-black" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Change password */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-5 flex items-center gap-2">
                <Lock className="w-4 h-4 text-gold" />
                Changer le mot de passe
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="section-label block mb-2">Mot de passe actuel</label>
                  <input type="password" className="input-royal w-full" placeholder="••••••••" />
                </div>
                <div>
                  <label className="section-label block mb-2">Nouveau mot de passe</label>
                  <input type="password" className="input-royal w-full" placeholder="••••••••" />
                </div>
                <div>
                  <label className="section-label block mb-2">Confirmer</label>
                  <input type="password" className="input-royal w-full" placeholder="••••••••" />
                </div>
              </div>
              <button className="btn-royal mt-4">Mettre à jour</button>
            </div>
          </motion.div>

          {/* Right — Spiritual profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Parcours disciple */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-5">Parcours Disciple</h2>
              <div className="space-y-3">
                {PARCOURS_DISCIPLE.map((p, i) => {
                  const isCurrent = i === MOCK_USER.etape
                  const isCompleted = i < MOCK_USER.etape
                  return (
                  <div key={p.etape} className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: i <= MOCK_USER.etape ? p.couleur : 'rgba(255,255,255,0.05)',
                        color: i <= MOCK_USER.etape ? '#050505' : 'rgba(255,255,255,0.2)',
                        boxShadow: isCurrent ? `0 0 12px ${p.couleur}55` : 'none',
                      }}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : isCurrent ? (
                        <span className="block w-1.5 h-1.5 rounded-full bg-current" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold font-inter ${
                        i === MOCK_USER.etape ? 'text-pearl' : i < MOCK_USER.etape ? 'text-pearl/60' : 'text-pearl/25'
                      }`}>{p.nom}</p>
                      <p className={`text-xs font-inter ${
                        i === MOCK_USER.etape ? 'text-pearl/50' : 'text-pearl/20'
                      }`}>{p.description}</p>
                    </div>
                    {i === MOCK_USER.etape && (
                      <span className="badge-gold text-[9px]">Actuel</span>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-5">Profil Spirituel</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-pearl/5">
                  <span className="text-sm text-pearl/50 font-inter">Formations suivies</span>
                  <span className="font-cinzel font-bold text-gold">{MOCK_USER.formations}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-pearl/5">
                  <span className="text-sm text-pearl/50 font-inter">Badges débloqués</span>
                  <span className="font-cinzel font-bold text-gold">{MOCK_USER.badges} / 10</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-pearl/5">
                  <span className="text-sm text-pearl/50 font-inter">Plateforme</span>
                  <span className="text-sm text-pearl font-semibold">{selectedPlateforme}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-pearl/50 font-inter">Étape actuelle</span>
                  <span className="text-sm font-semibold" style={{ color: etapeActuelle.couleur }}>{etapeActuelle.nom}</span>
                </div>
              </div>
            </div>

            {/* Badges earned */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-4">Mes Badges</h2>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {BADGES.slice(0, 10).map((badge, i) => {
                  const unlocked = i < MOCK_USER.badges
                  return (
                    <div
                      key={badge.id}
                      title={badge.nom}
                      className="aspect-square rounded-xl flex items-center justify-center transition-all"
                      style={{
                        background: unlocked ? `${badge.couleur}20` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${unlocked ? `${badge.couleur}35` : 'rgba(255,255,255,0.05)'}`,
                        opacity: unlocked ? 1 : 0.4,
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
              <p className="text-xs text-pearl/30 font-inter">{MOCK_USER.badges} badges débloqués sur 10</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
