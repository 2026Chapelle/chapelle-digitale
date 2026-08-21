'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Clock, Eye, Calendar, Tv, Radio, Heart,
  MessageSquare, Send, Share2, Volume2, VolumeX, Maximize,
  ChevronLeft, ChevronRight, Bell, Users, Star, Bookmark, Download,
  Church, Moon, BookOpen, Crown, Flame, Sparkles, Radio as RadioIcon, X,
  type LucideIcon,
} from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import LiveOffering from '@/components/features/giving/LiveOffering'
import ShareButtons from '@/components/ui/ShareButtons'
import toast from 'react-hot-toast'

/** Extrait l'ID YouTube d'une URL ou ID brut. */
function ytId(url?: string): string | null {
  if (!url) return null
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([\w-]{11})/)
  return m ? m[1] : (/^[\w-]{11}$/.test(url) ? url : null)
}

/** Extrait l'ID de playlist YouTube (paramètre list=) d'une URL ou ID brut. */
function ytPlaylistId(url?: string): string | null {
  if (!url) return null
  const m = url.match(/[?&]list=([\w-]+)/)
  return m ? m[1] : (/^PL[\w-]+$/.test(url) ? url : null)
}

/**
 * Programmes réguliers RÉELS suivis EN PLAYLIST embarquée (le membre reste dans
 * Citadelle, aucune sortie YouTube brutale). IDs de playlists officielles CIER.
 */
const PLAYLISTS_PROGRAMMES = [
  { titre: 'Culte de célébration royale', emoji: '⛪', couleur: '#D4AF37', listId: 'PLxNRRXEmUleFrBmQBbULlXkMRLCRUUOCZ' },
  { titre: 'Matinale de prière',          emoji: '🌅', couleur: '#8B5CF6', listId: 'PLxNRRXEmUleEnodeexpNieSFoA6buYIz2' },
  { titre: 'École du Royaume',            emoji: '📖', couleur: '#0EA5E9', listId: 'PLxNRRXEmUleFyJdheYr95byo50Jdvf9SS' },
  { titre: 'Vendredi de Puissance',       emoji: '🔥', couleur: '#EF4444', listId: 'PLxNRRXEmUleE2-_qS8PujnNJYUu2GuFUb' },
]

