'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Users, Heart, Send, MessageCircle, Radio, Clock, Eye, Download } from 'lucide-react'

const CHAT_MESSAGES = [
  { id: 1, nom: 'Marie K.', pays: '🇫🇷', message: 'Merci Seigneur pour cette parole !', type: 'message', time: '10:42' },
  { id: 2, nom: 'David M.', pays: '🇨🇩', message: 'Amen ! Cette prédication me touche au plus profond', type: 'message', time: '10:43' },
  { id: 3, nom: 'SYSTÈME', pays: '', message: '🎉 Grace N. vient de rejoindre la chapelle !', type: 'systeme', time: '10:43' },
  { id: 4, nom: 'Sarah P.', pays: '🇨🇮', message: 'Je demande la prière pour ma famille', type: 'priere', time: '10:44' },
  { id: 5, nom: 'John A.', pays: '🇳🇬', message: 'Glory to God 🔥', type: 'message', time: '10:44' },
]

const REACTIONS = ['🙏', '🔥', '❤️', '✨', '🙌', '💫', '👑', '⚡']

const REPLAYS = [
  { id: '1', titre: 'Culte Principal — "La foi qui déplace les montagnes"', date: '4 mai 2026', duree: '1h45min', vues: 3240, speaker: 'Pasteur Principal' },
  { id: '2', titre: 'Étude Biblique — "La puissance du Nom de Jésus"', date: '1 mai 2026', duree: '1h20min', vues: 1870, speaker: 'Berger Enseignant' },
  { id: '3', titre: 'Veillée de Prière Spéciale', date: '25 avr. 2026', duree: '2h15min', vues: 2150, speaker: 'Ministère Mahanaïm' },
  { id: '4', titre: 'Culte Principal — "Il est vivant !"', date: '20 avr. 2026', duree: '1h55min', vues: 5340, speaker: 'Pasteur Principal' },
]

