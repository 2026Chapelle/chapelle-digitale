'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Clock, Eye, Calendar, Tv, Radio, Heart,
  MessageSquare, Send, Share2, Volume2, VolumeX, Maximize,
  ChevronLeft, ChevronRight, Bell, Users, Star, Bookmark, Download,
  Church, Moon, BookOpen, Crown, Flame, Sparkles,
  type LucideIcon,
} from 'lucide-react'

const PLATEFORME_ICON: Record<string, LucideIcon> = {
  'CIER Global':         Church,
  'Intercession':        Moon,
  'CFIC':                BookOpen,
  'Jeunesse':            Flame,
  "Femmes d'Exceptions": Crown,
  'Mahanaïm':            Heart,
}
const platIcon = (name: string): LucideIcon => PLATEFORME_ICON[name] ?? Sparkles

const LIVE_EN_COURS = {
  titre: 'Culte Principal CIER — Dimanche de Pentecôte',
  plateforme: 'CIER Global',
  pasteur: 'Pasteur Samuel',
  spectateurs: 2847,
  duree: '1h 23min',
  couleur: '#D4AF37',
  emoji: '⛪',
  description: 'Un culte exceptionnel pour célébrer la Pentecôte. Worship, enseignement et prière collective mondiale.',
}

const CHAT_MESSAGES = [
  { id: 1, user: 'Amina K.', drapeau: '🇨🇮', msg: 'Gloire à Dieu ! 🙌', time: '10:23', couleur: '#EC4899' },
  { id: 2, user: 'David M.', drapeau: '🇨🇩', msg: 'Je suis béni par cet enseignement 🔥', time: '10:24', couleur: '#0EA5E9' },
  { id: 3, user: 'Sarah P.', drapeau: '🇫🇷', msg: 'Amen ! Alléluia !', time: '10:24', couleur: '#22C55E' },
  { id: 4, user: 'Grace N.', drapeau: '🇳🇬', msg: 'Priant depuis Lagos ❤️', time: '10:25', couleur: '#8B5CF6' },
  { id: 5, user: 'Joseph B.', drapeau: '🇧🇮', msg: 'Que Dieu bénisse chaque famille ! 🙏', time: '10:25', couleur: '#D4AF37' },
  { id: 6, user: 'Marie C.', drapeau: '🇧🇪', msg: 'Depuis Bruxelles, je loue avec vous 🌟', time: '10:26', couleur: '#F97316' },
  { id: 7, user: 'Paul T.', drapeau: '🇨🇲', msg: 'Merci Seigneur pour ce message !', time: '10:27', couleur: '#14B8A6' },
]

const REPLAYS = [
  { id: '1', titre: 'Culte Principal', date: '04/05/2026', duree: '2h15', plateforme: 'CIER Global', emoji: '⛪', couleur: '#D4AF37', views: 1243 },
  { id: '2', titre: 'Nuit de Prière', date: '25/04/2026', duree: '6h00', plateforme: 'Intercession', emoji: '🌙', couleur: '#8B5CF6', views: 456 },
  { id: '3', titre: 'École de Prière S5', date: '20/04/2026', duree: '1h30', plateforme: 'CFIC', emoji: '📖', couleur: '#0EA5E9', views: 234 },
  { id: '4', titre: 'Conférence Leadership', date: '15/04/2026', duree: '3h00', plateforme: 'CIER Global', emoji: '👑', couleur: '#22C55E', views: 892 },
  { id: '5', titre: 'Culte Jeunesse', date: '20/04/2026', duree: '1h45', plateforme: 'Jeunesse', emoji: '🔥', couleur: '#EC4899', views: 567 },
  { id: '6', titre: 'Groupe Femmes', date: '09/04/2026', duree: '1h20', plateforme: "Femmes d'Exceptions", emoji: '🌸', couleur: '#F59E0B', views: 189 },
]

