'use client'
/**
 * LiveHubClient — expérience Live publique (/live) alimentée par `cms_lives`.
 *
 * Reçoit des données DÉJÀ normalisées (Phase 1A : normalizeLive/resolveLiveState/
 * partitionLives/computeNextLive) côté serveur — aucune logique de dates ni de
 * classification ici. Se limite à l'interactivité client :
 *   - onglets DIRECT / REPLAYS ;
 *   - lecteur intégré (VideoPlayerShell) pour le direct et les replays (plus de
 *     lien externe target=_blank, plus d'iframe YouTube dupliquée) ;
 *   - chat de direct (état local — le temps réel Supabase relève d'un lot ultérieur) ;
 *   - offrande en direct (acquis préservé : LiveOffering).
 *
 * États couverts : LIVE_NOW · UPCOMING · REPLAY · EMPTY.
 */
import { useState, useRef, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Heart, Send, MessageCircle, Radio, Play, Clock, X, CalendarClock, ListVideo } from 'lucide-react'
import LiveOffering from '@/components/features/giving/LiveOffering'
import { scheduleLabel, type NormalizedLive, type LiveProgram } from '@/lib/live'
import { LiveHero } from './LiveHero'
import { UpcomingLiveCard } from './UpcomingLiveCard'
import { ReplayCard } from './ReplayCard'
import { VideoPlayerShell } from '@/components/video'

export interface LiveHubClientProps {
  liveNow: NormalizedLive | null
  nextLive: NormalizedLive | null
  upcoming: NormalizedLive[]
  replays: NormalizedLive[]
  hasAny: boolean
  /** Programmation RÉGULIÈRE (live_programs). N'affirme jamais « EN DIRECT » — cf. cms_lives pour les états réels. */
  programs?: LiveProgram[]
}

const REACTIONS = ['🙏', '🔥', '❤️', '✨', '🙌', '💫', '👑', '⚡']

interface ChatMsg { id: number; nom: string; message: string; type: 'message' | 'reaction' }

