import {
  readFileSync,
} from 'node:fs'

import {
  resolve,
} from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

const publicSource =
  readFileSync(
    resolve(
      process.cwd(),
      'src/app/(public)/live/page.tsx',
    ),
    'utf8',
  )

const memberSource =
  readFileSync(
    resolve(
      process.cwd(),
      'src/app/(member)/member/dashboard/lives/page.tsx',
    ),
    'utf8',
  )

function notebookTag(
  source: string,
) {
  const start =
    source.indexOf(
      '<LiveCultNotebook',
    )

  if (start < 0) {
    return ''
  }

  const end =
    source.indexOf(
      '/>',
      start,
    )

  if (end < 0) {
    return source.slice(
      start,
      start + 800,
    )
  }

  return source.slice(
    start,
    end + 2,
  )
}

describe(
  'LIVE 4C Mon Carnet du Culte wiring',
  () => {
    it(
      'public imports LiveCultNotebook',
      () => {
        expect(
          publicSource,
        ).toContain(
          "import LiveCultNotebook from '@/components/live/LiveCultNotebook'",
        )
      },
    )

    it(
      'member imports LiveCultNotebook',
      () => {
        expect(
          memberSource,
        ).toContain(
          "import LiveCultNotebook from '@/components/live/LiveCultNotebook'",
        )
      },
    )

    it(
      'public declares a replay player handle ref',
      () => {
        expect(
          publicSource,
        ).toContain(
          'useRef<LiveReplayPlayerHandle | null>(null)',
        )
      },
    )

    it(
      'member declares a replay player handle ref',
      () => {
        expect(
          memberSource,
        ).toContain(
          'useRef<LiveReplayPlayerHandle | null>(null)',
        )
      },
    )

    it(
      'public passes the ref to LiveReplayPlayer',
      () => {
        expect(
          publicSource,
        ).toContain(
          'ref={replayPlayerRef}',
        )
      },
    )

    it(
      'member passes the ref to LiveReplayPlayer',
      () => {
        expect(
          memberSource,
        ).toContain(
          'ref={replayPlayerRef}',
        )
      },
    )

    it(
      'public mounts the notebook for the selected replay without server sync',
      () => {
        const tag =
          notebookTag(
            publicSource,
          )

        expect(tag).toContain(
          '<LiveCultNotebook',
        )

        expect(tag).toContain(
          'cmsLiveId={replayPlayer.id}',
        )

        expect(tag).toContain(
          'playerRef={replayPlayerRef}',
        )

        expect(tag).not.toContain(
          'serverSync',
        )
      },
    )

    it(
      'member mounts the notebook for the selected replay with server sync',
      () => {
        const tag =
          notebookTag(
            memberSource,
          )

        expect(tag).toContain(
          '<LiveCultNotebook',
        )

        expect(tag).toContain(
          'cmsLiveId={player.cmsLiveId}',
        )

        expect(tag).toContain(
          'playerRef={replayPlayerRef}',
        )

        expect(tag).toContain(
          'serverSync',
        )
      },
    )

    it(
      'public keeps frozen LIVE4B reaction memory',
      () => {
        expect(
          publicSource,
        ).toContain(
          '<LiveReplayReactionCounts',
        )
      },
    )

    it(
      'member keeps frozen LIVE4B reaction memory',
      () => {
        expect(
          memberSource,
        ).toContain(
          '<LiveReplayReactionCounts',
        )
      },
    )

    it(
      'public places notebook after player and before reaction memory',
      () => {
        const player =
          publicSource.indexOf(
            '<LiveReplayPlayer',
          )

        const notebook =
          publicSource.indexOf(
            '<LiveCultNotebook',
          )

        const reactions =
          publicSource.indexOf(
            '<LiveReplayReactionCounts',
            Math.max(
              notebook,
              0,
            ),
          )

        expect(player)
          .toBeGreaterThanOrEqual(0)

        expect(notebook)
          .toBeGreaterThan(player)

        expect(reactions)
          .toBeGreaterThan(notebook)
      },
    )

    it(
      'member places notebook after replay player and before reaction memory',
      () => {
        const player =
          memberSource.indexOf(
            '<LiveReplayPlayer',
          )

        const notebook =
          memberSource.indexOf(
            '<LiveCultNotebook',
          )

        const reactions =
          memberSource.indexOf(
            '<LiveReplayReactionCounts',
            Math.max(
              notebook,
              0,
            ),
          )

        expect(player)
          .toBeGreaterThanOrEqual(0)

        expect(notebook)
          .toBeGreaterThan(player)

        expect(reactions)
          .toBeGreaterThan(notebook)
      },
    )
  },
)