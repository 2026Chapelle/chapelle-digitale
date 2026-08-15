import { describe, it, expect } from 'vitest'
import {
  decidePlaybackAccess,
  isMemberStatus,
  normalizeAccessLevel,
  classifyMediaSource,
  reasonToStatus,
  PODCAST_PLAYBACK_TTL_SECONDS,
  type PlaybackContext,
} from '@/lib/podcast/playback-access'

const ctx = (o: Partial<PlaybackContext> = {}): PlaybackContext => ({
  authenticated: false, isMember: false, isAdmin: false, hasPremiumEntitlement: false, ...o,
})

describe('isMemberStatus — règle P1 (LARGE : tout sauf visiteur)', () => {
  it('visiteur / vide / non-string → non membre', () => {
    expect(isMemberStatus('visiteur')).toBe(false)
    expect(isMemberStatus(' visiteur ')).toBe(false)
    expect(isMemberStatus('')).toBe(false)
    expect(isMemberStatus(null)).toBe(false)
    expect(isMemberStatus(undefined)).toBe(false)
    expect(isMemberStatus(42)).toBe(false)
  })
  it('tout autre statut réel → membre', () => {
    for (const s of ['nouveau_membre', 'membre_actif', 'disciple', 'leader_cellule', 'berger', 'pasteur']) {
      expect(isMemberStatus(s)).toBe(true)
    }
  })
})

describe('normalizeAccessLevel — défaut prudent member', () => {
  it('valeurs connues préservées', () => {
    expect(normalizeAccessLevel('public')).toBe('public')
    expect(normalizeAccessLevel('member')).toBe('member')
    expect(normalizeAccessLevel('premium')).toBe('premium')
  })
  it('valeur inconnue / vide → member', () => {
    expect(normalizeAccessLevel('vip')).toBe('member')
    expect(normalizeAccessLevel(null)).toBe('member')
    expect(normalizeAccessLevel(123)).toBe('member')
  })
})

describe('decidePlaybackAccess — PUBLIC (écoute gratuite, visiteur inclus)', () => {
  it('autorisé pour anonyme, membre, premium', () => {
    expect(decidePlaybackAccess('public', ctx())).toEqual({ allowed: true, reason: 'ok' })
    expect(decidePlaybackAccess('public', ctx({ authenticated: true }))).toEqual({ allowed: true, reason: 'ok' })
    expect(decidePlaybackAccess('public', ctx({ authenticated: true, isMember: true }))).toEqual({ allowed: true, reason: 'ok' })
  })
})

describe('decidePlaybackAccess — MEMBER', () => {
  it('anonyme → auth_required', () => {
    expect(decidePlaybackAccess('member', ctx())).toEqual({ allowed: false, reason: 'auth_required' })
  })
  it('authentifié mais visiteur (non membre) → member_only', () => {
    expect(decidePlaybackAccess('member', ctx({ authenticated: true, isMember: false })))
      .toEqual({ allowed: false, reason: 'member_only' })
  })
  it('membre → autorisé', () => {
    expect(decidePlaybackAccess('member', ctx({ authenticated: true, isMember: true })))
      .toEqual({ allowed: true, reason: 'ok' })
  })
})

describe('decidePlaybackAccess — PREMIUM (fail-closed, aucun entitlement)', () => {
  it('anonyme → auth_required', () => {
    expect(decidePlaybackAccess('premium', ctx())).toEqual({ allowed: false, reason: 'auth_required' })
  })
  it('membre SANS entitlement → premium_denied', () => {
    expect(decidePlaybackAccess('premium', ctx({ authenticated: true, isMember: true })))
      .toEqual({ allowed: false, reason: 'premium_denied' })
  })
  it('membre AVEC entitlement (chemin préparé) → autorisé', () => {
    expect(decidePlaybackAccess('premium', ctx({ authenticated: true, isMember: true, hasPremiumEntitlement: true })))
      .toEqual({ allowed: true, reason: 'ok' })
  })
})

