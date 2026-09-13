'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Users, Heart, Radio, Clock } from 'lucide-react'
import LiveOffering from '@/components/features/giving/LiveOffering'
import LivePresenceControls from '@/components/live/LivePresenceControls'
import LiveReactionsProvider from '@/components/live/LiveReactionsProvider'
import LiveReactionControls from '@/components/live/LiveReactionControls'
import LiveReactionAnimationLayer from '@/components/live/LiveReactionAnimationLayer'
import LiveReactionBoundary from '@/components/live/LiveReactionBoundary'
import LiveReplayReactionCounts from '@/components/live/LiveReplayReactionCounts'
import { LIVE_PUBLIC_URL, LIVE_SHARE_TEXT, recordSuccessfulLiveShare } from '@/lib/live/live-share-client'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { resolveLiveState } from '@/lib/home/contextual'

/** Extrait l'ID YouTube d'une URL ou ID brut (source unique avec l'espace membre). */
function ytId(url?: string): string | null {
  if (!url) return null
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([\w-]{11})/)
  return m ? m[1] : (/^[\w-]{11}$/.test(String(url)) ? String(url) : null)
}


interface Replay { id: string; titre: string; date: string; speaker: string; url: string; cover?: string }

type UpcomingLive = {
  titre: string
  date: string
  heure: string
  scheduled_at: string
  plateforme: string
}

const LIVE_POLL_INTERVAL_MS = 15_000

