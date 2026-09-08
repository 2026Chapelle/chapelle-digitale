import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/app/(member)/member/dashboard/page.tsx'),
  'utf8',
)

describe('member dashboard MAINTENANT refresh contract', () => {
  it('refreshes canonical live state every 15 seconds', () => {
    expect(source).toContain('const LIVE_POLL_INTERVAL_MS = 15_000')
    expect(source).toContain('const pollId = window.setInterval(')
    expect(source).toContain('refreshCanonicalLive,')
    expect(source).toContain('LIVE_POLL_INTERVAL_MS,')
    expect(source).toContain('window.clearInterval(pollId)')
  })

  it('refreshes when the member returns to the dashboard', () => {
    expect(source).toContain(
      "document.addEventListener('visibilitychange', handleVisibilityChange)",
    )
    expect(source).toContain(
      "window.addEventListener('focus', refreshCanonicalLive)",
    )
    expect(source).toContain(
      "document.visibilityState === 'visible'",
    )
  })

  it('cleans up browser listeners when the dashboard unmounts', () => {
    expect(source).toContain(
      "document.removeEventListener('visibilitychange', handleVisibilityChange)",
    )
    expect(source).toContain(
      "window.removeEventListener('focus', refreshCanonicalLive)",
    )
  })
})