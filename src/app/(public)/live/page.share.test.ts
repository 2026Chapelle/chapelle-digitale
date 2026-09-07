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
      'src/app/(public)/live/page.tsx',
    ),
    'utf8',
  )

const start =
  source.indexOf(
    'const shareLive = async () =>',
  )

const end =
  source.indexOf(
    'return (',
    start,
  )

const shareSource =
  start >= 0 &&
  end > start
    ? source.slice(
        start,
        end,
      )
    : ''

const compact =
  shareSource.replace(
    /\s+/g,
    ' ',
  )

describe('LIVE 4A.5 public share integration', () => {
  it('uses the stable Citadelle Live URL instead of the current browser URL', () => {
    expect(source).toContain(
      'LIVE_PUBLIC_URL',
    )

    expect(compact).toContain(
      'const url = LIVE_PUBLIC_URL',
    )

    expect(compact).not.toContain(
      'window.location.href',
    )
  })

  it('uses the agreed Famille Royale invitation text', () => {
    expect(source).toContain(
      'LIVE_SHARE_TEXT',
    )

    expect(compact).toContain(
      'text: LIVE_SHARE_TEXT',
    )
  })

  it('records native share only after navigator.share resolves', () => {
    const browserSuccess =
      compact.indexOf(
        'await navigator.share',
      )

    const telemetry =
      compact.search(
        /await recordSuccessfulLiveShare\(\s*'native_share'\s*,?\s*\)/,
      )

    expect(
      browserSuccess,
    ).toBeGreaterThan(-1)

    expect(
      telemetry,
    ).toBeGreaterThan(
      browserSuccess,
    )
  })

  it('records copy_link only after clipboard write succeeds', () => {
    const copySuccess =
      compact.indexOf(
        'await navigator.clipboard.writeText(url)',
      )

    const telemetry =
      compact.search(
        /await recordSuccessfulLiveShare\(\s*'copy_link'\s*,?\s*\)/,
      )

    expect(
      copySuccess,
    ).toBeGreaterThan(-1)

    expect(
      telemetry,
    ).toBeGreaterThan(
      copySuccess,
    )
  })

  it('keeps cancellation inside the catch path and does not invent a successful action', () => {
    expect(compact).toContain(
      'try {',
    )

    expect(compact).toContain(
      '} catch {',
    )

    expect(compact).not.toContain(
      'finally',
    )
  })
})