export default function LivePage() {
  const [tab, setTab] = useState<'live' | 'replays'>('live')

  // Direct RÉEL depuis cms_lives — MÊME source que l'espace membre (source unique).
  const [live, setLive] = useState<{ titre: string; description: string; youtube_url: string; video_url: string; cover: string; plateforme: string } | null>(null)
  const [replays, setReplays] = useState<Replay[]>([])
  const [replayPlayer, setReplayPlayer] = useState<Replay | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingLive[]>([])
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('cms_lives')
          .select('id, title, description, youtube_url, video_url, cover_url, platform, is_live, status, created_at, scheduled_at')
          .in('status', ['live', 'scheduled', 'ended', 'published'])
        if (cancelled || !data) return
        const canonicalResponse = await fetch('/api/live/canonical', { cache: 'no-store' }).catch(() => null)
        const canonicalPayload = canonicalResponse?.ok ? await canonicalResponse.json().catch(() => null) : null
        const canonical = canonicalPayload?.state || resolveLiveState(data as any[])
        const canonicalTitle = canonical.status === 'LIVE' ? canonical.title : null
        const row: any = canonical.status === 'LIVE'
          ? data.find((d: any) => d.title === canonicalTitle && (d.youtube_url || d.video_url))
          : null
        if (canonical.status === 'LIVE' && canonicalTitle) setLive({ titre: canonicalTitle, description: row?.description || '', youtube_url: row?.youtube_url || (canonical.youtubeVideoId ? `https://www.youtube.com/watch?v=${canonical.youtubeVideoId}` : ''), video_url: row?.video_url || '', cover: row?.cover_url || canonical.thumbnail || '', plateforme: row?.platform || 'YouTube' })
        // Replays RÉELS : rediffusions terminées/publiées disposant d'une vidéo.
        const replayRows = (data as any[])
          .filter(
            (d) =>
              (d.status === 'ended' || d.status === 'published') &&
              (d.youtube_url || d.video_url)
          )
          .sort((a, b) => {
            const aDate = a.scheduled_at || a.created_at
            const bDate = b.scheduled_at || b.created_at

            const aTime = aDate
              ? new Date(aDate).getTime()
              : 0

            const bTime = bDate
              ? new Date(bDate).getTime()
              : 0

            return bTime - aTime
          })

        const reps: Replay[] = replayRows.map((d) => ({
          id: d.id,
          titre: d.title || 'Rediffusion',
          date: d.scheduled_at || d.created_at
            ? new Date(d.scheduled_at || d.created_at).toLocaleDateString(
                'fr-FR',
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }
              )
            : '',
          speaker: d.platform || '',
          url: d.youtube_url || d.video_url || '',
          cover:
            d.cover_url ||
            (ytId(d.youtube_url)
              ? `https://i.ytimg.com/vi/${ytId(d.youtube_url)}/hqdefault.jpg`
              : ''),
        }))

        setReplays(reps)

        const now = Date.now()

        const futureLives: UpcomingLive[] = (data as any[])
          .filter((d) => {
            if (d.status !== 'scheduled' || !d.scheduled_at) {
              return false
            }

            const time = new Date(d.scheduled_at).getTime()

            return Number.isFinite(time) && time > now
          })
          .sort(
            (a, b) =>
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime()
          )
          .slice(0, 3)
          .map((d) => {
            const scheduled = new Date(d.scheduled_at)

            return {
              titre: d.title || 'Prochain direct',
              date: scheduled.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }),
              heure: scheduled.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              scheduled_at: d.scheduled_at,
              plateforme: d.platform || '',
            }
          })

        setUpcoming(futureLives)
      } catch { /* pas de direct */ }
    })()
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    let cancelled = false

    const refreshCanonicalLive = async () => {
      const canonicalResponse = await fetch('/api/live/canonical', {
        cache: 'no-store',
      }).catch(() => null)

      if (!canonicalResponse?.ok || cancelled) return

      const canonicalPayload = await canonicalResponse
        .json()
        .catch(() => null)

      if (cancelled) return

      const canonical = canonicalPayload?.state
      if (!canonical) return

      if (canonical.status === 'LIVE' && canonical.title) {
        setLive({
          titre: canonical.title,
          description: '',
          youtube_url: canonical.youtubeVideoId
            ? `https://www.youtube.com/watch?v=${canonical.youtubeVideoId}`
            : '',
          video_url: '',
          cover: canonical.thumbnail || '',
          plateforme: 'YouTube',
        })
        return
      }

      setLive(null)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshCanonicalLive()
    }

    const pollId = window.setInterval(refreshCanonicalLive, LIVE_POLL_INTERVAL_MS)

    window.addEventListener('focus', refreshCanonicalLive)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
      window.removeEventListener('focus', refreshCanonicalLive)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
  useEffect(() => {
    const handleLivePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload()
      }
    }

    window.addEventListener('pageshow', handleLivePageShow)

    return () => {
      window.removeEventListener('pageshow', handleLivePageShow)
    }
  }, [])
  const liveYt = ytId(live?.youtube_url)
  const nextLive = upcoming[0] ?? null
  const latestReplay = replays[0] ?? null


  const shareLive = async () => {
    if (typeof window === 'undefined') return

    const url = LIVE_PUBLIC_URL

    try {
      if (navigator.share) {
        await navigator.share({
          title: live?.titre || 'Citadelle — Chapelle Royale TV',
          text: LIVE_SHARE_TEXT,
          url,
        })

        await recordSuccessfulLiveShare(
          'native_share',
        )

        return
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)

        await recordSuccessfulLiveShare(
          'copy_link',
        )
      }
    } catch {
      // Annulation ou échec navigateur :
      // aucune action de partage n'est enregistrée.
    }
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
              <span className="font-inter">{live ? 'En direct' : 'Maison ouverte'}</span>
            </div>
          </div>
        </div>
      </div>

      {tab === 'live' && (
        <div className="container-royal py-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Video player */}
            <div className="xl:col-span-2">
              {/* Lecteur RÉEL (cms_lives) : YouTube → vidéo hébergée → état hors-ligne. */}
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-royal/20 to-abyss border border-pearl/10"
                style={{ aspectRatio: '16/9' }}>
                {liveYt ? (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${liveYt}?rel=0&modestbranding=1`}
                    title={live?.titre || 'Direct'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : live?.video_url ? (
                  <video controls poster={live.cover || undefined} className="absolute inset-0 w-full h-full bg-black" src={live.video_url} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 rounded-3xl bg-pearl/5 flex items-center justify-center text-3xl mb-4">⛪</div>
                    <h2 className="font-cinzel text-xl font-bold text-pearl mb-2">Pas de Live en ce moment</h2>
                    <p className="text-pearl/50 font-inter text-sm mb-6 max-w-md">
                  Il n&apos;y a pas de direct en ce moment, mais ton chemin avec Dieu continue.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTab('replays')}
                    className="px-4 py-2 rounded-xl bg-gold/15 border border-gold/25 text-gold text-xs font-inter font-semibold hover:bg-gold/20 transition-colors"
                  >
                    Voir les derniers cultes
                  </button>

                  <a
                    href="/priere"
                    className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-pearl/70 text-xs font-inter font-semibold hover:bg-white/[0.07] transition-colors"
                  >
                    Demander une prière
                  </a>
                </div>
                    <a href="/evenements" data-live-agenda-link="true" className="badge-gold flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-90"><Clock className="w-3.5 h-3.5" /> Programmes réguliers — voir l&apos;agenda</a>
                  </div>
                )}
              </div>

              {/* Video info */}
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-cinzel text-lg font-bold text-pearl mb-1">
                    {live?.titre || 'Cultes en direct'}
                  </h1>
                  <p className="text-pearl/40 text-sm font-inter">
                    {live ? (live.plateforme || 'En direct maintenant') : 'La maison reste ouverte'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a href="/priere" className="badge-royal flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" />
                    Mur de prière
                  </a>
                </div>
              </div>

              {/* Offrande en direct — sans quitter le live */}
              <div className="mt-4 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-cinzel text-sm font-bold text-pearl">Soutenez ce programme</p>
                  <p className="font-inter text-xs text-pearl/45">
                  {live
                    ? 'Tu peux soutenir ce programme sans quitter le direct — un reçu est envoyé par email.'
                    : 'Tu peux soutenir la mission et l’œuvre de Citadelle.'}
                </p>
                </div>
                <LiveOffering programme={live?.titre || 'Citadelle'} />
              </div>
            </div>

            {/* Famille Royale — emplacement du futur chat Realtime */}
            <div className="flex flex-col min-h-[420px] sm:min-h-[470px] xl:min-h-[520px] rounded-2xl sm:rounded-3xl border border-pearl/10 overflow-hidden bg-pearl/[0.02]">
              <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-pearl/[0.06] bg-gradient-to-r from-gold/[0.05] to-transparent">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gold/10 border border-gold/20">
                      <Users className="w-4 h-4 text-gold" />
                    </div>

                    <div>
                      <h3 className="font-cinzel text-sm font-bold text-pearl">
                        Famille Royale
                      </h3>

                      <p className="font-inter text-[11px] text-pearl/35 mt-0.5">
                        {live
                          ? 'Nous vivons ce culte ensemble.'
                          : 'La maison reste ouverte.'}
                      </p>
                    </div>
                  </div>

                  {live && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-inter font-bold">
                      <span className="relative flex w-1.5 h-1.5">
                        <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-70 animate-ping" />
                        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-red-500" />
                      </span>
                      EN DIRECT
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 sm:p-5 space-y-4 sm:space-y-5">
                {live ? (
                  <>
                    {liveYt && (
                      <LivePresenceControls liveVideoId={liveYt} />
                    )}

                    <LiveReactionsProvider
                      videoId={liveYt}
                      enabled={tab === 'live' && Boolean(liveYt)}
                    >
                      <LiveReactionBoundary>
                        <LiveReactionAnimationLayer />
                      </LiveReactionBoundary>

                      <LiveReactionBoundary>
                        <LiveReactionControls />
                      </LiveReactionBoundary>
                    </LiveReactionsProvider>
                  </>
                ) : (
                  <div className="rounded-2xl border border-gold/15 bg-gold/[0.035] p-4">
                    <p className="font-cinzel text-sm font-bold text-gold">
                      🕊️ La maison reste ouverte
                    </p>

                    <p className="font-inter text-xs text-pearl/45 mt-2 leading-relaxed">
                      Il n&apos;y a pas de direct maintenant, mais tu peux prier, être accompagné et continuer à grandir.
                    </p>
                  </div>
                )}

                <div>
                  <p className="font-cinzel text-[11px] font-bold text-pearl/40 uppercase tracking-[0.14em] mb-3">
                    Je participe au culte
                  </p>

                  <div className="space-y-2">
                    <a
                      href="/priere"
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-pearl/[0.07] bg-pearl/[0.025] hover:border-gold/25 hover:bg-gold/[0.04] transition-all"
                    >
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500/10 text-lg">
                        🙏
                      </span>

                      <div>
                        <p className="font-inter text-sm font-semibold text-pearl">
                          Demander une prière
                        </p>

                        <p className="font-inter text-[11px] text-pearl/35">
                          Confie-nous ton sujet de prière.
                        </p>
                      </div>
                    </a>

                    <a
                      href="/contact"
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-pearl/[0.07] bg-pearl/[0.025] hover:border-gold/25 hover:bg-gold/[0.04] transition-all"
                    >
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-pink-500/10 text-lg">
                        ❤️
                      </span>

                      <div>
                        <p className="font-inter text-sm font-semibold text-pearl">
                          Parler à un pasteur
                        </p>

                        <p className="font-inter text-[11px] text-pearl/35">
                          Tu as besoin d&apos;écoute ou d&apos;accompagnement.
                        </p>
                      </div>
                    </a>

                    <a
                      href="/nouveau-venu"
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-pearl/[0.07] bg-pearl/[0.025] hover:border-gold/25 hover:bg-gold/[0.04] transition-all"
                    >
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-lg">
                        ✝️
                      </span>

                      <div>
                        <p className="font-inter text-sm font-semibold text-pearl">
                          Je veux suivre Jésus
                        </p>

                        <p className="font-inter text-[11px] text-pearl/35">
                          Nous voulons t&apos;accompagner dans cette décision.
                        </p>
                      </div>
                    </a>

                    <a
                      href="/parcours"
                      className="flex items-center gap-3 p-3.5 rounded-2xl border border-gold/15 bg-gold/[0.035] hover:border-gold/30 hover:bg-gold/[0.06] transition-all"
                    >
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-gold/10 text-lg">
                        👑
                      </span>

                      <div>
                        <p className="font-inter text-sm font-semibold text-gold">
                          Continuer à grandir
                        </p>

                        <p className="font-inter text-[11px] text-pearl/35">
                          Découvre ton prochain pas dans Citadelle.
                        </p>
                      </div>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTab('replays')}
                    className="px-3 py-2.5 rounded-xl border border-pearl/[0.08] bg-pearl/[0.025] text-pearl/55 hover:text-pearl transition-colors font-inter text-xs font-semibold"
                  >
                    Derniers cultes
                  </button>

                  {live ? (
                    <button
                      type="button"
                      onClick={shareLive}
                      className="px-3 py-2.5 rounded-xl border border-gold/20 bg-gold/[0.05] text-gold hover:bg-gold/[0.08] transition-colors font-inter text-xs font-semibold"
                    >
                      Partager le direct
                    </button>
                  ) : (
                    <a
                      href="/rejoindre"
                      className="px-3 py-2.5 rounded-xl border border-gold/20 bg-gold/[0.05] text-gold hover:bg-gold/[0.08] transition-colors font-inter text-xs font-semibold text-center"
                    >
                      Découvrir Citadelle
                    </a>
                  )}
                </div>

                {!live && (
                  <a
                    href="/evenements"
                    className="flex items-center justify-center w-full px-3 py-2.5 rounded-xl border border-pearl/[0.07] text-pearl/45 hover:text-pearl/70 transition-colors font-inter text-xs"
                  >
                    Voir les prochains rendez-vous
                  </a>
                )}
              </div>

              <div className="px-5 py-3.5 border-t border-pearl/[0.05] bg-black/10">
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-gold/60" />

                  <p className="font-inter text-[10px] text-pearl/30 leading-relaxed">
                    Citadelle est une maison spirituelle en ligne : regarder, recevoir de l&apos;aide et continuer à grandir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!live && tab === 'live' && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="container-royal mt-5 sm:mt-6 space-y-4 sm:space-y-5"
          >
            <div>
              <p className="font-inter text-[10px] font-bold tracking-[0.2em] uppercase text-gold/60">
                Entre deux directs
              </p>

              <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-pearl mt-1">
                Ta vie avec Dieu continue
              </h2>

              <p className="font-inter text-sm text-pearl/40 mt-2 max-w-2xl">
                Même sans direct maintenant, Citadelle reste ouverte pour t&apos;aider à prier, recevoir, grandir et préparer le prochain rendez-vous.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 items-start gap-4 lg:gap-6">
              <div className="rounded-2xl sm:rounded-3xl border border-gold/15 bg-gold/[0.025] p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gold/10 border border-gold/15 flex-shrink-0">
                    <Clock className="w-5 h-5 text-gold" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-[10px] font-bold tracking-[0.16em] uppercase text-gold/60">
                      Prochain rendez-vous
                    </p>

                    {nextLive ? (
                      <>
                        <h3 className="font-cinzel text-base sm:text-lg font-bold text-pearl mt-1.5">
                          {nextLive.titre}
                        </h3>

                        <p className="font-inter text-sm text-pearl/55 mt-2 capitalize">
                          {nextLive.date}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-flex px-2.5 py-1 rounded-full bg-pearl/[0.04] border border-pearl/[0.07] font-inter text-[11px] text-pearl/50">
                            {nextLive.heure} · heure locale
                          </span>

                          {nextLive.plateforme && (
                            <span className="inline-flex px-2.5 py-1 rounded-full bg-pearl/[0.04] border border-pearl/[0.07] font-inter text-[11px] text-pearl/40">
                              {nextLive.plateforme}
                            </span>
                          )}
                        </div>

                        <p className="font-inter text-[11px] text-pearl/30 mt-3">
                          Ce rendez-vous vient directement de la programmation Citadelle.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-cinzel text-base font-bold text-pearl mt-1.5">
                          Aucun prochain direct n&apos;est encore programmé
                        </h3>

                        <p className="font-inter text-xs text-pearl/40 mt-2 leading-relaxed">
                          Dès qu&apos;un rendez-vous sera publié dans Citadelle, il apparaîtra automatiquement ici.
                        </p>
                      </>
                    )}

                    <a
                      href="/evenements"
                      className="inline-flex mt-4 px-4 py-2 rounded-xl border border-gold/20 bg-gold/[0.05] text-gold hover:bg-gold/[0.09] transition-colors font-inter text-xs font-semibold"
                    >
                      Voir tous les rendez-vous
                    </a>
                  </div>
                </div>

                {upcoming.length > 1 && (
                  <div className="mt-5 pt-4 border-t border-pearl/[0.06]">
                    <p className="font-inter text-[10px] uppercase tracking-[0.14em] text-pearl/30 mb-3">
                      Ensuite
                    </p>

                    <div className="space-y-2">
                      {upcoming.slice(1).map((item) => (
                        <div
                          key={item.scheduled_at}
                          className="flex items-center justify-between gap-3 rounded-xl border border-pearl/[0.06] bg-pearl/[0.02] px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="font-inter text-xs font-semibold text-pearl/70 truncate">
                              {item.titre}
                            </p>

                            <p className="font-inter text-[10px] text-pearl/30 capitalize mt-0.5">
                              {item.date}
                            </p>
                          </div>

                          <span className="font-inter text-[10px] text-gold/70 whitespace-nowrap">
                            {item.heure}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-pearl/10 bg-pearl/[0.02] overflow-hidden">
                {latestReplay ? (
                  <>
                    <div
                      className="relative aspect-video sm:aspect-[16/7] bg-black/30 bg-cover bg-center"
                      style={
                        latestReplay.cover
                          ? {
                              backgroundImage: `url(${latestReplay.cover})`,
                            }
                          : undefined
                      }
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/30 to-transparent" />

                      <span className="absolute bottom-4 left-4 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 font-inter text-[10px] text-pearl/65">
                        Dernier culte disponible
                      </span>
                    </div>

                    <div className="p-5 sm:p-6">
                      <h3 className="font-cinzel text-base sm:text-lg font-bold text-pearl">
                        {latestReplay.titre}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {latestReplay.date && (
                          <span className="font-inter text-[11px] text-pearl/40">
                            {latestReplay.date}
                          </span>
                        )}

                        {latestReplay.speaker && (
                          <span className="font-inter text-[11px] text-pearl/40">
                            {latestReplay.speaker}
                          </span>
                        )}
                      </div>

                      <p className="font-inter text-xs text-pearl/40 mt-3 leading-relaxed">
                        Tu as manqué le dernier rendez-vous ? Reprends le message et continue ta croissance.
                      </p>

                      <button
                        type="button"
                        onClick={() => setTab('replays')}
                        className="mt-4 px-4 py-2 rounded-xl bg-pearl/[0.05] border border-pearl/10 text-pearl/75 hover:text-pearl hover:bg-pearl/[0.08] transition-colors font-inter text-xs font-semibold"
                      >
                        Regarder les replays
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-5 sm:p-6">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-pearl/[0.04] border border-pearl/[0.07]">
                      <Play className="w-5 h-5 text-pearl/45" />
                    </div>

                    <h3 className="font-cinzel text-base font-bold text-pearl mt-4">
                      Les prochains replays apparaîtront ici
                    </h3>

                    <p className="font-inter text-xs text-pearl/40 mt-2">
                      Aucun replay publié n&apos;est disponible pour le moment.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl sm:rounded-3xl border border-pearl/[0.07] bg-pearl/[0.015] p-4 sm:p-6">
              <p className="font-inter text-[10px] uppercase tracking-[0.18em] font-bold text-pearl/30">
                Ton prochain pas aujourd&apos;hui
              </p>

              <h3 className="font-cinzel text-base font-bold text-pearl mt-1 mb-4">
                Ne quitte pas simplement la page. Continue ton chemin.
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <a
                  href="/priere"
                  className="rounded-2xl border border-pearl/[0.07] bg-pearl/[0.02] hover:border-gold/20 hover:bg-gold/[0.03] transition-all p-4"
                >
                  <span className="text-xl">🙏</span>

                  <p className="font-inter text-sm font-semibold text-pearl mt-3">
                    J&apos;ai besoin de prière
                  </p>

                  <p className="font-inter text-[11px] text-pearl/35 mt-1">
                    Dépose ton sujet maintenant.
                  </p>
                </a>

                <a
                  href="/contact"
                  className="rounded-2xl border border-pearl/[0.07] bg-pearl/[0.02] hover:border-gold/20 hover:bg-gold/[0.03] transition-all p-4"
                >
                  <span className="text-xl">❤️</span>

                  <p className="font-inter text-sm font-semibold text-pearl mt-3">
                    Je veux être accompagné
                  </p>

                  <p className="font-inter text-[11px] text-pearl/35 mt-1">
                    Parle à l&apos;équipe pastorale.
                  </p>
                </a>

                <a
                  href="/parcours"
                  className="rounded-2xl border border-gold/15 bg-gold/[0.025] hover:border-gold/30 hover:bg-gold/[0.05] transition-all p-4"
                >
                  <span className="text-xl">👑</span>

                  <p className="font-inter text-sm font-semibold text-gold mt-3">
                    Je continue à grandir
                  </p>

                  <p className="font-inter text-[11px] text-pearl/35 mt-1">
                    Découvre ton prochain parcours.
                  </p>
                </a>
              </div>
            </div>
          </motion.section>
        )}

        {replayPlayer && (
        <div
          data-live-replay-player="true"
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/85 p-3 sm:p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Replay : ${replayPlayer.titre}`}
          onClick={() => setReplayPlayer(null)}
        >
          <div
            className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl sm:rounded-3xl border border-pearl/10 bg-abyss shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-pearl/[0.07] px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="font-cinzel text-sm font-bold text-pearl sm:text-base">
                  {replayPlayer.titre}
                </p>
                <p className="mt-0.5 font-inter text-[11px] text-pearl/40">
                  Replay dans Citadelle
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReplayPlayer(null)}
                className="shrink-0 rounded-xl border border-pearl/10 px-3 py-2 font-inter text-xs font-semibold text-pearl/70 transition-colors hover:bg-white/[0.05] hover:text-pearl"
              >
                Fermer
              </button>
            </div>

            <div
              className="relative bg-black"
              style={{ aspectRatio: '16/9' }}
            >
              {ytId(replayPlayer.url) ? (
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube.com/embed/${ytId(replayPlayer.url)}?rel=0&modestbranding=1&autoplay=1`}
                  title={replayPlayer.titre}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  controls
                  autoPlay
                  className="absolute inset-0 h-full w-full bg-black"
                  src={replayPlayer.url}
                />
              )}
            </div>

            <div className="border-t border-pearl/[0.07] p-4 sm:p-5">
              <LiveReplayReactionCounts cmsLiveId={replayPlayer.id} />
            </div>
          </div>
        </div>
      )}
      {tab === 'replays' && (
        <div className="container-royal py-8">
          <h2 className="font-cinzel text-2xl font-bold text-pearl mb-8">Replays &amp; Archives</h2>
          {replays.length === 0 ? (
            <div className="card-royal p-12 text-center">
              <Play className="w-8 h-8 mx-auto mb-3 text-gold/40" />
              <p className="font-cinzel text-lg text-pearl/60 mb-1">Aucun replay disponible pour le moment</p>
              <p className="font-inter text-sm text-pearl/35">Les rediffusions des cultes apparaîtront ici après leur diffusion.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {replays.map((replay, i) => (
                <motion.div
                  key={replay.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="space-y-2"
                >
                  <button
                    type="button"
                    data-live-replay-open="true"
                    aria-label={`Regarder ${replay.titre} dans Citadelle`}
                    onClick={() => setReplayPlayer(replay)}
                    className="w-full text-left card-royal group cursor-pointer hover:-translate-y-1 transition-all duration-300 block"
                  >
                    <div className="relative rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                      {replay.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={replay.cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-royal/40 to-abyss" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(5,3,8,0.35)' }}>
                        <div className="w-12 h-12 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 text-gold ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    </div>

                    <h3 className="font-cinzel text-xs font-bold text-pearl group-hover:text-gold transition-colors line-clamp-2 mb-2">
                      {replay.titre}
                    </h3>

                    {replay.speaker && (
                      <p className="text-[11px] text-pearl/40 font-inter capitalize">
                        {replay.speaker}
                      </p>
                    )}

                    {replay.date && (
                      <p className="text-[11px] text-pearl/30 mt-1">
                        {replay.date}
                      </p>
                    )}
                  </button>

                  <LiveReplayReactionCounts cmsLiveId={replay.id} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