export function LiveHubClient({ liveNow, nextLive, upcoming, replays, hasAny, programs = [] }: LiveHubClientProps) {
  const [tab, setTab] = useState<'live' | 'replays'>('live')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [reactionsVisible, setReactionsVisible] = useState(false)
  const [activeReplay, setActiveReplay] = useState<NormalizedLive | null>(null)
  const [activePlaylist, setActivePlaylist] = useState<{ titre: string; embedUrl: string } | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // A11y : fermeture des lecteurs modaux au clavier (Échap).
  useEffect(() => {
    if (!activeReplay && !activePlaylist) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActiveReplay(null); setActivePlaylist(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeReplay, activePlaylist])

  // Mise en avant : un direct en cours prime sur le prochain rendez-vous.
  const heroLive = liveNow ?? nextLive
  // On évite d'afficher deux fois l'élément déjà mis en avant dans la grille « À venir ».
  const upcomingRail = upcoming.filter((u) => !heroLive || u.id !== heroLive.id || heroLive.state === 'live')
  const offeringProgram = heroLive?.title || 'Culte en direct'
  const isLiveActive = liveNow !== null

  const sendMessage = (e: FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim()) return
    setMessages((prev) => [...prev, { id: Date.now(), nom: 'Vous', message: chatMessage, type: 'message' }])
    setChatMessage('')
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const sendReaction = (reaction: string) => {
    setMessages((prev) => [...prev, { id: Date.now(), nom: 'Vous', message: reaction, type: 'reaction' }])
    setReactionsVisible(false)
  }

  return (
    <div className="min-h-screen bg-abyss pt-20">
      {/* Barre d'onglets */}
      <div className="border-b border-pearl/5">
        <div className="container-royal py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(['live', 'replays'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`font-cinzel text-sm font-semibold transition-all px-2 py-2 border-b-2 ${
                  tab === t ? 'text-gold border-gold' : 'text-pearl/40 border-transparent hover:text-pearl/70'
                }`}
              >
                <span className="flex items-center gap-2">
                  {t === 'live' ? <Radio className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {t === 'live' ? 'DIRECT & LIVE' : 'REPLAYS'}
                </span>
              </button>
            ))}
          </div>
          {isLiveActive && (
            <div className="flex items-center gap-1.5 text-xs text-gold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
              <span className="font-inter">En direct maintenant</span>
            </div>
          )}
        </div>
      </div>

      {/* Onglet DIRECT */}
      {tab === 'live' && (
        <div className="container-royal py-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="xl:col-span-2">
              {heroLive ? (
                <LiveHero live={heroLive} />
              ) : (
                // État EMPTY : aucun direct en cours ni programmé exploitable.
                <div
                  className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-royal/20 to-abyss border border-pearl/10 flex flex-col items-center justify-center text-center p-8"
                  style={{ aspectRatio: '16/9' }}
                >
                  <div className="w-20 h-20 rounded-3xl bg-pearl/5 flex items-center justify-center text-3xl mb-4" aria-hidden>⛪</div>
                  <h2 className="font-cinzel text-xl font-bold text-pearl mb-2">Pas de Live en ce moment</h2>
                  <p className="text-pearl/50 font-inter text-sm mb-6 max-w-sm">
                    Le prochain culte en direct sera annoncé ici. Consultez le programme des cultes.
                  </p>
                  <div className="badge-gold inline-flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Programmes réguliers — voir l&apos;agenda
                  </div>
                </div>
              )}

              {/* Lien Mur de prière (acquis) */}
              <div className="mt-4 flex items-center justify-end">
                <a href="/priere" className="badge-royal inline-flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" /> Mur de prière
                </a>
              </div>

              {/* Offrande en direct (acquis préservé) */}
              <div className="mt-4 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-cinzel text-sm font-bold text-pearl">Soutenez ce programme</p>
                  <p className="font-inter text-xs text-pearl/45">
                    Faites votre offrande pendant le direct — un reçu vous est envoyé par email.
                  </p>
                </div>
                <LiveOffering programme={offeringProgram} />
              </div>

              {/* À VENIR — prochains rendez-vous programmés */}
              {upcomingRail.length > 0 && (
                <section className="mt-8">
                  <h2 className="font-cinzel text-lg font-bold text-pearl mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gold" aria-hidden /> À venir
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {upcomingRail.map((live) => (
                      <UpcomingLiveCard key={live.id ?? live.title} live={live} />
                    ))}
                  </div>
                </section>
              )}

              {/* RENDEZ-VOUS RÉGULIERS — programmation permanente (live_programs).
                  N'affirme JAMAIS « EN DIRECT » : simple repère d'horaire habituel,
                  distinct des occurrences réelles cms_lives affichées ci-dessus. */}
              {programs.length > 0 && (
                <section className="mt-8">
                  <h2 className="font-cinzel text-lg font-bold text-pearl mb-1 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-gold" aria-hidden /> Rendez-vous réguliers
                  </h2>
                  <p className="font-inter text-xs text-pearl/40 mb-4">Programmation habituelle — les directs et replays réels apparaissent ci-dessus.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {programs.map((p) => {
                      const label = scheduleLabel(p)
                      return (
                        <div key={p.slug} className="rounded-2xl border border-pearl/[0.06] bg-pearl/[0.02] p-3">
                          <p className="font-cinzel text-sm font-bold text-pearl">{p.title}</p>
                          {label && (
                            <p className="mt-1 inline-flex items-center gap-1.5 font-inter text-[11px]" style={{ color: 'rgba(245,230,216,0.45)' }}>
                              <Clock className="w-3 h-3 text-gold/70" aria-hidden /> {label}
                            </p>
                          )}
                          {p.playlistEmbedUrl && (
                            <button
                              type="button"
                              onClick={() => setActivePlaylist({ titre: p.title, embedUrl: p.playlistEmbedUrl! })}
                              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-inter font-semibold transition-all hover:-translate-y-0.5"
                              style={{ background: 'rgba(212,175,55,0.12)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.3)' }}
                            >
                              <ListVideo className="w-3.5 h-3.5" aria-hidden /> Voir la playlist
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* Chat de direct (acquis : état local, temps réel = lot ultérieur) */}
            <div className="flex flex-col h-[60vh] min-h-[360px] xl:h-[600px] rounded-3xl border border-pearl/10 overflow-hidden bg-pearl/[0.02]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-pearl/5">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-gold" aria-hidden />
                  <h3 className="font-cinzel text-xs font-bold text-pearl">Chat en Direct</h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-pearl/30">
                  <Users className="w-3 h-3" aria-hidden />
                  <span>{isLiveActive ? 'Ouvert' : 'Bientôt'}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                {messages.length === 0 && (
                  <p className="text-center text-pearl/30 text-xs font-inter py-10">
                    Le chat s&apos;anime pendant les directs. Soyez le premier à écrire un message.
                  </p>
                )}
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs font-inter ${msg.type === 'reaction' ? 'text-center text-2xl' : ''}`}
                  >
                    {msg.type === 'message' ? (
                      <>
                        <span className="font-semibold text-pearl/80">{msg.nom}</span>{' '}
                        <span className="text-pearl/60">{msg.message}</span>
                      </>
                    ) : (
                      msg.message
                    )}
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-pearl/5">
                <AnimatePresence>
                  {reactionsVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="grid grid-cols-8 gap-1 mb-2"
                    >
                      {REACTIONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => sendReaction(r)}
                          className="text-lg hover:scale-125 transition-transform"
                          aria-label={`Envoyer la réaction ${r}`}
                        >
                          {r}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={sendMessage} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReactionsVisible((v) => !v)}
                    className="w-9 h-9 rounded-lg bg-pearl/5 hover:bg-pearl/10 flex items-center justify-center text-base flex-shrink-0 transition-colors"
                    aria-label="Choisir une réaction"
                  >
                    😊
                  </button>
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Écrire un message..."
                    aria-label="Message du chat"
                    className="flex-1 bg-pearl/5 border border-pearl/10 rounded-xl px-3 py-2 text-xs text-pearl placeholder-pearl/30 focus:outline-none focus:border-gold/30"
                  />
                  <button
                    type="submit"
                    className="w-9 h-9 rounded-lg bg-gold/20 border border-gold/30 hover:bg-gold/30 flex items-center justify-center flex-shrink-0 transition-colors"
                    aria-label="Envoyer le message"
                  >
                    <Send className="w-3.5 h-3.5 text-gold" aria-hidden />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet REPLAYS */}
      {tab === 'replays' && (
        <div className="container-royal py-8">
          <h2 className="font-cinzel text-2xl font-bold text-pearl mb-8">Replays &amp; Archives</h2>
          {replays.length === 0 ? (
            <div className="card-royal p-12 text-center">
              <Play className="w-8 h-8 mx-auto mb-3 text-gold/40" aria-hidden />
              <p className="font-cinzel text-lg text-pearl/60 mb-1">Aucun replay disponible pour le moment</p>
              <p className="font-inter text-sm text-pearl/35">
                Les rediffusions des cultes apparaîtront ici après leur diffusion.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {replays.map((replay) => (
                <ReplayCard key={replay.id ?? replay.title} live={replay} onOpen={() => setActiveReplay(replay)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lecteur modal de replay (intégré — remplace l'ancien lien externe) */}
      <AnimatePresence>
        {activeReplay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            style={{ background: 'rgba(5,3,8,0.9)' }}
            role="dialog"
            aria-modal="true"
            aria-label={`Replay : ${activeReplay.title}`}
            onClick={() => setActiveReplay(null)}
          >
            <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-cinzel text-sm md:text-base font-bold text-pearl line-clamp-1">{activeReplay.title}</h3>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setActiveReplay(null)}
                  className="w-9 h-9 rounded-full bg-pearl/5 hover:bg-pearl/10 flex items-center justify-center flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  aria-label="Fermer le lecteur"
                >
                  <X className="w-4 h-4 text-pearl" aria-hidden />
                </button>
              </div>
              <VideoPlayerShell source={activeReplay.source} title={activeReplay.title} poster={activeReplay.thumbnailUrl} autoPlay />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lecteur modal de playlist (rendez-vous réguliers) — pas d'autoplay ⇒ Échap fiable. */}
      <AnimatePresence>
        {activePlaylist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            style={{ background: 'rgba(5,3,8,0.9)' }}
            role="dialog"
            aria-modal="true"
            aria-label={`Playlist : ${activePlaylist.titre}`}
            onClick={() => setActivePlaylist(null)}
          >
            <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-cinzel text-sm md:text-base font-bold text-pearl line-clamp-1">{activePlaylist.titre}</h3>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setActivePlaylist(null)}
                  className="w-9 h-9 rounded-full bg-pearl/5 hover:bg-pearl/10 flex items-center justify-center flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  aria-label="Fermer le lecteur"
                >
                  <X className="w-4 h-4 text-pearl" aria-hidden />
                </button>
              </div>
              <div className="relative w-full overflow-hidden rounded-2xl bg-[#05050a]" style={{ aspectRatio: '16/9' }}>
                <iframe className="absolute inset-0 w-full h-full" src={activePlaylist.embedUrl} title={activePlaylist.titre} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default LiveHubClient
