import { describe, it, expect } from 'vitest'
import { playbackActionFor, type PlaybackResult } from '@/lib/podcast/playback-client'
import type { PlaybackReason } from '@/lib/podcast/playback-access'

const resolved = (url = 'https://sign/x.mp3'): PlaybackResult => ({ url, expiresAt: null, source: 'storage' })
const denied = (error: PlaybackReason): PlaybackResult => ({ error })

describe('playbackActionFor — le serveur décide, le client ne pré-bloque jamais', () => {
  it('épisode PUBLIC (URL résolue) → play, même pour un visiteur', () => {
    // Serveur : public + anonyme → 200 + URL signée. Le client joue sans modal.
    expect(playbackActionFor(resolved('https://sign/public.mp3'))).toEqual({ kind: 'play', url: 'https://sign/public.mp3' })
  })
  it('épisode MEMBER + visiteur (auth_required) → join (JoinToListenModal)', () => {
    expect(playbackActionFor(denied('auth_required'))).toEqual({ kind: 'join' })
  })
  it('MEMBER authentifié non-membre (member_only) → notice', () => {
    expect(playbackActionFor(denied('member_only'))).toEqual({ kind: 'notice', reason: 'member_only' })
  })
  it('PREMIUM refusé (premium_denied) → notice (gate premium inchangé)', () => {
    expect(playbackActionFor(denied('premium_denied'))).toEqual({ kind: 'notice', reason: 'premium_denied' })
  })
  it('aucun média (no_media) → notice', () => {
    expect(playbackActionFor(denied('no_media'))).toEqual({ kind: 'notice', reason: 'no_media' })
  })
  it('échec serveur / introuvable (not_found) → notice, aucune lecture factice', () => {
    expect(playbackActionFor(denied('not_found'))).toEqual({ kind: 'notice', reason: 'not_found' })
  })
  it('access_level inconnu (forbidden, fail-closed) → notice', () => {
    expect(playbackActionFor(denied('forbidden'))).toEqual({ kind: 'notice', reason: 'forbidden' })
  })
  it('ne renvoie JAMAIS play sans URL serveur (aucune URL fabriquée côté client)', () => {
    const a = playbackActionFor(denied('auth_required'))
    const b = playbackActionFor(denied('member_only'))
    expect(a.kind).not.toBe('play')
    expect(b.kind).not.toBe('play')
  })
})
