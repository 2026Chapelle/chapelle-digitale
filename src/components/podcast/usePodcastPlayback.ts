'use client'
/**
 * PODCAST-SPINE (public) — hook de lecture réutilisable pour les pages Émission/Série.
 *
 * Encapsule le MÊME contrat de gate que /podcast (PODCAST-SEC) SANS le dupliquer
 * dans chaque page : visiteur non connecté → invitation ; sinon on demande au
 * SERVEUR l'URL autorisée (/api/podcast/:id/play). Ne contourne AUCUN gate ; ne
 * connaît jamais l'URL média avant l'autorisation serveur. Le player global
 * (AudioPlayerProvider) reste inchangé — aucune file/autoplay ajoutée.
 */
import { useState } from 'react'
import { useAudioPlayer } from '@/components/providers/AudioPlayerProvider'
import { useAuth } from '@/components/providers/AuthProvider'
import { resolvePlayback, isResolved } from '@/lib/podcast/playback-client'

export interface PlayableEpisode {
  id: string
  title: string
  serie?: string | null
  duration?: string
  cover?: string | null
  accessLevel?: 'public' | 'member' | 'premium'
}

export interface PlaybackNotice { title: string; message: string }

function noticeFor(reason: string): PlaybackNotice {
  switch (reason) {
    case 'member_only':
      return { title: 'Réservé aux membres', message: "Cet épisode est réservé aux membres de la Citadelle. Rejoins la communauté pour l'écouter." }
    case 'premium_denied':
      return { title: 'Contenu Premium', message: "Cet épisode fait partie de l'offre Premium de la Citadelle." }
    case 'no_media':
      return { title: 'Bientôt disponible', message: "L'audio de cet épisode arrive bientôt." }
    default:
      return { title: 'Indisponible', message: "Cet épisode n'est pas disponible pour le moment." }
  }
}

export function usePodcastPlayback(sourceContext = 'series') {
  const { play, pause, resume, isPlaying, track } = useAudioPlayer()
  const { user, isDemo } = useAuth()
  const canPlay = Boolean(user) || isDemo
  const [joinFor, setJoinFor] = useState<PlayableEpisode | null>(null)
  const [notice, setNotice] = useState<PlaybackNotice | null>(null)

  const requestPlay = async (ep: PlayableEpisode) => {
    if (!canPlay) { setJoinFor(ep); return }
    if (track?.id === ep.id) { isPlaying(ep.id) ? pause() : resume(); return }
    const res = await resolvePlayback(ep.id)
    if (isResolved(res)) {
      play({
        id: ep.id,
        titre: ep.title,
        serie: ep.serie || 'La Voix du Royaume',
        duree: ep.duration || '',
        emoji: '🎙️',
        couleur: '#D4AF37',
        audioUrl: res.url,
        coverUrl: ep.cover || undefined,
        sourceContext,
      })
      return
    }
    if (res.error === 'auth_required') setJoinFor(ep)
    else setNotice(noticeFor(res.error))
  }

  return { requestPlay, isPlaying, canPlay, user, joinFor, setJoinFor, notice, setNotice }
}
