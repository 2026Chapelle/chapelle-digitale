'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Send, Paperclip, Smile, Phone, Video, MoreVertical, ArrowLeft, Circle } from 'lucide-react'

const CONVERSATIONS = [
  {
    id: '1',
    nom: 'Pasteur Élias Mbeki',
    avatar: '👨‍🏫',
    role: 'Pasteur Principal',
    lastMsg: 'Que la grâce soit avec vous frère !',
    time: '10:42',
    unread: 2,
    online: true,
    couleur: '#D4AF37',
  },
  {
    id: '2',
    nom: 'Marie Kondé',
    avatar: '👩🏾',
    role: 'Responsable Groupe',
    lastMsg: 'À vendredi pour la réunion de prière 🙏',
    time: '09:15',
    unread: 0,
    online: true,
    couleur: '#EC4899',
  },
  {
    id: '3',
    nom: 'Emmanuel Djouma',
    avatar: '👨🏿',
    role: 'Diacre',
    lastMsg: "Merci pour l'enseignement d'hier !",
    time: 'Hier',
    unread: 0,
    online: false,
    couleur: '#8B5CF6',
  },
  {
    id: '4',
    nom: 'Équipe Jeunesse',
    avatar: '🔥',
    role: 'Groupe · 12 membres',
    lastMsg: "Samuel : On se retrouve samedi !",
    time: 'Hier',
    unread: 5,
    online: false,
    couleur: '#F97316',
  },
  {
    id: '5',
    nom: 'Ruth Nguema',
    avatar: '👩🏽',
    role: 'Berger de Cellule',
    lastMsg: "J'ai partagé votre demande de prière",
    time: 'Lun.',
    unread: 0,
    online: false,
    couleur: '#22C55E',
  },
]

type Msg = { id: number; text: string; mine: boolean; time: string; type?: 'prayer' }

const MESSAGES_BY_CONV: Record<string, Msg[]> = {
  '1': [
    { id: 1, text: 'Bonjour Pasteur, j\'avais une question concernant le groupe de prière de mercredi.', mine: true, time: '10:30' },
    { id: 2, text: 'Bonjour frère ! Bien sûr, je suis disponible. Qu\'est-ce qui se passe ?', mine: false, time: '10:33' },
    { id: 3, text: 'Nous avons un nouveau membre qui souhaite rejoindre, mais il ne peut venir qu\'à 20h. Est-ce possible de décaler un peu ?', mine: true, time: '10:35' },
    { id: 4, text: 'Absolument ! L\'essentiel est que chaque brebis se sente accueillie. Je vais informer le groupe.', mine: false, time: '10:38' },
    { id: 5, text: 'Que la grâce soit avec vous frère !', mine: false, time: '10:42' },
  ],
  '2': [
    { id: 1, text: 'Sœur Marie, n\'oubliez pas la réunion de vendredi !', mine: false, time: '09:00' },
    { id: 2, text: 'Bien sûr ! J\'y serai avec quelques sœurs du groupe.', mine: true, time: '09:10' },
    { id: 3, text: 'À vendredi pour la réunion de prière 🙏', mine: false, time: '09:15' },
  ],
}

function PrayerBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold font-inter"
      style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
      🙏 Prière
    </span>
  )
}