export default function LivePage() {
  const [tab, setTab] = useState<'live' | 'replays'>('live')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState(CHAT_MESSAGES)
  const [reactionsVisible, setReactionsVisible] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim()) return
    const newMsg = {
      id: Date.now(),
      nom: 'Vous',
      pays: '',
      message: chatMessage,
      type: 'message',
      time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, newMsg])
    setChatMessage('')
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const sendReaction = (reaction: string) => {
    const newMsg = {
      id: Date.now(),
      nom: 'Vous',
      pays: '',
      message: reaction,
      type: 'reaction',
      time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, newMsg])
    setReactionsVisible(false)
  }

  return (
    <div className="min-h-screen bg-abyss pt-20">
      {/* Top bar */}
      <div className="border-b border-pearl/5">
        <div className="container-royal py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {['live', 'replays'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t as 'live' | 'replays')}
                className={`font-cinzel text-sm font-semibold transition-all px-1 pb-1 border-b-2 ${
                  tab === t
                    ? 'text-gold border-gold'
                    : 'text-pearl/40 border-transparent hover:text-pearl/70'
                }`}
              >
                {t === 'live' ? (
                  <span className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5" />
                    DIRECT & LIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5" />
                    REPLAYS
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-pearl/40">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="font-inter">0 en direct</span>
            </div>
          </div>
        </div>
      </div>

      {tab === 'live' && (
        <div className="container-royal py-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Video player */}
            <div className="xl:col-span-2">
              {/* Offline state */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-royal/20 to-abyss border border-pearl/10"
                style={{ aspectRatio: '16/9' }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-3xl bg-pearl/5 flex items-center justify-center text-3xl mb-4">
                    ⛪
                  </div>
                  <h2 className="font-cinzel text-xl font-bold text-pearl mb-2">
                    Pas de Live en ce moment
                  </h2>
                  <p className="text-pearl/50 font-inter text-sm mb-6 max-w-sm">
                    Le prochain culte en direct est prévu pour Dimanche à 10h00 (Paris)
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="badge-gold flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Dimanche 10:00 Paris
                    </div>
                  </div>
                </div>
              </div>

              {/* Video info */}
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-cinzel text-lg font-bold text-pearl mb-1">
                    Culte Principal CIER
                  </h1>
                  <p className="text-pearl/40 text-sm font-inter">
                    Prochainement • Dimanche 10:00
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="badge-royal flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    Prière
                  </button>
                  <button className="badge-gold flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Notes
                  </button>
                </div>
              </div>
            </div>

            {/* Chat panel */}
            <div className="flex flex-col h-[600px] rounded-3xl border border-pearl/10 overflow-hidden bg-pearl/[0.02]">
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-pearl/5">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-gold" />
                  <h3 className="font-cinzel text-xs font-bold text-pearl">Chat en Direct</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-pearl/30">
                  <Eye className="w-3 h-3" />
                  <span>0</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs font-inter ${
                      msg.type === 'systeme' ? 'text-gold/60 italic text-center' :
                      msg.type === 'priere' ? 'bg-royal/20 rounded-xl p-2 border border-royal/20' :
                      msg.type === 'reaction' ? 'text-center text-2xl' : ''
                    }`}
                  >
                    {msg.type !== 'systeme' && msg.type !== 'reaction' && (
                      <span className="font-semibold text-pearl/80">
                        {msg.nom} {msg.pays}
                      </span>
                    )}
                    {msg.type === 'priere' && (
                      <span className="block text-violet-300/70 text-[10px] mb-0.5 font-semibold">🙏 Prière</span>
                    )}
                    {msg.type !== 'systeme' && msg.type !== 'reaction' && ' '}
                    <span className={msg.type === 'priere' ? 'text-pearl/80' : 'text-pearl/60'}>
                      {msg.message}
                    </span>
                    {msg.type === 'reaction' && msg.message}
                    {msg.type === 'systeme' && msg.message}
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="p-3 border-t border-pearl/5">
                {/* Reactions */}
                <AnimatePresence>
                  {reactionsVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="grid grid-cols-8 gap-1 mb-2"
                    >
                      {REACTIONS.map((r) => (
                        <button key={r} onClick={() => sendReaction(r)}
                          className="text-lg hover:scale-125 transition-transform">
                          {r}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={sendMessage} className="flex gap-2">
                  <button type="button" onClick={() => setReactionsVisible(!reactionsVisible)}
                    className="w-8 h-8 rounded-lg bg-pearl/5 hover:bg-pearl/10 flex items-center justify-center text-base flex-shrink-0 transition-colors">
                    😊
                  </button>
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    placeholder="Écrire un message..."
                    className="flex-1 bg-pearl/5 border border-pearl/10 rounded-xl px-3 py-2 text-xs text-pearl placeholder-pearl/30 focus:outline-none focus:border-gold/30"
                  />
                  <button type="submit" className="w-8 h-8 rounded-lg bg-gold/20 border border-gold/30 hover:bg-gold/30 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Send className="w-3.5 h-3.5 text-gold" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'replays' && (
        <div className="container-royal py-8">
          <h2 className="font-cinzel text-2xl font-bold text-pearl mb-8">
            Replays & Archives
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {REPLAYS.map((replay, i) => (
              <motion.div
                key={replay.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="card-royal group cursor-pointer hover:-translate-y-1 transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="relative rounded-xl overflow-hidden mb-4"
                  style={{ aspectRatio: '16/9' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-royal/40 to-abyss flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 text-gold ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded-lg text-[10px] text-pearl/70 font-mono">
                    {replay.duree}
                  </div>
                </div>

                <h3 className="font-cinzel text-xs font-bold text-pearl group-hover:text-gold transition-colors line-clamp-2 mb-2">
                  {replay.titre}
                </h3>
                <p className="text-[11px] text-pearl/40 font-inter">{replay.speaker}</p>
                <div className="flex items-center justify-between mt-2 text-[11px] text-pearl/30">
                  <span>{replay.date}</span>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {replay.vues.toLocaleString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
