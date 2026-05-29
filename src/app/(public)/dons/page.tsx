'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, ArrowRight, Shield, Star, Crown, Check, Sparkles, Download, Share2 } from 'lucide-react'
import Link from 'next/link'

const DON_TYPES = [
  { id: 'don', label: 'Don', emoji: '💛', description: 'Don libre pour l\'église' },
  { id: 'dime', label: 'Dîme', emoji: '⭐', description: 'Premier fruit de vos revenus' },
  { id: 'offrande', label: 'Offrande', emoji: '🌹', description: 'Offrande de gratitude' },
  { id: 'partenariat', label: 'Partenariat', emoji: '👑', description: 'Partenaire du Royaume' },
]

const MONTANTS_RAPIDES = [10, 25, 50, 100, 250, 500]

const FREQUENCES = [
  { id: 'unique', label: 'Don unique' },
  { id: 'mensuel', label: 'Mensuel' },
  { id: 'trimestriel', label: 'Trimestriel' },
  { id: 'annuel', label: 'Annuel' },
]

const CAMPAGNES = [
  {
    id: '1',
    titre: 'Construction Temple 2026',
    description: 'Contribuez à la construction de notre nouveau temple pour accueillir plus de familles.',
    objectif: 100000,
    collecte: 67450,
    image: '🏛️',
    color: '#D4AF37',
  },
  {
    id: '2',
    titre: 'Missions Évangéliques',
    description: 'Financer l\'envoi de missionnaires dans les zones rurales d\'Afrique.',
    objectif: 25000,
    collecte: 18900,
    image: '🌍',
    color: '#22C55E',
  },
  {
    id: '3',
    titre: 'Bourses Étudiants CFIC',
    description: 'Permettre aux jeunes sans ressources d\'accéder à la formation théologique.',
    objectif: 15000,
    collecte: 9200,
    image: '📖',
    color: '#8B5CF6',
  },
]