export default function MessagesPage() {
  const [activeConv, setActiveConv] = useState<string | null>('1')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(MESSAGES_BY_CONV)
  const [query, setQuery] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  const conv = CONVERSATIONS.find(c => c.id === activeConv)
  const msgs = messages[activeConv ?? ''] ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !activeConv) return
    const newMsg: Msg = {
      id: Date.now(),
      text: input,
      mine: true,
      time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(m => ({ ...m, [activeConv]: [...(m[activeConv] ?? []), newMsg] }))
    setInput('')

    if (activeConv === '1') {
      setTimeout(() => {
        setMessages(m => ({
          ...m,
          [activeConv]: [...(m[activeConv] ?? []), {
            id: Date.now() + 1,
            text: 'Amen ! Je vous réponds dès que possible. Que Dieu vous bénisse. 🙏',
            mine: false,
            time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
          }],
        }))
      }, 1500)
    }
  }

  const filteredConvs = CONVERSATIONS.filter(c =>
    !query || c.nom.toLowerCase().includes(query.toLowerCase()) || c.lastMsg.toLowerCase().includes(query.toLowerCase())
  )

  const selectConv = (id: string) => {
    setActiveConv(id)
    setMobileView('chat')
  }

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Sidebar */}
      <div className={`flex flex-col w-full md:w-80 flex-shrink-0 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}
        style={{ background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="font-cinzel font-black text-white text-base mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-9 pr-3 py-2 rounded-xl font-inter text-xs text-white placeholder-white/20 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map(c => (
            <button
              key={c.id}
              onClick={() => selectConv(c.id)}
              className="w-full flex items-center gap-3 p-4 transition-all text-left"
              style={{
                background: activeConv === c.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                borderLeft: activeConv === c.id ? `2px solid ${c.couleur}` : '2px solid transparent',
              }}
            >
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${c.couleur}18` }}>
                  {c.avatar}
                </div>
                {c.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ background: '#22C55E', borderColor: '#050505' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-inter text-sm font-semibold text-white truncate">{c.nom}</span>
                  <span className="text-[10px] font-inter flex-shrink-0 ml-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{c.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-inter truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.lastMsg}</span>
                  {c.unread > 0 && (
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0 ml-2"
                      style={{ background: c.couleur }}>
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}
        style={{ background: '#08001A' }}>
        {conv ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setMobileView('list')} className="md:hidden text-pearl/40 hover:text-pearl/80 mr-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: `${conv.couleur}18` }}>
                  {conv.avatar}
                </div>
                {conv.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: '#22C55E', borderColor: '#08001A' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-inter text-sm font-bold text-white">{conv.nom}</div>
                <div className="text-[11px] font-inter" style={{ color: conv.online ? '#22C55E' : 'rgba(255,255,255,0.35)' }}>
                  {conv.online ? 'En ligne' : conv.role}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-xl transition-colors hover:bg-white/5 text-pearl/40 hover:text-pearl/80">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-xl transition-colors hover:bg-white/5 text-pearl/40 hover:text-pearl/80">
                  <Video className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-xl transition-colors hover:bg-white/5 text-pearl/40 hover:text-pearl/80">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
              {msgs.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex ${msg.mine ? 'justify-end' : 'justify-start'}`}
                >
                  {!msg.mine && (
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm mr-2 flex-shrink-0 self-end"
                      style={{ background: `${conv.couleur}18` }}>
                      {conv.avatar}
                    </div>
                  )}
                  <div className="max-w-[72%]">
                    <div
                      className="px-4 py-2.5 rounded-2xl font-inter text-sm leading-relaxed"
                      style={msg.mine
                        ? { background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))', border: '1px solid rgba(212,175,55,0.2)', color: '#fff', borderBottomRightRadius: '6px' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.07)', borderBottomLeftRadius: '6px' }
                      }
                    >
                      {msg.text}
                    </div>
                    <div className={`text-[10px] font-inter mt-1 ${msg.mine ? 'text-right' : 'text-left'}`}
                      style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {msg.time}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Quick actions */}
            <div className="px-5 pb-2 flex gap-2">
              {["🙏 Prière partagée", "📖 Verset du jour", "Amen !"].map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-inter font-medium transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="flex items-center gap-3 px-5 py-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button type="button" className="text-pearl/30 hover:text-pearl/70 transition-colors flex-shrink-0">
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Écrivez votre message…"
                className="flex-1 bg-transparent font-inter text-sm text-white placeholder-white/20 outline-none"
              />
              <button type="button" className="text-pearl/30 hover:text-pearl/70 transition-colors flex-shrink-0">
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:-translate-y-0.5 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)' }}
              >
                <Send className="w-4 h-4 text-[#1A0F00]" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="text-5xl mb-2">💬</div>
            <h3 className="font-cinzel text-lg font-bold text-white">Vos conversations</h3>
            <p className="font-inter text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Sélectionnez une conversation pour commencer à échanger.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
