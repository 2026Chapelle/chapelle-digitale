'use client'
/**
 * MemberLiveClient — espace membre Live/Vidéo, alimenté par la MÊME source
 * canonique `cms_lives` que /live (données déjà normalisées côté serveur via
 * `loadLiveHubData`). Aucune logique de dates/classification ici : les états
 * LIVE_NOW / UPCOMING / REPLAY / EMPTY proviennent du domaine partagé.
 *
 * Valeur additionnelle MEMBRE (acquis préservés) : chat, réactions, rappels
 * agenda (.ics + notification), partage (ShareButtons), traçabilité de
 * visionnage (live_view), offrande en direct, lecteur intégré (replays).
 *
 * Le contenu LEGACY (playlists YouTube officielles + programmes récurrents) est
 * importé depuis ./legacy-content et affiché SÉPARÉMENT — jamais présenté comme
 * un enregistrement Live canonique. cf. GO Phase 1D.
 *
 * Player & YouTube : VideoPlayerShell + helpers @/lib/video UNIQUEMENT (aucune
 * regex YouTube locale, aucune iframe dupliquée).
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Clock, Eye, Calendar, Tv, Heart, MessageSquare, Send, Share2,
  Bell, Users, Bookmark, Church, Moon, BookOpen, Crown, Flame, Sparkles,
  Radio as RadioIcon, X, type LucideIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { NormalizedLive } from '@/lib/live'
import { youtubePlaylistEmbedUrl, type ResolvedVideoSource } from '@/lib/video'
import { VideoPlayerShell } from '@/components/video'
import LiveOffering from '@/components/features/giving/LiveOffering'
import ShareButtons from '@/components/ui/ShareButtons'
import { LEGACY_PLAYLISTS_PROGRAMMES, LEGACY_PROGRAMMES_REGULIERS } from './legacy-content'

export interface MemberLiveClientProps {
  liveNow: NormalizedLive | null
  nextLive: NormalizedLive | null
  upcoming: NormalizedLive[]
  replays: NormalizedLive[]
  hasAny: boolean
}

const REACTIONS_LIVE = ['🙌', '🔥', '❤️', '🙏', '✨', '👑']

const PLATEFORME_ICON: Record<string, LucideIcon> = {
  'CIER Global': Church,
  'Intercession': Moon,
  'CFIC': BookOpen,
  'Jeunesse': Flame,
  "Femmes d'Exceptions": Crown,
  'Mahanaïm': Heart,
}
const platIcon = (name?: string | null): LucideIcon => (name && PLATEFORME_ICON[name]) || Sparkles

type ChatMessage = { id: number; user: string; msg: string; time: string }
type PlayerState =
  | { kind: 'video'; source: ResolvedVideoSource; titre: string }
  | { kind: 'playlist'; listId: string; titre: string }
  | null

/** Date FR longue (« Dimanche 24 août, 10:30 »), ou '' si absente. */
function fmtLong(d: Date | null): string {
  if (!d) return ''
  try {
    const s = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(d)
    return s.charAt(0).toUpperCase() + s.slice(1)
  } catch { return '' }
}
/** Date FR courte (« 24 août 2026 »), ou '' si absente. */
function fmtDate(d: Date | null): string {
  if (!d) return ''
  try { return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d) } catch { return '' }
}
function fmtTime(d: Date | null): string {
  if (!d) return ''
  try { return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d) } catch { return '' }
}

/** Génère et déclenche le téléchargement d'un .ics (rappel agenda). */
function downloadIcs(titre: string, start: Date, durationMin = 90) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  const end = new Date(start.getTime() + durationMin * 60000)
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Citadelle//Lives//FR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${start.getTime()}-citadelle@cier`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${titre.replace(/[\n,;]/g, ' ')}`, 'DESCRIPTION:Direct Citadelle — rejoignez-nous en ligne.',
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

