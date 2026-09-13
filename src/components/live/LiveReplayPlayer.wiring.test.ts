import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const publicSource = readFileSync(
  resolve(process.cwd(), 'src/app/(public)/live/page.tsx'),
  'utf8',
)

const memberSource = readFileSync(
  resolve(process.cwd(), 'src/app/(member)/member/dashboard/lives/page.tsx'),
  'utf8',
)

describe('LIVE 4C replay player wiring', () => {
  it('uses the shared replay player for public individual replays', () => {
    expect(publicSource).toContain(
      "import { LiveReplayPlayer } from '@/components/live/LiveReplayPlayer'",
    )

    expect(publicSource).toContain(
      'youtube_url?: string; video_url?: string;',
    )

    expect(publicSource).toContain(
      'youtubeId={ytId(replayPlayer.youtube_url)}',
    )

    expect(publicSource).toContain(
      'videoUrl={replayPlayer.video_url || null}',
    )

    expect(publicSource).not.toContain(
      'replayPlayer.url',
    )
  })

  it('preserves the public frozen LIVE4B memory', () => {
    expect(publicSource).toContain(
      '<LiveReplayReactionCounts cmsLiveId={replayPlayer.id} />',
    )

    expect(publicSource).toContain(
      '<LiveReplayReactionCounts cmsLiveId={replay.id} />',
    )
  })

  it('separates youtube and hosted member replay sources', () => {
    expect(memberSource).toContain(
      'youtube_url?: string; video_url?: string;',
    )

    expect(memberSource).toContain(
      "youtube_url: d.youtube_url || '', video_url: d.video_url || '', cover: d.cover_url || ''",
    )

    expect(memberSource).not.toContain(
      'youtube_url: d.youtube_url || d.video_url',
    )

    expect(memberSource).not.toContain(
      'window.open(r.youtube_url',
    )
  })

  it('uses the shared replay player with member server sync', () => {
    expect(memberSource).toContain(
      "import { LiveReplayPlayer } from '@/components/live/LiveReplayPlayer'",
    )

    expect(memberSource).toContain(
      'cmsLiveId={player.cmsLiveId}',
    )

    expect(memberSource).toContain(
      'youtubeId={player.ytId ?? null}',
    )

    expect(memberSource).toContain(
      'videoUrl={player.videoUrl ?? null}',
    )

    expect(memberSource).toContain(
      'serverSync',
    )
  })

  it('keeps playlist playback separate from replay progress', () => {
    expect(memberSource).toContain(
      'player.listId ? (',
    )

    expect(memberSource).toContain(
      'https://www.youtube.com/embed/videoseries?list=${player.listId}&rel=0&modestbranding=1',
    )

    expect(memberSource).toContain(
      'setPlayer({ listId: p.listId, titre: p.titre })',
    )

    expect(memberSource).not.toContain(
      'setPlayer({ listId: p.listId, titre: p.titre, cmsLiveId:',
    )
  })
})