/** Génère et déclenche le téléchargement d'un fichier .ics (rappel agenda, mobile + desktop). */
function downloadIcs(titre: string, start: Date, durationMin = 90) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  const end = new Date(start.getTime() + durationMin * 60000)
  const uid = `${start.getTime()}-citadelle@cier`
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Citadelle//Lives//FR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${titre.replace(/[\n,;]/g, ' ')}`,
    'DESCRIPTION:Direct Citadelle — rejoignez-nous en ligne.',
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${titre.replace(/[\n,;]/g, ' ')}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  try {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rappel-${titre.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.ics`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch { /* non bloquant */ }
}

const PLATEFORME_ICON: Record<string, LucideIcon> = {
  'CIER Global':         Church,
  'Intercession':        Moon,
  'CFIC':                BookOpen,
  'Jeunesse':            Flame,
  "Femmes d'Exceptions": Crown,
  'Mahanaïm':            Heart,
}
const platIcon = (name: string): LucideIcon => PLATEFORME_ICON[name] ?? Sparkles

// Gabarit neutre (aucun direct fictif). Le direct réel vient de cms_lives.
const LIVE_FALLBACK = {
  titre: 'Aucun direct en cours',
  plateforme: '',
  pasteur: '',
  spectateurs: 0,
  duree: '',
  couleur: '#D4AF37',
  emoji: '⛪',
  description: '',
  youtube_url: '',
  video_url: '',
  cover: '',
}

// Aucun faux commentaire : le chat live réel (Supabase Realtime) arrivera au Lot 4.
type ChatMessage = { id: number; user: string; drapeau: string; msg: string; time: string; couleur: string }
const CHAT_MESSAGES: ChatMessage[] = []

// Aucun replay / programme fictif : tout vient de cms_lives (état chargé en composant).
type ReplayItem = { id: string; titre: string; date: string; duree: string; plateforme: string; emoji: string; couleur: string; views: number; youtube_url?: string; cover?: string }
type AVenirItem = { id: string; titre: string; date: string; heure: string; plateforme: string; emoji: string; couleur: string; prevues: number }

const REACTIONS_LIVE = ['🙌', '🔥', '❤️', '🙏', '✨', '👑']

// Programmes réguliers officiels (heure d'Abidjan / GMT).
const PROGRAMMES_REGULIERS = [
  { titre: 'Culte de célébration royale', jour: 'Dimanche', heure: '10h30' },
  { titre: 'Matinale de prière', jour: 'Mercredi', heure: '05h30' },
  { titre: 'Oracle du Mardi', jour: 'Mardi', heure: '20h30' },
  { titre: 'Vendredi de Puissance', jour: 'Vendredi', heure: '21h00' },
  { titre: 'Batailles de la Nuit', jour: 'Selon programmation', heure: '21h30' },
  { titre: 'Cohorte de prière', jour: 'Jeudi', heure: 'Selon programmation' },
]

export default function LivesPage() {
  const [tab, setTab] = useState<'live' | 'replays' | 'programme'>('live')
  const [chatOpen, setChatOpen] = useState(true)
  const [chatMsg, setChatMsg] = useState('')
  const [messages, setMessages] = useState(CHAT_MESSAGES)
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([])
  const chatRef = useRef<HTMLDivElement>(null)
  const reactionCount = useRef(0)

  // Lecteur intégré (replays + playlists) : le membre reste dans Citadelle.
  const [player, setPlayer] = useState<{ ytId?: string; listId?: string; titre: string } | null>(null)
  // Partage (modale réutilisant le composant ShareButtons).
  const [share, setShare] = useState<{ url: string; titre: string; texte?: string } | null>(null)

  // Données RÉELLES (cms_lives) : direct en cours, replays, programme. Aucun mock.
  const [liveData, setLiveData] = useState<typeof LIVE_FALLBACK | null>(null)
  const [replays, setReplays] = useState<ReplayItem[]>([])
  const [aVenir, setAVenir] = useState<AVenirItem[]>([])
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('cms_lives')
          .select('id, title, description, youtube_url, video_url, cover_url, scheduled_at, is_live, platform, status')
          .in('status', ['live', 'scheduled', 'ended', 'published'])
          .order('scheduled_at', { ascending: false })
        if (cancelled || !data) return
        const fmt = (s?: string) => { if (!s) return ''; try { return new Date(s).toLocaleDateString('fr-FR') } catch { return '' } }
        const hhmm = (s?: string) => { if (!s) return ''; try { return new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }
        const liveRow: any = data.find((d: any) => d.status === 'live' || d.is_live)
        setLiveData(liveRow ? { titre: liveRow.title, plateforme: liveRow.platform || '', pasteur: '', spectateurs: 0, duree: '', couleur: '#D4AF37', emoji: '⛪', description: liveRow.description || '', youtube_url: liveRow.youtube_url || '', video_url: liveRow.video_url || '', cover: liveRow.cover_url || '' } : null)
        // Traçabilité : visionnage réel d'un live (best-effort).
        if (liveRow) {
          try {
            fetch('/api/activity', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
              body: JSON.stringify({ action_type: 'live_view', resource_type: 'live', resource_id: liveRow.id, resource_title: liveRow.title, source: 'live' }),
            })
          } catch { /* non bloquant */ }
        }
        setReplays(data.filter((d: any) => d.status === 'ended' || (d.status === 'published' && (d.youtube_url || d.video_url))).map((d: any) => ({ id: d.id, titre: d.title, date: fmt(d.scheduled_at), duree: '', plateforme: d.platform || '', emoji: '🎬', couleur: '#D4AF37', views: 0, youtube_url: d.youtube_url || d.video_url, cover: d.cover_url || '' })))
        setAVenir(data.filter((d: any) => d.status === 'scheduled').map((d: any) => ({ id: d.id, titre: d.title, date: fmt(d.scheduled_at), heure: hhmm(d.scheduled_at), plateforme: d.platform || '', emoji: '📅', couleur: '#8B5CF6', prevues: 0 })))
      } catch { /* listes vides */ }
    })()
    return () => { cancelled = true }
  }, [])
  const LIVE_EN_COURS = liveData ?? LIVE_FALLBACK
  const hasLive = !!liveData
  // Source vidéo réelle du direct : ID YouTube extrait de l'URL/ID admin, sinon vidéo hébergée.
  const liveYtId = ytId(LIVE_EN_COURS.youtube_url)
  const liveVideoUrl = LIVE_EN_COURS.video_url || ''

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

  // URL publique partageable (le partage ramène vers Citadelle, pas vers YouTube).
  const shareUrl = () => (typeof window !== 'undefined' ? `${window.location.origin}/live` : 'https://chapelleduroyaume.org/live')

  /** « Me rappeler » : rappel agenda (.ics, vrai rappel futur) + confirmation in-app (moteur notif existant). */
  const remind = async (titre: string, dateStr?: string, heure?: string) => {
    if (dateStr) {
      const m = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      const t = (heure || '').match(/(\d{1,2})[:hH](\d{2})/)
      if (m) {
        const dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), t ? Number(t[1]) : 0, t ? Number(t[2]) : 0)
        if (!isNaN(dt.getTime())) downloadIcs(titre, dt)
      }
    }
    try {
      await fetch('/api/member/reminders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          title: `Rappel : ${titre}`,
          body: dateStr ? `Programmé le ${dateStr}${heure ? ` à ${heure}` : ''}` : 'Vous serez alerté au démarrage du direct.',
          href: '/member/dashboard/lives',
        }),
      })
    } catch { /* non bloquant */ }
    toast.success(dateStr ? 'Rappel ajouté à votre agenda 🔔' : 'Rappel activé 🔔')
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

        {tab === 'live' && !hasLive && (
          <div className="card-cinematic text-center py-20">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}>
              <RadioIcon className="w-7 h-7 text-gold" />
            </div>
            <p className="font-cinzel text-lg text-pearl/60">Aucun direct en cours</p>
            <p className="font-inter text-sm text-pearl/30 mt-1">Consultez le programme pour les prochains directs.</p>
          </div>
        )}

        {tab === 'live' && hasLive && (
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
                {/* Lecteur réel : YouTube (depuis l'URL/ID admin), sinon vidéo hébergée, sinon état clair. */}
                {liveYtId ? (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${liveYtId}?rel=0&modestbranding=1`}
                    title={LIVE_EN_COURS.titre}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : liveVideoUrl ? (
                  <video
                    controls
                    poster={LIVE_EN_COURS.cover || undefined}
                    className="absolute inset-0 w-full h-full bg-black"
                    src={liveVideoUrl}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                    {LIVE_EN_COURS.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={LIVE_EN_COURS.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    )}
                    <div className="relative z-10">
                      <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                        style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}>
                        <RadioIcon className="w-7 h-7 text-gold" />
                      </div>
                      <h2 className="font-cinzel text-lg md:text-2xl font-black text-pearl leading-tight">{LIVE_EN_COURS.titre}</h2>
                      <p className="font-inter text-sm text-pearl/40 mt-2">La vidéo de ce direct n'est pas encore disponible.</p>
                    </div>
                  </div>
                )}

                {/* Réactions flottantes (par-dessus le lecteur, sans bloquer les clics) */}
                <div className="absolute bottom-16 left-4 pointer-events-none z-20">
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

                {/* Bouton Chat flottant (n'obstrue pas la vidéo) */}
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter"
                  style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">{chatOpen ? 'Masquer' : 'Chat'}</span>
                </button>
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
                    <button onClick={() => setShare({ url: shareUrl(), titre: LIVE_EN_COURS.titre, texte: LIVE_EN_COURS.description })}
                      className="flex items-center gap-1 hover:text-pearl transition-colors">
                      <Share2 className="w-3.5 h-3.5" /> Partager
                    </button>
                    <button onClick={() => remind(LIVE_EN_COURS.titre)}
                      className="flex items-center gap-1 hover:text-pearl transition-colors">
                      <Bell className="w-3.5 h-3.5" /> Me rappeler
                    </button>
                  </div>
                </div>

                {/* Offrande pendant le direct — MÊME composant que la page publique /live */}
                <div className="mt-4 pt-4 border-t border-pearl/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-cinzel text-sm font-bold text-pearl">Soutenez ce programme</p>
                    <p className="font-inter text-xs text-pearl/40">Faites votre offrande sans quitter le direct — reçu envoyé par email.</p>
                  </div>
                  <LiveOffering programme={LIVE_EN_COURS.titre} />
                </div>
              </motion.div>

              {/* Coming up */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h3 className="font-cinzel text-xs font-bold text-pearl/40 mb-3 uppercase tracking-wider">Prochains Lives</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {aVenir.length === 0 && <p className="text-pearl/30 text-xs font-inter">Aucun live programmé.</p>}
                  {aVenir.map((e) => (
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
                      <button onClick={() => remind(e.titre, e.date, e.heure)}
                        className="w-full py-1.5 rounded-lg text-[10px] font-inter font-semibold transition-all hover:brightness-125"
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

            {replays.length === 0 && (
              <div className="card-cinematic text-center py-16">
                <Tv className="w-7 h-7 mx-auto mb-3 text-gold/40" />
                <p className="font-inter text-sm text-pearl/40">Aucun replay disponible pour le moment.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {replays.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card-royal group cursor-pointer"
                  style={{ transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onClick={() => {
                    const id = ytId(r.youtube_url)
                    if (id) setPlayer({ ytId: id, titre: r.titre })
                    else if (r.youtube_url) window.open(r.youtube_url, '_blank', 'noopener,noreferrer')
                  }}
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
                        {r.cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
                        )}
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
            {/* Programmes réguliers officiels */}
            <div className="card-royal mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gold" />
                <h3 className="font-cinzel text-sm font-bold text-pearl">Programmes réguliers</h3>
                <span className="text-[10px] text-pearl/35 font-inter ml-auto">Heure d&apos;Abidjan (GMT)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PROGRAMMES_REGULIERS.map((p) => (
                  <div key={p.titre} className="flex items-center justify-between gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="min-w-0">
                      <p className="font-inter text-sm font-semibold text-pearl truncate">{p.titre}</p>
                      <p className="font-inter text-[11px] text-pearl/40">{p.jour}</p>
                    </div>
                    <span className="font-cinzel text-sm font-bold text-gold flex-shrink-0">{p.heure}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Programmes en playlist — regardés DANS Citadelle (lecteur intégré, aucune sortie YouTube) */}
            <div className="card-royal mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Tv className="w-4 h-4 text-gold" />
                <h3 className="font-cinzel text-sm font-bold text-pearl">Suivre les programmes</h3>
                <span className="text-[10px] text-pearl/35 font-inter ml-auto">Lecture intégrée</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PLAYLISTS_PROGRAMMES.map((p) => (
                  <button key={p.titre} onClick={() => setPlayer({ listId: p.listId, titre: p.titre })}
                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:-translate-y-0.5"
                    style={{ background: `${p.couleur}10`, border: `1px solid ${p.couleur}25` }}>
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: `${p.couleur}18`, border: `1px solid ${p.couleur}35` }}>{p.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-inter text-sm font-semibold text-pearl truncate">{p.titre}</p>
                      <p className="font-inter text-[11px]" style={{ color: p.couleur }}>Regarder la playlist</p>
                    </div>
                    <Play className="w-4 h-4 flex-shrink-0" style={{ color: p.couleur }} fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>

            <div className="card-royal mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gold" />
                <h3 className="font-cinzel text-sm font-bold text-pearl">Programme des Prochains Lives</h3>
              </div>
              <p className="text-xs text-pearl/35 font-inter">Directs ponctuels programmés par l&apos;équipe.</p>
            </div>
            {aVenir.length === 0 && (
              <div className="card-royal text-center py-12">
                <Calendar className="w-7 h-7 mx-auto mb-3 text-gold/40" />
                <p className="font-inter text-sm text-pearl/40">Aucun live programmé pour le moment.</p>
              </div>
            )}
            {Object.entries(aVenir.reduce<Record<string, AVenirItem[]>>((acc, e) => { (acc[e.date] = acc[e.date] || []).push(e); return acc }, {})).map(([date, items]) => ({ date, items })).map((day) => (
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
                        <button onClick={() => remind(item.titre, item.date, item.heure)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-inter font-semibold flex-shrink-0 transition-all hover:-translate-y-0.5"
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

        {/* Lecteur intégré (replays + playlists) — le membre reste dans Citadelle */}
        <AnimatePresence>
          {player && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPlayer(null)}
              className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl rounded-3xl overflow-hidden border border-gold/25 bg-abyss"
                style={{ aspectRatio: '16/9' }}>
                <button onClick={() => setPlayer(null)} aria-label="Fermer"
                  className="absolute top-3 right-3 z-10 w-9 h-9 rounded-xl flex items-center justify-center bg-black/55 border border-pearl/15 text-pearl/80 hover:text-pearl">
                  <X className="w-4 h-4" />
                </button>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={player.listId
                    ? `https://www.youtube.com/embed/videoseries?list=${player.listId}&rel=0&modestbranding=1`
                    : `https://www.youtube.com/embed/${player.ytId}?rel=0&modestbranding=1&autoplay=1`}
                  title={player.titre}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Partage — réutilise le composant ShareButtons (acquis) */}
        <AnimatePresence>
          {share && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShare(null)}
              className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md rounded-3xl overflow-hidden border border-gold/25 bg-abyss p-6">
                <button onClick={() => setShare(null)} aria-label="Fermer"
                  className="absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-pearl/15 text-pearl/80 hover:text-pearl">
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-cinzel text-base font-bold text-pearl mb-1 pr-8">Partager</h3>
                <p className="font-inter text-xs text-pearl/45 mb-4">{share.titre}</p>
                <ShareButtons url={share.url} title={share.titre} text={share.texte} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
