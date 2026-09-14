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

const source =
  readFileSync(
    resolve(
      process.cwd(),
      'src/components/live/LiveReplayPlayer.tsx',
    ),
    'utf8',
  )

describe(
  'LIVE 4C LiveReplayPlayer imperative handle contract',
  () => {
    it(
      'exports LiveReplayPlayerHandle',
      () => {
        expect(source).toContain(
          'export type LiveReplayPlayerHandle',
        )
      },
    )

    it(
      'wraps the player with forwardRef',
      () => {
        expect(source).toContain(
          'forwardRef<LiveReplayPlayerHandle',
        )
      },
    )

    it(
      'exposes the imperative handle',
      () => {
        expect(source).toContain(
          'useImperativeHandle',
        )
      },
    )

    it(
      'exposes current replay position',
      () => {
        expect(source).toContain(
          'getCurrentPosition',
        )
      },
    )

    it(
      'exposes replay seeking',
      () => {
        expect(source).toContain(
          'seekTo',
        )
      },
    )
  },
)