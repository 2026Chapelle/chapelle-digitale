import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  readFileSync,
} from 'node:fs'

import {
  join,
} from 'node:path'

function source(
  relative: string,
): string {
  return readFileSync(
    join(
      process.cwd(),
      relative,
    ),
    'utf8',
  )
}

const component =
  source(
    'src/components/live/LiveReplayReactionCounts.tsx',
  )

const client =
  source(
    'src/lib/live/live-reaction-replay-client.ts',
  )

const publicPage =
  source(
    'src/app/(public)/live/page.tsx',
  )

const memberPage =
  source(
    'src/app/(member)/member/dashboard/lives/page.tsx',
  )

describe('frozen replay reaction counts UI contract', () => {
  it('uses lazy viewport loading without polling or realtime', () => {
    expect(component).toContain(
      'IntersectionObserver',
    )

    expect(component).toContain(
      'requestReplayReactionSnapshot',
    )

    expect(component).toContain(
      'AbortController',
    )

    expect(component).toContain(
      'generationRef',
    )

    expect(component).not.toContain(
      'setInterval(',
    )

    expect(component).not.toContain(
      '.channel(',
    )

    expect(component).not.toContain(
      'LiveReactionControls',
    )

    expect(component).not.toContain(
      'LiveReactionsProvider',
    )

    expect(client).not.toContain(
      '.channel(',
    )

    expect(client).not.toContain(
      "method: 'POST'",
    )
  })

  it('renders the exact five frozen public unique reaction counts', () => {
    expect(component).toContain(
      'REACTION_TYPES.map',
    )

    expect(component).toContain(
      'REACTION_SYMBOLS[type]',
    )

    expect(component).toContain(
      'REACTION_LABELS[type]',
    )

    expect(component).toContain(
      'result.uniqueByType[type]',
    )
  })

  it('distinguishes replay states and exposes only a read-only retry', () => {
    expect(component).toContain(
      'Réactions non enregistrées pour ce culte',
    )

    expect(component).toContain(
      'Statistiques non finalisées',
    )

    expect(component).toContain(
      'Statistiques de réactions momentanément indisponibles',
    )

    expect(component).toContain(
      'Réessayer',
    )

    expect(component).not.toContain(
      'Réagir :',
    )
  })

  it('uses the real CMS UUID and keeps public replay playback inside Citadelle', () => {
    expect(publicPage).toContain(
      ".select('id, title, description, youtube_url, video_url, cover_url, platform, is_live, status, created_at, scheduled_at')",
    )

    expect(publicPage).toContain(
      'id: d.id',
    )

    expect(publicPage).not.toContain(
      "id: `${d.title || 'replay'}-${i}`",
    )

    expect(publicPage).toContain(
      '<LiveReplayReactionCounts cmsLiveId={replay.id} />',
    )

    expect(publicPage).toContain(
      'data-live-replay-open="true"',
    )

    expect(publicPage).toContain(
      'onClick={() => setReplayPlayer(replay)}',
    )

    expect(publicPage).not.toContain(
      'href={replay.url}',
    )

    expect(publicPage).toContain(
      'data-live-replay-player="true"',
    )
    expect(publicPage).toContain(
      'overflow-y-auto',
    )

    expect(publicPage).toContain(
      'items-start justify-center',
    )

    expect(publicPage).toContain(
      "style={{ maxWidth: 'min(64rem, 108dvh)' }}",
    )

    expect(publicPage).toContain(
      'data-live-replay-reactions="true"',
    )

    expect(publicPage).toContain(
      'shrink-0 border-t border-pearl/[0.07]',
    )


    expect(publicPage).toContain(
      "import { LiveReplayPlayer } from '@/components/live/LiveReplayPlayer'",
    )

    expect(publicPage).toContain(
      'youtubeId={ytId(replayPlayer.youtube_url)}',
    )

    expect(publicPage).toContain(
      'videoUrl={replayPlayer.video_url || null}',
    )

    expect(publicPage).toContain(
      '<LiveReplayReactionCounts cmsLiveId={replayPlayer.id} />',
    )
  })

  it('mounts public replay statistics only inside replay presentation', () => {
    const replayTab =
      publicPage.indexOf(
        "{tab === 'replays' && (",
      )

    const history =
      publicPage.indexOf(
        '<LiveReplayReactionCounts cmsLiveId={replay.id} />',
      )

    expect(replayTab).toBeGreaterThan(-1)
    expect(history).toBeGreaterThan(replayTab)

    const liveProvider =
      publicPage.indexOf(
        '<LiveReactionsProvider',
      )

    expect(history).toBeGreaterThan(
      liveProvider,
    )
  })

  it('carries CMS replay identity into member replay player but never playlist player', () => {
    expect(memberPage).toContain(
      'cmsLiveId?: string',
    )

    expect(memberPage).toContain(
      'cmsLiveId: r.id,',
    )

    expect(memberPage).toContain(
      '<LiveReplayPlayer',
    )

    expect(memberPage).toContain(
      'cmsLiveId={player.cmsLiveId}',
    )

    expect(memberPage).toContain(
      'serverSync',
    )

    expect(memberPage).toContain(
      'setPlayer({ listId: p.listId, titre: p.titre })',
    )

    expect(memberPage).not.toContain(
      'setPlayer({ listId: p.listId, titre: p.titre, cmsLiveId:',
    )
  })

  it('places frozen replay history below the member video and keeps live reactions suspended while modal exists', () => {
    expect(memberPage).toContain(
      '<LiveReplayReactionCounts cmsLiveId={player.cmsLiveId} />',
    )

    const iframe =
      memberPage.lastIndexOf(
        '<iframe',
      )

    const history =
      memberPage.indexOf(
        '<LiveReplayReactionCounts cmsLiveId={player.cmsLiveId} />',
      )

    expect(history).toBeGreaterThan(
      iframe,
    )

    expect(memberPage).toContain(
      "enabled={tab === 'live' && hasLive && Boolean(liveYtId) && player === null}",
    )
  })

  it('preserves reminders, sharing and programs', () => {
    expect(memberPage).toContain(
      '<ShareButtons',
    )

    expect(memberPage).toContain(
      'Rappel',
    )

    expect(memberPage).toContain(
      'PROGRAMMES_REGULIERS',
    )
  })
})