export function MemberLiveClient({ liveNow, nextLive, upcoming, replays, hasAny }: MemberLiveClientProps) {
  void nextLive; void hasAny
  const [tab, setTab] = useState<'live' | 'replays' | 'programme'>('live')
  const [chatOpen, setChatOpen] = useState(true)
  const [chatMsg, setChatMsg] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<{ id: number; emoji: string; x: number }[]>([])
  const [player, setPlayer] = useState<PlayerState>(null)
  const [share, setShare] = useState<{ url: string; titre: string; texte?: string } | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const reactionCount = useRef(0)

  const hasLive = liveNow !== null

  // Traçabilité : visionnage réel d'un direct (best-effort, membre authentifié).
  useEffect(() => {
    if (!liveNow?.id) return
    try {
      fetch('/api/activity', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ action_type: 'live_view', resource_type: 'live', resource_id: liveNow.id, resource_title: liveNow.title, source: 'live' }),
      })
    } catch { /* non bloquant */ }
  }, [liveNow?.id, liveNow?.title])

  // A11y : fermeture des modales au clavier (Échap).
  useEffect(() => {
    if (!player && !share) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPlayer(null); setShare(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, share])

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, [messages])

  const sendMessage = () => {
    if (!chatMsg.trim()) return
    setMessages((prev) => [...prev, { id: Date.now(), user: 'Vous', msg: chatMsg, time: fmtTime(new Date()) }])
    setChatMsg('')
  }
  const sendReaction = (emoji: string) => {
    const id = reactionCount.current++
    setReactions((prev) => [...prev, { id, emoji, x: Math.random() * 80 + 10 }])
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2000)
  }
  const shareUrl = () => (typeof window !== 'undefined' ? `${window.location.origin}/live` : 'https://chapelleduroyaume.org/live')

  /** « Me rappeler » : .ics (si date connue) + notification in-app (moteur existant). */
  const remind = async (titre: string, when?: Date | null) => {
    if (when && !Number.isNaN(when.getTime())) downloadIcs(titre, when)
    try {
      await fetch('/api/member/reminders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          title: `Rappel : ${titre}`,
          body: when ? `Programmé le ${fmtLong(when)}` : 'Vous serez alerté au démarrage du direct.',
          href: '/member/dashboard/lives',
        }),
      })
    } catch { /* non bloquant */ }
    toast.success(when ? 'Rappel ajouté à votre agenda 🔔' : 'Rappel activé 🔔')
  }

  return (
    <div className="min-h-screen pt-20 pb-8 bg-abyss">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 pt-4">
          {[
            { key: 'live', label: 'Live maintenant', live: true },
            { key: 'replays', label: 'Replays', live: false },
            { key: 'programme', label: 'Programme', live: false },
          ].map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key as typeof tab)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-inter font-medium transition-all"
              style={{
                background: tab === t.key ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                color: tab === t.key ? '#D4AF37' : 'rgba(255,255,255,0.5)',
                border: `1px solid ${tab === t.key ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.07)'}`,
              }}>
              {t.live && hasLive && (
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-70 animate-ping" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-red-500" />
                </span>
              )}
              {t.label}
            </button>
          ))}
          {hasLive && (
            <div className="ml-auto flex items-center gap-1.5 text-sm text-gold font-inter">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
              <span className="hidden sm:inline">En direct maintenant</span>
            </div>
          )}
        </div>

        {/* ---- Onglet LIVE ---- */}
        {tab === 'live' && !hasLive && (
          <div className="card-cinematic text-center py-20">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}>
              <RadioIcon className="w-7 h-7 text-gold" />
            </div>
            <p className="font-cinzel text-lg text-pearl/60">Aucun direct en cours</p>
            <p className="font-inter text-sm text-pearl/30 mt-1">Consultez le programme pour les prochains directs.</p>
          </div>
        )}

        {tab === 'live' && hasLive && liveNow && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {/* Lecteur réel (VideoPlayerShell — YouTube/fichier, aucune iframe dupliquée) */}
              <div className="relative rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #050010 0%, #120028 50%, #050010 100%)' }}>
                <VideoPlayerShell source={liveNow.source} title={liveNow.title} poster={liveNow.thumbnailUrl} autoPlay className="!rounded-3xl" />
                <div className="absolute bottom-16 left-4 pointer-events-none z-20">
                  <AnimatePresence>
                    {reactions.map((r) => (
                      <motion.div key={r.id} initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -120, scale: 1.5 }} exit={{ opacity: 0 }} transition={{ duration: 2, ease: 'easeOut' }} className="absolute text-2xl" style={{ left: `${r.x}%` }}>
                        {r.emoji}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <button type="button" onClick={() => setChatOpen(!chatOpen)} className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
                  <MessageSquare className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">{chatOpen ? 'Masquer' : 'Chat'}</span>
                </button>
              </div>

              {/* Info bar */}
              <div className="card-royal">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-inter text-red-400 font-bold">EN DIRECT</span>
                      {liveNow.platform && (<><span className="text-xs text-pearl/30">·</span><span className="text-xs text-pearl/40 font-inter">{liveNow.platform}</span></>)}
                    </div>
                    <h2 className="font-cinzel text-base font-bold text-pearl mb-1">{liveNow.title}</h2>
                    {liveNow.description && <p className="text-xs text-pearl/45 font-inter">{liveNow.description}</p>}
                  </div>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    {(() => { const Icon = platIcon(liveNow.platform); return (
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.09)', border: '1px solid rgba(212,175,55,0.2)' }}>
                        <Icon className="w-4 h-4 text-gold" />
                      </div>
                    ) })()}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-pearl/[0.05]">
                  <span className="text-xs text-pearl/30 font-inter mr-1">Réagir :</span>
                  {REACTIONS_LIVE.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => sendReaction(emoji)} aria-label={`Réagir ${emoji}`} className="text-xl p-1 leading-none hover:scale-125 transition-transform active:scale-95">{emoji}</button>
                  ))}
                  <div className="ml-auto flex items-center gap-3 text-xs text-pearl/30 font-inter">
                    <button type="button" onClick={() => setShare({ url: shareUrl(), titre: liveNow.title, texte: liveNow.description ?? undefined })} className="flex items-center gap-1 py-1.5 px-1.5 -my-1 hover:text-pearl transition-colors">
                      <Share2 className="w-3.5 h-3.5" /> Partager
                    </button>
                    <button type="button" onClick={() => remind(liveNow.title)} className="flex items-center gap-1 py-1.5 px-1.5 -my-1 hover:text-pearl transition-colors">
                      <Bell className="w-3.5 h-3.5" /> Me rappeler
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-pearl/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-cinzel text-sm font-bold text-pearl">Soutenez ce programme</p>
                    <p className="font-inter text-xs text-pearl/40">Faites votre offrande sans quitter le direct — reçu envoyé par email.</p>
                  </div>
                  <LiveOffering programme={liveNow.title} />
                </div>
              </div>

              {/* Prochains Lives (cms_lives) */}
              <div>
                <h3 className="font-cinzel text-xs font-bold text-pearl/40 mb-3 uppercase tracking-wider">Prochains Lives</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {upcoming.length === 0 && <p className="text-pearl/30 text-xs font-inter">Aucun live programmé.</p>}
                  {upcoming.map((e) => (
                    <div key={e.id ?? e.title} className="p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">📅</span>
                        <div className="min-w-0">
                          <p className="font-inter text-xs font-semibold text-pearl leading-tight truncate">{e.title}</p>
                          <p className="text-[10px] text-pearl/30 font-inter">{fmtLong(e.scheduledAt)}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => remind(e.title, e.scheduledAt)} className="w-full py-1.5 rounded-lg text-[10px] font-inter font-semibold transition-all hover:brightness-125" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                        Me rappeler
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat (acquis : local ; temps réel = lot ultérieur) */}
            <AnimatePresence>
              {chatOpen && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col rounded-3xl overflow-hidden h-[60vh] min-h-[360px] lg:h-[680px]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-pearl/[0.06]">
                    <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-gold" /><span className="font-cinzel text-sm font-bold text-pearl">Chat Live</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-[10px] text-pearl/30 font-inter">Ouvert</span></div>
                  </div>
                  <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
                    {messages.length === 0 && <p className="text-center text-pearl/30 text-xs font-inter py-8">Le chat s&apos;anime pendant les directs.</p>}
                    {messages.map((m) => (
                      <div key={m.id} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5" style={{ background: '#D4AF37' }}>{m.user[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5"><span className="text-[10px] font-semibold font-inter text-gold">{m.user}</span><span className="text-[9px] text-pearl/20 font-inter">{m.time}</span></div>
                          <p className="text-xs font-inter text-pearl/65 leading-relaxed">{m.msg}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-pearl/[0.06]">
                    <div className="flex gap-2 mb-2">
                      {['🙌', '🔥', '🙏', '❤️'].map((e) => (<button key={e} type="button" onClick={() => sendReaction(e)} aria-label={`Réagir ${e}`} className="text-base p-1.5 leading-none hover:scale-110 transition-transform">{e}</button>))}
                    </div>
                    <div className="flex gap-2">
                      <input className="flex-1 px-3 py-2 rounded-xl text-xs font-inter text-pearl/80 placeholder-pearl/25 outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} placeholder="Écrire dans le chat..." aria-label="Message du chat" value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} />
                      <button type="button" onClick={sendMessage} aria-label="Envoyer le message" className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all" style={{ background: chatMsg ? 'rgba(212,175,55,0.85)' : 'rgba(255,255,255,0.05)' }}>
                        <Send className="w-3.5 h-3.5" style={{ color: chatMsg ? '#1A0F00' : 'rgba(255,255,255,0.3)' }} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ---- Onglet REPLAYS (cms_lives) ---- */}
        {tab === 'replays' && (
          <div>
            {replays.length === 0 && (
              <div className="card-cinematic text-center py-16">
                <Tv className="w-7 h-7 mx-auto mb-3 text-gold/40" />
                <p className="font-inter text-sm text-pearl/40">Aucun replay disponible pour le moment.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {replays.map((r) => {
                const Icon = platIcon(r.platform)
                const playable = r.source.kind !== 'none'
                return (
                  <div key={r.id ?? r.title} className="card-royal group cursor-pointer" onClick={() => playable && setPlayer({ kind: 'video', source: r.source, titre: r.title })}>
                    <div className="relative rounded-2xl overflow-hidden mb-4 h-36" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(10,0,24,0.95))' }}>
                      {r.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.thumbnailUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-70" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center"><Icon className="w-16 h-16 opacity-15 group-hover:opacity-25 transition-opacity text-gold" /></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: 'rgba(212,175,55,0.4)', backdropFilter: 'blur(4px)' }}>
                          <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-cinzel font-bold text-pearl text-sm mb-1 group-hover:text-gold transition-colors leading-tight line-clamp-2">{r.title}</h3>
                    <div className="flex items-center justify-between text-[11px] text-pearl/35 font-inter mb-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(r.scheduledAt)}</span>
                      {r.platform && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{r.platform}</span>}
                    </div>
                    <div className="flex items-center justify-end">
                      <button type="button" aria-label="Enregistrer" className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-pearl/10 transition-colors" onClick={(ev) => ev.stopPropagation()}>
                        <Bookmark className="w-3.5 h-3.5 text-pearl/30" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ---- Onglet PROGRAMME (cms_lives à venir + LEGACY séparé) ---- */}
        {tab === 'programme' && (
          <div className="space-y-6">
            {/* Directs programmés RÉELS (cms_lives) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-gold" />
                <h3 className="font-cinzel text-sm font-bold text-pearl">Prochains directs</h3>
                <span className="text-[10px] text-pearl/35 font-inter ml-auto">Depuis la programmation Citadelle</span>
              </div>
              {upcoming.length === 0 ? (
                <div className="card-royal text-center py-10">
                  <Calendar className="w-7 h-7 mx-auto mb-3 text-gold/40" />
                  <p className="font-inter text-sm text-pearl/40">Aucun live programmé pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((item) => {
                    const Icon = platIcon(item.platform)
                    return (
                      <div key={item.id ?? item.title} className="card-royal flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.09)', border: '1px solid rgba(212,175,55,0.2)' }}>
                          <Icon className="w-6 h-6 text-gold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-cinzel font-bold text-pearl text-sm mb-1 truncate">{item.title}</h4>
                          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-pearl/40 font-inter">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtLong(item.scheduledAt)}</span>
                            {item.platform && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>{item.platform}</span>}
                          </div>
                        </div>
                        <button type="button" onClick={() => remind(item.title, item.scheduledAt)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-inter font-semibold flex-shrink-0 transition-all hover:-translate-y-0.5" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                          <Bell className="w-3 h-3" /><span className="hidden sm:inline">Rappel</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ⚠️ Contenu HÉRITÉ — NON canonique cms_lives (playlists + récurrence) */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)' }}>
              <p className="text-[10px] font-inter text-pearl/35 uppercase tracking-wider mb-4">Repères hebdomadaires &amp; playlists (indicatif — hors programmation directe)</p>

              <div className="card-royal mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-gold" />
                  <h3 className="font-cinzel text-sm font-bold text-pearl">Programmes réguliers</h3>
                  <span className="text-[10px] text-pearl/35 font-inter ml-auto">Heure d&apos;Abidjan (GMT)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LEGACY_PROGRAMMES_REGULIERS.map((p) => (
                    <div key={p.titre} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="min-w-0"><p className="font-inter text-sm font-semibold text-pearl truncate">{p.titre}</p><p className="font-inter text-[11px] text-pearl/40">{p.jour}</p></div>
                      <span className="font-cinzel text-sm font-bold text-gold flex-shrink-0">{p.heure}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-royal">
                <div className="flex items-center gap-2 mb-3">
                  <Tv className="w-4 h-4 text-gold" />
                  <h3 className="font-cinzel text-sm font-bold text-pearl">Suivre les programmes</h3>
                  <span className="text-[10px] text-pearl/35 font-inter ml-auto">Playlists — lecture intégrée</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LEGACY_PLAYLISTS_PROGRAMMES.map((p) => (
                    <button key={p.titre} type="button" onClick={() => setPlayer({ kind: 'playlist', listId: p.listId, titre: p.titre })} className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:-translate-y-0.5" style={{ background: `${p.couleur}10`, border: `1px solid ${p.couleur}25` }}>
                      <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: `${p.couleur}18`, border: `1px solid ${p.couleur}35` }}>{p.emoji}</span>
                      <div className="min-w-0 flex-1"><p className="font-inter text-sm font-semibold text-pearl truncate">{p.titre}</p><p className="font-inter text-[11px]" style={{ color: p.couleur }}>Regarder la playlist</p></div>
                      <Play className="w-4 h-4 flex-shrink-0" style={{ color: p.couleur }} fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lecteur intégré (replays cms_lives + playlists legacy) */}
        <AnimatePresence>
          {player && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPlayer(null)} className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Lecteur : ${player.titre}`}>
              <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-cinzel text-sm md:text-base font-bold text-pearl line-clamp-1">{player.titre}</h3>
                  <button type="button" autoFocus onClick={() => setPlayer(null)} aria-label="Fermer le lecteur" className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-pearl/15 text-pearl/80 hover:text-pearl flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {player.kind === 'video' ? (
                  // Façade (pas d'autoPlay) : le focus reste sur « Fermer », Échap fonctionne
                  // de façon fiable tant que l'iframe YouTube n'a pas capté le focus au clic Lecture.
                  <VideoPlayerShell source={player.source} title={player.titre} />
                ) : (
                  <div className="relative w-full overflow-hidden rounded-2xl bg-[#05050a]" style={{ aspectRatio: '16/9' }}>
                    {/* Playlist legacy : pas d'autoplay → le focus ne part pas dans l'iframe,
                        Échap reste fiable jusqu'à la lecture. Fermeture aussi par bouton/arrière-plan. */}
                    <iframe className="absolute inset-0 w-full h-full" src={youtubePlaylistEmbedUrl(player.listId)} title={player.titre} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Partage (ShareButtons — acquis) */}
        <AnimatePresence>
          {share && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShare(null)} className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Partager">
              <div className="relative w-full max-w-md rounded-3xl overflow-hidden border border-gold/25 bg-abyss p-6" onClick={(e) => e.stopPropagation()}>
                <button type="button" autoFocus onClick={() => setShare(null)} aria-label="Fermer" className="absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-pearl/15 text-pearl/80 hover:text-pearl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-cinzel text-base font-bold text-pearl mb-1 pr-8">Partager</h3>
                <p className="font-inter text-xs text-pearl/45 mb-4">{share.titre}</p>
                <ShareButtons url={share.url} title={share.titre} text={share.texte} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MemberLiveClient