export default function DonsPage() {
  const [selectedType, setSelectedType] = useState('don')
  const [selectedFrequence, setSelectedFrequence] = useState('unique')
  const [montant, setMontant] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [anonyme, setAnonyme] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!montant || parseFloat(montant) < 1) return
    setStep(2)
  }

  const montantNum = parseFloat(montant) || 0
  const selectedDonType = DON_TYPES.find(t => t.id === selectedType)

  if (step === 2) {
    return (
      <div className="min-h-screen bg-abyss pt-20 flex items-center justify-center px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-[0.12] blur-[160px]"
            style={{ background: 'radial-gradient(ellipse, #22C55E 0%, #D4AF37 60%, transparent 100%)' }} />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-lg w-full"
        >
          {/* Celebration burst */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{ background: i % 2 === 0 ? '#D4AF37' : '#22C55E' }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: Math.cos((i / 8) * Math.PI * 2) * 120,
                  y: Math.sin((i / 8) * Math.PI * 2) * 120,
                  opacity: 0,
                  scale: [0, 1.5, 0],
                }}
                transition={{ duration: 0.9, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
              />
            ))}
          </div>

          <div className="rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(145deg, #030012, #080020)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #22C55E, #D4AF37)' }} />
            <div className="p-10 text-center">
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(212,175,55,0.1))', border: '2px solid rgba(34,197,94,0.4)' }}
              >
                <Check className="w-9 h-9 text-green-400" strokeWidth={2.5} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold font-inter mb-4"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E' }}>
                  <Sparkles className="w-3 h-3" />
                  Merci pour votre générosité
                </div>
                <h1 className="font-cinzel text-2xl font-black text-white mb-2">
                  Don Reçu avec Gratitude
                </h1>
                <p className="font-cormorant italic text-lg mb-8" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                  « Que celui qui sème abondamment moissonne abondamment. »<br />
                  <span className="text-sm not-italic font-inter" style={{ color: 'rgba(212,175,55,0.7)' }}>— 2 Corinthiens 9:6</span>
                </p>

                {/* Receipt summary */}
                <div className="rounded-2xl p-5 mb-8 text-left space-y-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex justify-between items-center">
                    <span className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Type</span>
                    <span className="font-inter text-sm font-semibold text-white">
                      {selectedDonType?.emoji} {selectedDonType?.label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Fréquence</span>
                    <span className="font-inter text-sm font-semibold text-white capitalize">{selectedFrequence}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="font-inter text-sm font-bold text-white">Montant</span>
                    <span className="font-cinzel text-xl font-black" style={{ color: '#D4AF37' }}>{montantNum}€</span>
                  </div>
                  {!anonyme && email && (
                    <div className="flex justify-between items-center">
                      <span className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Reçu envoyé à</span>
                      <span className="font-inter text-sm text-white">{email}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mb-6">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-inter text-xs font-semibold transition-all hover:-translate-y-0.5"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                    <Download className="w-3.5 h-3.5" />
                    Télécharger le reçu
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-inter text-xs font-semibold transition-all hover:-translate-y-0.5"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                    <Share2 className="w-3.5 h-3.5" />
                    Partager la bonne nouvelle
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep(1); setMontant(''); setMessage('') }}
                    className="flex-1 py-3 rounded-xl font-inter font-semibold text-sm transition-all hover:-translate-y-0.5"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                    Faire un autre don
                  </button>
                  <Link href="/member/dashboard"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-inter font-bold text-sm transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
                    Mon espace
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-abyss pt-20">

      {/* Hero */}
      <div className="relative border-b border-pearl/5 pb-16 pt-16">
        <div className="absolute inset-0 bg-mesh" />
        <div className="relative container-royal text-center">
          <div className="section-label justify-center mb-4">Donner & Semer</div>
          <h1 className="font-cinzel text-4xl md:text-5xl font-black text-pearl mb-4">
            Contribuer au
            <span className="text-gradient-gold block">Royaume de Dieu</span>
          </h1>
          <p className="text-pearl/50 font-inter text-lg max-w-2xl mx-auto mb-6">
            « Donnez, et il vous sera donné. » — Luc 6:38
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-pearl/40">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-green-400" /> Paiement 100% sécurisé</span>
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-gold" /> Reçu fiscal disponible</span>
            <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-gold" /> Transparent & responsable</span>
          </div>
        </div>
      </div>

      <div className="container-royal py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Don form — left */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-gold/15 overflow-hidden"
              style={{ background: 'linear-gradient(145deg, #0a0018 0%, #050505 100%)' }}
            >
              <div className="h-1 bg-gradient-gold" />
              <div className="p-8">
                <h2 className="font-cinzel text-xl font-bold text-pearl mb-6">Faire un Don</h2>

                {/* Type de don */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {DON_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        selectedType === type.id
                          ? 'border-gold/40 bg-gold/10 text-gold'
                          : 'border-pearl/10 bg-pearl/3 text-pearl/60 hover:border-pearl/20'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.emoji}</div>
                      <div className="font-cinzel text-xs font-semibold">{type.label}</div>
                    </button>
                  ))}
                </div>

                {/* Fréquence */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {FREQUENCES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFrequence(f.id)}
                      className={`px-4 py-2 rounded-xl border text-xs font-semibold font-inter transition-all ${
                        selectedFrequence === f.id
                          ? 'bg-royal/30 border-royal/50 text-pearl'
                          : 'bg-pearl/3 border-pearl/10 text-pearl/40 hover:border-pearl/20'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Montants rapides */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                  {MONTANTS_RAPIDES.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMontant(String(m))}
                      className={`py-2.5 rounded-xl border text-sm font-semibold font-cinzel transition-all ${
                        montant === String(m)
                          ? 'border-gold/40 bg-gold/10 text-gold'
                          : 'border-pearl/10 bg-pearl/3 text-pearl/50 hover:border-pearl/20 hover:text-pearl'
                      }`}
                    >
                      {m}€
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold font-cinzel font-bold text-lg">€</span>
                  <input
                    type="number"
                    value={montant}
                    onChange={e => setMontant(e.target.value)}
                    placeholder="Autre montant"
                    min="1"
                    className="input-royal pl-10 text-xl font-cinzel font-bold text-gold"
                  />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Votre nom"
                      value={anonyme ? '' : nom}
                      onChange={e => setNom(e.target.value)}
                      disabled={anonyme}
                      className="input-royal disabled:opacity-40"
                    />
                    <input
                      type="email"
                      placeholder="Votre email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="input-royal"
                    />
                  </div>

                  <textarea
                    placeholder="Message de foi (optionnel)"
                    rows={2}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="input-royal resize-none"
                  />

                  <label className="flex items-center gap-2 cursor-pointer text-sm text-pearl/50 font-inter">
                    <input type="checkbox" checked={anonyme} onChange={e => setAnonyme(e.target.checked)} className="rounded" />
                    Don anonyme
                  </label>

                  {montantNum > 0 && (
                    <div className="bg-gold/5 border border-gold/20 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-pearl/50 font-inter">Résumé</p>
                        <p className="font-cinzel font-bold text-pearl">
                          {DON_TYPES.find(t => t.id === selectedType)?.emoji} {DON_TYPES.find(t => t.id === selectedType)?.label}
                          {' — '}{selectedFrequence !== 'unique' ? selectedFrequence : 'unique'}
                        </p>
                      </div>
                      <div className="font-cinzel text-2xl font-black text-gradient-gold">
                        {montantNum}€
                      </div>
                    </div>
                  )}

                  <button type="submit" className="btn-gold w-full justify-center py-4 text-base">
                    <Heart className="w-4 h-4" />
                    Donner {montantNum > 0 ? `${montantNum}€` : 'maintenant'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-pearl/30">
                  <Shield className="w-3.5 h-3.5 text-green-400" />
                  <span>Sécurisé par Stripe • Cryptage SSL 256-bit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Campaigns */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-cinzel text-lg font-bold text-pearl mb-4">Campagnes Actives</h2>
              <div className="space-y-4">
                {CAMPAGNES.map((camp, i) => {
                  const pct = Math.round((camp.collecte / camp.objectif) * 100)
                  return (
                    <motion.div
                      key={camp.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="card-royal"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                          style={{ background: `${camp.color}15` }}>
                          {camp.image}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-cinzel text-sm font-bold text-pearl mb-1">{camp.titre}</h3>
                          <p className="text-xs text-pearl/50 font-inter line-clamp-2">{camp.description}</p>
                        </div>
                      </div>
                      <div className="progress-royal mb-2">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${camp.color}88, ${camp.color})` }} />
                      </div>
                      <div className="flex items-center justify-between text-xs font-inter">
                        <span className="text-pearl/40">{camp.collecte.toLocaleString()}€ collectés</span>
                        <span className="font-bold" style={{ color: camp.color }}>{pct}%</span>
                        <span className="text-pearl/30">Objectif : {camp.objectif.toLocaleString()}€</span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Impact stats */}
            <div className="card-royal">
              <h3 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4 text-gold" />
                Impact de Vos Dons
              </h3>
              <div className="space-y-3">
                {[
                  { action: 'Familles aidées', value: '450+', icon: '👨‍👩‍👧‍👦' },
                  { action: 'Étudiants formés', value: '1,200+', icon: '📖' },
                  { action: 'Nations atteintes', value: '45+', icon: '🌍' },
                  { action: 'Familles réconciliées', value: '89', icon: '💚' },
                ].map((item) => (
                  <div key={item.action} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center">{item.icon}</span>
                    <span className="flex-1 text-sm text-pearl/60 font-inter">{item.action}</span>
                    <span className="font-cinzel font-bold text-gold text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