const A_VENIR = [
  { id: '7', titre: 'Veillée de Prière', date: '15/05/2026', heure: '22:00', plateforme: 'Intercession', emoji: '🌙', couleur: '#8B5CF6' },
  { id: '8', titre: 'Live Jeunesse Worship', date: '18/05/2026', heure: '19:00', plateforme: 'Jeunesse', emoji: '🔥', couleur: '#EC4899' },
  { id: '9', titre: 'École de Prière S6', date: '21/05/2026', heure: '20:00', plateforme: 'CFIC', emoji: '📖', couleur: '#0EA5E9' },
]

const REACTIONS_LIVE = ['🙌', '🔥', '❤️', '🙏', '✨', '👑']

export default function LivesPage() {
  const [tab, setTab] = useState<'live' | 'replays' | 'programme'>('live')
  const [chatOpen, setChatOpen] = useState(true)
  const [chatMsg, setChatMsg] = useState('')
  const [messages, setMessages] = useState(CHAT_MESSAGES)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([])
  const [bookmarked, setBookmarked] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const reactionCount = useRef(0)

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = () => {
    if (!chatMsg.trim()) return
    setMessages(prev => [...prev, {
      id: Date.now(),
      user: 'Vous',
      drapeau: '🇫🇷',
      msg: chatMsg,
      time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
      couleur: '#D4AF37',
    }])
    setChatMsg('')
  }

  const sendReaction = (emoji: string) => {
    const id = reactionCount.current++
    setReactions(prev => [...prev, { id, emoji, x: Math.random() * 80 + 10 }])
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2000)
  }

  return (
    <div className="min-h-screen pt-20 pb-8 bg-abyss">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 pt-4">
          {[
            { key: 'live',      label: 'Live maintenant', live: true  },
            { key: 'replays',   label: 'Replays',         live: false },
            { key: 'programme', label: 'Programme',       live: false },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-inter font-medium transition-all"
              style={{
                background: tab === t.key ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                color: tab === t.key ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${tab === t.key ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.07)'}`,
              }}>
              {t.live && (
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-70 animate-ping" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-red-500" />
                </span>
              )}
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-sm text-pearl/40 font-inter">
            <Users className="w-3.5 h-3.5" />
            <span className="font-cinzel text-gold font-bold tabular-nums">{LIVE_EN_COURS.spectateurs.toLocaleString('fr')}</span>
            <span className="hidden sm:inline">en ligne</span>
          </div>
        </div>

        {tab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Player column */}
            <div className="lg:col-span-2 space-y-4">

              {/* Video player */}
              <motion.div
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-3xl overflow-hidden"
                style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #050010 0%, #120028 50%, #050010 100%)' }}
              >
                {/* Faux player cinématique */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: 'radial-gradient(ellipse at 30% 40%, rgba(212,175,55,0.25) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(75,0,130,0.3) 0%, transparent 60%)',
                    }}
                  />
                  <div className="relative z-10 text-center px-8">
                    {(() => {
                      const Icon = platIcon(LIVE_EN_COURS.plateforme)
                      return (
                        <div
                          className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center"
                          style={{
                            background: 'rgba(212,175,55,0.08)',
                            border: '1px solid rgba(212,175,55,0.25)',
                            boxShadow: '0 0 60px rgba(212,175,55,0.18) inset, 0 12px 40px rgba(0,0,0,0.4)',
                          }}
                        >
                          <Icon className="w-11 h-11 opacity-70" style={{ color: '#D4AF37' }} />
                        </div>
                      )
                    })()}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                      style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
                      <span className="relative flex w-2 h-2">
                        <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-70 animate-ping" />
                        <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
                      </span>
                      <span className="font-inter text-xs font-bold tracking-[0.18em] text-gold">LIVE EN DIRECT</span>
                    </div>
                    <h2 className="font-cinzel text-xl md:text-3xl font-black text-pearl leading-tight tracking-tight" style={{ letterSpacing: '-0.01em' }}>
                      {LIVE_EN_COURS.titre}
                    </h2>
                  </div>
                </div>

                {/* Floating reactions */}
                <div className="absolute bottom-16 left-4 pointer-events-none">
                  <AnimatePresence>
                    {reactions.map(r => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 1, y: 0, scale: 0.5 }}
                        animate={{ opacity: 0, y: -120, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: 'easeOut' }}
                        className="absolute text-2xl"
                        style={{ left: `${r.x}%` }}
                      >
                        {r.emoji}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Controls overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-4">
                  {/* Top bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                      <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                      <span className="text-white text-xs font-inter font-bold">
                        {LIVE_EN_COURS.spectateurs.toLocaleString()} spectateurs
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBookmarked(!bookmarked)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                        <Bookmark className="w-4 h-4" style={{ color: bookmarked ? '#D4AF37' : 'white' }}
                          fill={bookmarked ? '#D4AF37' : 'none'} />
                      </button>
                      <button className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                        <Share2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom controls */}
                  <div className="space-y-3">
                    {/* Progress bar */}
                    <div className="relative h-1 rounded-full cursor-pointer" style={{ background: 'rgba(255,255,255,0.2)' }}>
                      <div className="h-full rounded-full" style={{ width: '34%', background: 'linear-gradient(90deg, #8B5CF6, #D4AF37)' }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg"
                        style={{ left: '34%', transform: 'translate(-50%, -50%)' }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setIsPlaying(!isPlaying)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                          style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)' }}>
                          {isPlaying
                            ? <Pause className="w-5 h-5 text-abyss" fill="currentColor" />
                            : <Play className="w-5 h-5 text-abyss ml-0.5" fill="currentColor" />
                          }
                        </button>
                        <button onClick={() => setIsMuted(!isMuted)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.4)' }}>
                          {isMuted
                            ? <VolumeX className="w-4 h-4 text-pearl/60" />
                            : <Volume2 className="w-4 h-4 text-white" />
                          }
                        </button>
                        <span className="text-white text-xs font-mono">1:23:47 / En direct</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter"
                          style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setChatOpen(!chatOpen)}>
                          <MessageSquare className="w-3.5 h-3.5 text-white" />
                          <span className="text-white">Chat</span>
                        </button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.4)' }}>
                          <Maximize className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Info bar */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="card-royal">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-inter text-red-400 font-bold">EN DIRECT</span>
                      <span className="text-xs text-pearl/30">·</span>
                      <span className="text-xs text-pearl/40 font-inter">{LIVE_EN_COURS.plateforme}</span>
                    </div>
                    <h2 className="font-cinzel text-base font-bold text-pearl mb-1">{LIVE_EN_COURS.titre}</h2>
                    <p className="text-xs text-pearl/45 font-inter">{LIVE_EN_COURS.description}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    {(() => {
                      const Icon = platIcon(LIVE_EN_COURS.plateforme)
                      return (
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: `${LIVE_EN_COURS.couleur}18`, border: `1px solid ${LIVE_EN_COURS.couleur}35` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: LIVE_EN_COURS.couleur }} />
                        </div>
                      )
                    })()}
                    <p className="text-[11px] text-pearl/45 font-inter text-center max-w-[100px] truncate">{LIVE_EN_COURS.pasteur}</p>
                  </div>
                </div>

                {/* Reaction bar */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-pearl/[0.05]">
                  <span className="text-xs text-pearl/30 font-inter mr-1">Réagir :</span>
                  {REACTIONS_LIVE.map(emoji => (
                    <button key={emoji}
                      onClick={() => sendReaction(emoji)}
                      className="text-xl hover:scale-125 transition-transform active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-3 text-xs text-pearl/30 font-inter">
                    <button className="flex items-center gap-1 hover:text-pearl transition-colors">
                      <Share2 className="w-3.5 h-3.5" /> Partager
                    </button>
                    <button className="flex items-center gap-1 hover:text-pearl transition-colors">
                      <Bell className="w-3.5 h-3.5" /> Me rappeler
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Coming up */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h3 className="font-cinzel text-xs font-bold text-pearl/40 mb-3 uppercase tracking-wider">Prochains Lives</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {A_VENIR.map((e) => (
                    <div key={e.id} className="p-3 rounded-2xl cursor-pointer transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      onMouseEnter={ev => {
                        (ev.currentTarget as HTMLDivElement).style.borderColor = `${e.couleur}30`
                        ;(ev.currentTarget as HTMLDivElement).style.background = `${e.couleur}08`
                      }}
                      onMouseLeave={ev => {
                        (ev.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'
                        ;(ev.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'
                      }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{e.emoji}</span>
                        <div>
                          <p className="font-inter text-xs font-semibold text-pearl leading-tight">{e.titre}</p>
                          <p className="text-[10px] text-pearl/30 font-inter">{e.date} à {e.heure}</p>
                        </div>
                      </div>
                      <button className="w-full py-1.5 rounded-lg text-[10px] font-inter font-semibold transition-all"
                        style={{ background: `${e.couleur}18`, color: e.couleur, border: `1px solid ${e.couleur}25` }}>
                        Me rappeler
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Chat column */}
            <AnimatePresence>
              {chatOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col rounded-3xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    height: '680px',
                  }}
                >
                  {/* Chat header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-pearl/[0.06]">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gold" />
                      <span className="font-cinzel text-sm font-bold text-pearl">Chat Live</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px] text-pearl/30 font-inter">
                        {LIVE_EN_COURS.spectateurs.toLocaleString()} en ligne
                      </span>
                    </div>
                  </div>

                  {/* Messages */}
                  <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.05) transparent' }}>
                    {messages.map((m) => (
                      <div key={m.id} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
                          style={{ background: m.couleur }}>
                          {m.user[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-semibold font-inter" style={{ color: m.couleur }}>
                              {m.user}
                            </span>
                            <span className="text-sm">{m.drapeau}</span>
                            <span className="text-[9px] text-pearl/20 font-inter">{m.time}</span>
                          </div>
                          <p className="text-xs font-inter text-pearl/65 leading-relaxed">{m.msg}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat input */}
                  <div className="p-3 border-t border-pearl/[0.06]">
                    <div className="flex gap-2 mb-2">
                      {['🙌', '🔥', '🙏', '❤️'].map(e => (
                        <button key={e} onClick={() => sendReaction(e)}
                          className="text-base hover:scale-110 transition-transform">
                          {e}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 rounded-xl text-xs font-inter text-pearl/80 placeholder-pearl/25 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                        placeholder="Écrire dans le chat..."
                        value={chatMsg}
                        onChange={e => setChatMsg(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      />
                      <button
                        onClick={sendMessage}
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: chatMsg ? 'rgba(212,175,55,0.85)' : 'rgba(255,255,255,0.05)' }}
                      >
                        <Send className="w-3.5 h-3.5" style={{ color: chatMsg ? '#1A0F00' : 'rgba(255,255,255,0.3)' }} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {tab === 'replays' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Lives regardés', value: '24', icon: Tv, color: '#D4AF37' },
                { label: 'Heures visionnées', value: '47h', icon: Clock, color: '#8B5CF6' },
                { label: 'Plateformes suivies', value: '4', icon: Eye, color: '#0EA5E9' },
              ].map(s => (
                <div key={s.label} className="card-royal text-center py-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
                    style={{ background: `${s.color}18` }}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <div className="font-cinzel text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] text-pearl/35 font-inter mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {REPLAYS.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card-royal group cursor-pointer"
                  style={{ transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${r.couleur}30`
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'
                  }}
                >
                  {/* Thumbnail */}
                  {(() => {
                    const Icon = platIcon(r.plateforme)
                    return (
                      <div className="relative rounded-2xl overflow-hidden mb-4 h-36"
                        style={{ background: `linear-gradient(135deg, ${r.couleur}28, rgba(10,0,24,0.95))` }}>
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: `radial-gradient(ellipse at 50% 40%, ${r.couleur}22 0%, transparent 70%)` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Icon className="w-16 h-16 transition-opacity opacity-15 group-hover:opacity-25" style={{ color: r.couleur }} />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                            style={{ background: `${r.couleur}40`, backdropFilter: 'blur(4px)', boxShadow: `0 8px 24px ${r.couleur}40` }}>
                            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                          </motion.div>
                        </div>
                        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                          <span className="bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-lg font-mono">{r.duree}</span>
                        </div>
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-1 rounded-lg"
                          style={{ background: `${r.couleur}25`, backdropFilter: 'blur(4px)', border: `1px solid ${r.couleur}45` }}>
                          <Icon className="w-3 h-3" style={{ color: r.couleur }} />
                        </div>
                      </div>
                    )
                  })()}

                  <h3 className="font-cinzel font-bold text-pearl text-sm mb-1 group-hover:text-gold transition-colors leading-tight">
                    {r.titre}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-pearl/35 font-inter mb-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{r.date}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{r.views.toLocaleString()} vues</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-inter px-2 py-1 rounded-lg"
                      style={{ background: `${r.couleur}15`, color: r.couleur }}>{r.plateforme}</span>
                    <div className="flex gap-1.5">
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-pearl/10 transition-colors">
                        <Bookmark className="w-3.5 h-3.5 text-pearl/30" />
                      </button>
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-pearl/10 transition-colors">
                        <Download className="w-3.5 h-3.5 text-pearl/30" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'programme' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="card-royal mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gold" />
                <h3 className="font-cinzel text-sm font-bold text-pearl">Programme des Prochains Lives</h3>
              </div>
              <p className="text-xs text-pearl/35 font-inter">Tous les horaires sont en heure de Paris (CET)</p>
            </div>
            {[
              { date: 'Dimanche 11 Mai', items: [
                { titre: 'Culte Principal CIER', heure: '10:00', plateforme: 'CIER Global', couleur: '#D4AF37', prevues: 2800 },
                { titre: 'Culte Jeunesse',       heure: '15:00', plateforme: 'Jeunesse',    couleur: '#6366F1', prevues: 450 },
              ]},
              { date: 'Mercredi 14 Mai', items: [
                { titre: 'Étude Biblique — Actes des Apôtres', heure: '20:00', plateforme: 'CFIC', couleur: '#0EA5E9', prevues: 320 },
              ]},
              { date: 'Vendredi 16 Mai', items: [
                { titre: "Groupe Femmes d'Exceptions", heure: '21:00', plateforme: "Femmes d'Exceptions", couleur: '#EC4899', prevues: 180 },
              ]},
              { date: 'Jeudi 15 Mai', items: [
                { titre: 'Veillée de Prière — Nations Africaines', heure: '22:00', plateforme: 'Intercession', couleur: '#8B5CF6', prevues: 560 },
              ]},
            ].map((day) => (
              <div key={day.date}>
                <h4 className="text-xs font-inter font-semibold text-pearl/30 uppercase tracking-wider mb-3">{day.date}</h4>
                <div className="space-y-2">
                  {day.items.map((item, j) => {
                    const Icon = platIcon(item.plateforme)
                    return (
                      <motion.div key={j}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: j * 0.08 }}
                        className="card-royal flex items-center gap-4"
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${item.couleur}18`, border: `1px solid ${item.couleur}35` }}>
                          <Icon className="w-6 h-6" style={{ color: item.couleur }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-cinzel font-bold text-pearl text-sm mb-1 truncate">{item.titre}</h3>
                          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-pearl/40 font-inter">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.heure}</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{item.prevues.toLocaleString('fr')} attendus</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                              style={{ background: `${item.couleur}15`, color: item.couleur }}>{item.plateforme}</span>
                          </div>
                        </div>
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-inter font-semibold flex-shrink-0 transition-all hover:-translate-y-0.5"
                          style={{ background: `${item.couleur}18`, color: item.couleur, border: `1px solid ${item.couleur}25` }}>
                          <Bell className="w-3 h-3" />
                          <span className="hidden sm:inline">Rappel</span>
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
