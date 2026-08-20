import { describe, it, expect, vi } from 'vitest'

// `@/lib/video` est un module produit par un autre chantier (Phase 1A) ;
// on le mocke ici pour tester `resolveLiveState` de façon déterministe et
// indépendante de son implémentation réelle.
vi.mock('@/lib/video', () => ({
  resolveVideoSource: vi.fn(
    (input: { youtube_url?: string | null; video_url?: string | null }) => {
      const hasVideo = Boolean(input.youtube_url || input.video_url)
      return {
        kind: hasVideo ? 'youtube' : 'none',
        youtubeId: hasVideo ? 'abc123' : null,
        embedUrl: hasVideo ? 'https://www.youtube.com/embed/abc123' : null,
        fileUrl: null,
        thumbnailUrl: hasVideo ? 'https://img.youtube.com/vi/abc123/hqdefault.jpg' : null,
      }
    },
  ),
}))

import { resolveLiveState } from '../live-state'
import type { RawCmsLive } from '../types'

const NOW = new Date('2026-08-19T12:00:00Z')
const PAST = '2026-08-01T10:00:00Z'
const FUTURE = '2026-09-01T10:00:00Z'

function row(overrides: Partial<RawCmsLive> = {}): RawCmsLive {
  return { title: 'Culte du dimanche', ...overrides }
}

describe('resolveLiveState', () => {
  it('règle 1 — is_live === true prime sur tout le reste -> live', () => {
    expect(
      resolveLiveState(row({ is_live: true, status: 'ended', scheduled_at: PAST }), NOW),
    ).toBe('live')
  })

  it('règle 2 — status === "live" -> live', () => {
    expect(resolveLiveState(row({ status: 'live' }), NOW)).toBe('live')
  })

  it('règle 3 — scheduled_at dans le futur -> upcoming', () => {
    expect(resolveLiveState(row({ scheduled_at: FUTURE, status: 'scheduled' }), NOW)).toBe(
      'upcoming',
    )
  })

  it('règle 3 — futur prime même si status est "draft"', () => {
    expect(resolveLiveState(row({ scheduled_at: FUTURE, status: 'draft' }), NOW)).toBe('upcoming')
  })

  it('règle 4 — status ended + vidéo jouable -> replay', () => {
    expect(
      resolveLiveState(
        row({ status: 'ended', scheduled_at: PAST, youtube_url: 'https://youtu.be/abc123' }),
        NOW,
      ),
    ).toBe('replay')
  })

  it('règle 4 — status published + vidéo jouable -> replay', () => {
    expect(
      resolveLiveState(
        row({ status: 'published', scheduled_at: PAST, video_url: 'https://cdn.example/x.mp4' }),
        NOW,
      ),
    ).toBe('replay')
  })

  it('règle 5 — status ended sans vidéo jouable -> ended', () => {
    expect(resolveLiveState(row({ status: 'ended', scheduled_at: PAST }), NOW)).toBe('ended')
  })

  it('règle 6 — scheduled_at passé + vidéo jouable (status ni ended ni published) -> replay', () => {
    expect(
      resolveLiveState(
        row({ status: 'scheduled', scheduled_at: PAST, youtube_url: 'https://youtu.be/abc123' }),
        NOW,
      ),
    ).toBe('replay')
  })

  it('règle 7 — défaut (aucune règle ne matche) -> upcoming', () => {
    expect(resolveLiveState(row({ status: 'draft' }), NOW)).toBe('upcoming')
    expect(resolveLiveState(row({}), NOW)).toBe('upcoming')
  })

  it('règle 7 — scheduled_at passé sans vidéo jouable et status non ended -> upcoming', () => {
    expect(resolveLiveState(row({ status: 'scheduled', scheduled_at: PAST }), NOW)).toBe(
      'upcoming',
    )
  })

  it('scheduled_at invalide est traité comme absent', () => {
    expect(resolveLiveState(row({ scheduled_at: 'not-a-date', status: 'draft' }), NOW)).toBe(
      'upcoming',
    )
  })

  it('now par défaut est utilisable sans argument explicite', () => {
    expect(resolveLiveState(row({ status: 'live' }))).toBe('live')
  })
})
