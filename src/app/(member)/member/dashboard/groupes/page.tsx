'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, MapPin, Calendar, MessageCircle, Plus, Globe, Video, ChevronRight, ArrowRight,
  Church, Flame, Heart, Home, CalendarPlus, Share2, Send, Building2,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

const MON_GROUPE = {
  id: '1',
  nom: 'Cellule Paris Centre',
  plateforme: 'CIER Global',
  icon: Church,
  couleur: '#D4AF37',
  type: 'Présentiel',
  ville: 'Paris, France',
  membres: 18,
  berger: 'Frère Emmanuel',
  jour: 'Vendredi',
  heure: '19h30',
  prochainRdv: '2026-05-15',
  description: 'Cellule de croissance en plein cœur de Paris. Étude biblique, partage et intercession.',
}

const MEMBRES_GROUPE = [
  { prenom: 'Emmanuel', nom: 'D.', role: 'Berger', pays: '🇫🇷', couleur: '#D4AF37' },
  { prenom: 'Marie', nom: 'K.', role: 'Secrétaire', pays: '🇨🇩', couleur: '#EC4899' },
  { prenom: 'David', nom: 'M.', role: 'Membre', pays: '🇧🇪', couleur: '#0EA5E9' },
  { prenom: 'Jean', nom: 'D.', role: 'Vous', pays: '🇫🇷', couleur: '#22C55E' },
  { prenom: 'Amina', nom: 'K.', role: 'Membre', pays: '🇨🇮', couleur: '#8B5CF6' },
  { prenom: 'Samuel', nom: 'T.', role: 'Membre', pays: '🇨🇲', couleur: '#F97316' },
]

const PROCHAINS_RDVS = [
  { date: '2026-05-15', titre: 'Étude biblique — Matthieu 5', type: 'Étude', heure: '19h30' },
  { date: '2026-05-22', titre: 'Temps de prière & partage', type: 'Prière', heure: '19h30' },
  { date: '2026-05-29', titre: 'Soirée témoignages & louange', type: 'Louange', heure: '19h30' },
]

type Suggestion = { id: string; nom: string; icon: LucideIcon; couleur: string; ville: string; type: string; membres: number }
const SUGGESTIONS: Suggestion[] = [
  { id: '2', nom: 'Groupe Jeunesse Lyon',     icon: Flame, couleur: '#EF4444', ville: 'Lyon, France',  type: 'Hybride',     membres: 32 },
  { id: '5', nom: 'Intercesseurs Online',     icon: Heart, couleur: '#8B5CF6', ville: 'International', type: 'En ligne',    membres: 89 },
  { id: '7', nom: 'Cellule Cité du Refuge',   icon: Home,  couleur: '#22C55E', ville: 'Abidjan, CI',   type: 'Présentiel',  membres: 20 },
]

const TYPE_COLORS: Record<string, string> = {
  Étude: '#D4AF37',
  Prière: '#8B5CF6',
  Louange: '#EC4899',
  Célébration: '#22C55E',
}