describe('decidePlaybackAccess — ADMIN (gestion/preview) & fail-closed', () => {
  it('admin autorisé sur tous les niveaux', () => {
    for (const lvl of ['public', 'member', 'premium'] as const) {
      expect(decidePlaybackAccess(lvl, ctx({ isAdmin: true }))).toEqual({ allowed: true, reason: 'ok' })
    }
  })
  it('niveau inconnu (via normalize) → member par défaut ; brut inconnu → forbidden', () => {
    // decide ne reçoit que des niveaux normalisés, mais la branche default est fail-closed.
    expect(decidePlaybackAccess('unknown' as never, ctx({ authenticated: true, isMember: true })))
      .toEqual({ allowed: false, reason: 'forbidden' })
  })
})

describe('reasonToStatus — mapping HTTP', () => {
  it('codes attendus', () => {
    expect(reasonToStatus('ok')).toBe(200)
    expect(reasonToStatus('auth_required')).toBe(401)
    expect(reasonToStatus('member_only')).toBe(403)
    expect(reasonToStatus('premium_denied')).toBe(403)
    expect(reasonToStatus('forbidden')).toBe(403)
    expect(reasonToStatus('no_media')).toBe(404)
    expect(reasonToStatus('not_found')).toBe(404)
  })
})

describe('classifyMediaSource — détection de la source', () => {
  it('vide / non-string → none', () => {
    expect(classifyMediaSource('')).toEqual({ kind: 'none' })
    expect(classifyMediaSource(null)).toEqual({ kind: 'none' })
    expect(classifyMediaSource(undefined)).toEqual({ kind: 'none' })
  })
  it('YouTube (toutes formes) → youtube', () => {
    expect(classifyMediaSource('https://www.youtube.com/watch?v=abc').kind).toBe('youtube')
    expect(classifyMediaSource('https://youtu.be/abc').kind).toBe('youtube')
    expect(classifyMediaSource('https://m.youtube.com/watch?v=abc').kind).toBe('youtube')
  })
  it('objet Supabase Storage (public) → storage + bucket/path', () => {
    const s = classifyMediaSource('https://xyz.supabase.co/storage/v1/object/public/media/podcasts/ep1.mp3')
    expect(s.kind).toBe('storage')
    expect(s.bucket).toBe('media')
    expect(s.path).toBe('podcasts/ep1.mp3')
  })
  it('objet Storage signé (sign) → storage, path sans query', () => {
    const s = classifyMediaSource('https://xyz.supabase.co/storage/v1/object/sign/media/a/b.mp3?token=xxx')
    expect(s.kind).toBe('storage')
    expect(s.bucket).toBe('media')
    expect(s.path).toBe('a/b.mp3')
  })
  it('URL externe quelconque → external', () => {
    expect(classifyMediaSource('https://cdn.example.com/a.mp3').kind).toBe('external')
    expect(classifyMediaSource('not a url').kind).toBe('external')
  })
  it('durcissement host : chemin Storage sur host étranger → external (jamais signé)', () => {
    const foreign = 'https://evil.example.com/storage/v1/object/public/media/x.mp3'
    // Sans host attendu : reconnu comme storage (compat).
    expect(classifyMediaSource(foreign).kind).toBe('storage')
    // Avec host attendu du projet : host étranger → external.
    expect(classifyMediaSource(foreign, 'xyz.supabase.co').kind).toBe('external')
    // Host correct → storage signable.
    const own = 'https://xyz.supabase.co/storage/v1/object/public/media/x.mp3'
    expect(classifyMediaSource(own, 'xyz.supabase.co').kind).toBe('storage')
  })
})

describe('TTL', () => {
  it('couvre une écoute complète (>= 1 h)', () => {
    expect(PODCAST_PLAYBACK_TTL_SECONDS).toBeGreaterThanOrEqual(3600)
  })
})
