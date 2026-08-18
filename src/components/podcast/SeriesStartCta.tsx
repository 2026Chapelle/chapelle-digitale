'use client'
/**
 * PODCAST-SPINE — CTA principal « Commencer la série » (hero page Série).
 * Cible le PREMIER épisode réellement accessible à l'utilisateur (public toujours,
 * member si connecté membre, premium si droit) et lance la lecture via le gate
 * SERVEUR (usePodcastPlayback → /api/podcast/:id/play). Ne contourne aucun gate ;
 * si aucun épisode n'est accessible, on cible le premier (le serveur décidera →
 * invitation le cas échéant).
 */
import Link from 'next/link'
import { Play } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { isMemberStatus } from '@/lib/podcast/playback-access'
import { pickFirstPlayable, type SpineEpisode } from '@/lib/podcast/spine-helpers'
import { usePodcastPlayback, type PlayableEpisode } from './usePodcastPlayback'
import { JoinToListenModal } from './JoinToListenModal'

const toPlayable = (e: SpineEpisode): PlayableEpisode => ({
  id: e.id, title: e.title, serie: e.serie, duration: e.duration, cover: e.cover, accessLevel: e.accessLevel,
})

export function SeriesStartCta({ episodes }: { episodes: SpineEpisode[] }) {
  const { profile } = useAuth()
  const isMember = isMemberStatus(profile?.membre_statut)
  const { requestPlay, joinFor, setJoinFor, notice, setNotice } = usePodcastPlayback('series')

  const target = pickFirstPlayable(episodes, { isMember, hasPremium: false }) ?? episodes[0] ?? null
  if (!target) return null

  return (
    <>
      <button
        type="button"
        onClick={() => requestPlay(toPlayable(target))}
        aria-label={`Commencer la série — écouter ${target.title}`}
        className="btn-gold-cinematic inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
        style={{ padding: '12px 24px', fontSize: '0.9rem' }}
      >
        <Play className="w-4 h-4" fill="currentColor" aria-hidden /> Commencer la série
      </button>

      <JoinToListenModal open={!!joinFor} onClose={() => setJoinFor(null)} episodeTitle={joinFor?.title} />
      {notice && (
        <div role="dialog" aria-modal="true" aria-label={notice.title} className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={() => setNotice(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
          <div className="relative z-[1] w-full max-w-sm rounded-2xl border border-[rgba(212,175,55,0.35)] bg-[#0c0c14] p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-cinzel font-bold text-cinematic-gold text-xl mb-2">{notice.title}</h3>
            <p className="font-inter text-sm mb-5" style={{ color: 'rgba(245,230,216,0.7)' }}>{notice.message}</p>
            <div className="flex flex-col gap-2">
              <Link href="/rejoindre" onClick={() => setNotice(null)} className="btn-gold-cinematic inline-flex items-center justify-center" style={{ padding: '10px 22px', fontSize: '0.9rem' }}>Rejoindre La Citadelle</Link>
              <button type="button" onClick={() => setNotice(null)} className="text-xs font-inter" style={{ color: 'rgba(245,230,216,0.5)' }}>Plus tard</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