export default function MesGroupesPage() {
  const [tab, setTab] = useState<'mon-groupe' | 'decouvrir'>('mon-groupe')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMsg, setChatMsg] = useState('')
  const [messages, setMessages] = useState([
    { id: 1, auteur: 'Emmanuel D.', msg: "Bonsoir la famille ! 🙏 Notre prochaine rencontre c'est vendredi à 19h30", time: '18:42' },
    { id: 2, auteur: 'Marie K.', msg: 'Amen ! Je serai là avec mon mari', time: '18:45' },
    { id: 3, auteur: 'Samuel T.', msg: 'Pareil pour moi ! 🔥', time: '18:47' },
  ])

  const sendMsg = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMsg.trim()) return
    setMessages(prev => [...prev, { id: Date.now(), auteur: 'Vous', msg: chatMsg, time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }) }])
    setChatMsg('')
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="section-label mb-2">Espace Membre</div>
            <h1
              className="font-cinzel font-black text-pearl text-balance"
              style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              Mes <span className="text-cinematic-gold">Groupes</span>
            </h1>
            <p className="text-pearl/50 text-sm font-inter mt-2">Votre communauté de croissance locale</p>
          </div>
          <Link href="/groupes" className="btn-ghost text-sm py-2.5 px-4 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Tous les groupes
          </Link>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['mon-groupe', 'decouvrir'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 rounded-xl text-sm font-inter font-medium transition-all"
              style={{
                background: tab === t ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                color: tab === t ? '#D4AF37' : 'rgba(255,255,255,0.45)',
                border: `1px solid ${tab === t ? 'rgba(212,175,55,0.3)' : 'transparent'}`,
              }}>
              {t === 'mon-groupe' ? 'Mon Groupe' : 'Découvrir'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'mon-groupe' ? (
            <motion.div key="mon-groupe"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Left — group info + members */}
              <div className="lg:col-span-2 space-y-5">

                {/* Group card */}
                <div className="card-royal" style={{ borderColor: `${MON_GROUPE.couleur}20` }}>
                  <div className="flex items-start gap-4 mb-5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${MON_GROUPE.couleur}18`,
                        border: `1px solid ${MON_GROUPE.couleur}40`,
                        boxShadow: `0 8px 24px ${MON_GROUPE.couleur}20`,
                      }}
                    >
                      <MON_GROUPE.icon className="w-7 h-7" style={{ color: MON_GROUPE.couleur }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-inter mb-0.5 tracking-widest uppercase" style={{ color: MON_GROUPE.couleur }}>{MON_GROUPE.plateforme}</div>
                      <h2 className="font-cinzel text-base md:text-lg font-bold text-pearl mb-1.5 truncate">{MON_GROUPE.nom}</h2>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-inter text-pearl/45">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{MON_GROUPE.ville}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{MON_GROUPE.jour} · {MON_GROUPE.heure}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{MON_GROUPE.membres} membres</span>
                      </div>
                    </div>
                    {(() => {
                      const isOnline = MON_GROUPE.type === 'En ligne'
                      const isHybride = MON_GROUPE.type === 'Hybride'
                      const c = isOnline ? '#0EA5E9' : isHybride ? '#F59E0B' : '#22C55E'
                      const Icon = isOnline ? Globe : isHybride ? Video : MapPin
                      return (
                        <span
                          className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-inter font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
                          style={{ background: `${c}18`, color: c, border: `1px solid ${c}30` }}
                        >
                          <Icon className="w-3 h-3" />
                          {MON_GROUPE.type}
                        </span>
                      )
                    })()}
                  </div>
                  <p className="font-inter text-xs md:text-sm text-pearl/55 leading-relaxed">{MON_GROUPE.description}</p>
                </div>

                {/* Members */}
                <div className="card-royal">
                  <h3 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gold" />
                    Membres du groupe ({MEMBRES_GROUPE.length})
                  </h3>
                  <div className="space-y-2">
                    {MEMBRES_GROUPE.map((m, i) => (
                      <motion.div key={m.prenom} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-pearl/[0.03] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-cinzel font-bold text-sm text-white flex-shrink-0"
                          style={{ background: m.couleur }}>
                          {m.prenom[0]}{m.nom[0]}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold font-inter text-pearl">{m.prenom} {m.nom} {m.pays}</div>
                          <div className="text-[10px] font-inter" style={{ color: m.role === 'Berger' ? '#D4AF37' : m.role === 'Vous' ? '#22C55E' : 'rgba(255,255,255,0.3)' }}>
                            {m.role}
                          </div>
                        </div>
                        {m.role !== 'Vous' && (
                          <button className="text-[10px] font-inter text-pearl/20 hover:text-gold transition-colors px-2 py-1 rounded-lg hover:bg-gold/5">
                            Message
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Upcoming meetings */}
                <div className="card-royal">
                  <h3 className="font-cinzel text-sm font-bold text-pearl mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gold" />
                    Prochaines Rencontres
                  </h3>
                  <div className="space-y-3">
                    {PROCHAINS_RDVS.map((rdv, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-pearl/5 bg-pearl/[0.02]">
                        <div className="text-center rounded-xl px-2 py-1.5 min-w-[44px] flex-shrink-0"
                          style={{ background: `${TYPE_COLORS[rdv.type] || '#D4AF37'}15`, border: `1px solid ${TYPE_COLORS[rdv.type] || '#D4AF37'}25` }}>
                          <div className="font-inter text-[9px] font-semibold uppercase" style={{ color: TYPE_COLORS[rdv.type] }}>
                            {new Date(rdv.date).toLocaleDateString('fr', { weekday: 'short' })}
                          </div>
                          <div className="font-cinzel text-lg font-black text-pearl leading-none">
                            {new Date(rdv.date).getDate()}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-inter text-sm font-semibold text-pearl">{rdv.titre}</p>
                          <p className="text-xs text-pearl/35 font-inter">{rdv.heure}</p>
                        </div>
                        <span className="text-[10px] font-inter px-2 py-0.5 rounded-full"
                          style={{ background: `${TYPE_COLORS[rdv.type] || '#D4AF37'}15`, color: TYPE_COLORS[rdv.type] || '#D4AF37' }}>
                          {rdv.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right — chat */}
              <div className="space-y-5">
                <div className="card-royal flex flex-col h-[500px]">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-pearl/5">
                    <MessageCircle className="w-4 h-4 text-gold" />
                    <h3 className="font-cinzel text-sm font-bold text-pearl">Chat du Groupe</h3>
                    <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex gap-2 ${msg.auteur === 'Vous' ? 'flex-row-reverse' : ''}`}>
                        <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center text-[10px] font-bold text-gold flex-shrink-0">
                          {msg.auteur[0]}
                        </div>
                        <div className={`max-w-[75%] ${msg.auteur === 'Vous' ? 'items-end' : 'items-start'} flex flex-col`}>
                          {msg.auteur !== 'Vous' && (
                            <span className="text-[10px] text-pearl/35 font-inter mb-1">{msg.auteur}</span>
                          )}
                          <div className="px-3 py-2 rounded-xl text-xs font-inter"
                            style={{
                              background: msg.auteur === 'Vous' ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.05)',
                              color: msg.auteur === 'Vous' ? '#D4AF37' : 'rgba(255,255,255,0.7)',
                            }}>
                            {msg.msg}
                          </div>
                          <span className="text-[9px] text-pearl/20 font-inter mt-1">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={sendMsg} className="flex gap-2">
                    <input
                      type="text"
                      value={chatMsg}
                      onChange={e => setChatMsg(e.target.value)}
                      placeholder="Message au groupe…"
                      className="flex-1 bg-pearl/5 border border-pearl/10 rounded-xl px-3 py-2 text-xs font-inter text-pearl placeholder:text-pearl/25 outline-none focus:border-gold/30"
                    />
                    <button type="submit" disabled={!chatMsg.trim()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:scale-105 enabled:active:scale-95"
                      style={{ background: 'rgba(212,175,55,0.18)', border: '1px solid rgba(212,175,55,0.3)' }}
                      aria-label="Envoyer">
                      <Send className="w-4 h-4 text-gold" />
                    </button>
                  </form>
                </div>

                {/* Quick action */}
                <div className="card-royal">
                  <h3 className="font-cinzel text-xs font-bold text-pearl mb-3">Actions Rapides</h3>
                  <div className="space-y-2">
                    {([
                      { label: 'Ajouter au calendrier', icon: CalendarPlus,    color: '#D4AF37' },
                      { label: 'Contacter le berger',   icon: MessageCircle,   color: '#0EA5E9' },
                      { label: 'Partager le groupe',    icon: Share2,          color: '#22C55E' },
                    ] as const).map(a => (
                      <button key={a.label}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pearl/[0.04] transition-colors text-left">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${a.color}15`, border: `1px solid ${a.color}28` }}
                        >
                          <a.icon className="w-3.5 h-3.5" style={{ color: a.color }} />
                        </div>
                        <span className="text-xs font-inter text-pearl/65 flex-1">{a.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-pearl/20" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="decouvrir"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              <div className="mb-6">
                <p className="font-inter text-sm text-pearl/45 mb-6">
                  Groupes recommandés pour vous basés sur votre profil et vos préférences
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {SUGGESTIONS.map((g, i) => (
                    <motion.div key={g.id}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="card-royal group hover:-translate-y-1 transition-all duration-300"
                      style={{ borderColor: `${g.couleur}15` }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${g.couleur}18`, border: `1px solid ${g.couleur}30` }}>
                          <g.icon className="w-5 h-5" style={{ color: g.couleur }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-cinzel text-sm font-bold text-pearl truncate">{g.nom}</h3>
                          <div className="flex items-center gap-1 text-[10px] text-pearl/40 font-inter">
                            <MapPin className="w-3 h-3" />{g.ville}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-inter mb-4">
                        <span className="text-pearl/35 flex items-center gap-1">
                          <Users className="w-3 h-3" />{g.membres} membres
                        </span>
                        <span className="flex items-center gap-1" style={{ color: g.type === 'En ligne' ? '#0EA5E9' : '#22C55E' }}>
                          {g.type === 'En ligne' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                          {g.type}
                        </span>
                      </div>
                      <button className="w-full py-2 rounded-xl text-xs font-inter font-semibold transition-all"
                        style={{ background: `${g.couleur}12`, color: g.couleur, border: `1px solid ${g.couleur}25` }}>
                        Rejoindre
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="text-center card-royal py-12" style={{ borderColor: 'rgba(212,175,55,0.15)' }}>
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{
                    background: 'rgba(212,175,55,0.1)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    boxShadow: '0 8px 24px rgba(212,175,55,0.15)',
                  }}
                >
                  <Building2 className="w-7 h-7" style={{ color: '#D4AF37' }} />
                </div>
                <h2 className="font-cinzel text-lg md:text-xl font-bold text-pearl mb-3">Pas de groupe près de vous ?</h2>
                <p className="font-inter text-sm text-pearl/50 mb-6 max-w-sm mx-auto leading-relaxed">
                  Devenez initiateur d'une cellule dans votre ville. Notre équipe vous accompagne dans le démarrage.
                </p>
                <Link href="/contact" className="btn-gold text-sm px-6 py-2.5">
                  Créer un groupe
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
