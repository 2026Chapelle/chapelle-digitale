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

describe('LIVE 4C replay player critical geometry', () => {
  it('gives every aspect-ratio replay wrapper a runtime 16:9 fallback', () => {
    const wrapperCount =
      source.match(
        /aspect-video/g,
      )?.length ?? 0

    const inlineRatioCount =
      source.match(
        /style=\{\{ aspectRatio: '16\/9' \}\}/g,
      )?.length ?? 0

    expect(wrapperCount)
      .toBe(3)

    expect(inlineRatioCount)
      .toBe(3)
  })
})