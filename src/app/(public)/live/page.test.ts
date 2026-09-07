import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/app/(public)/live/page.tsx'), 'utf8')

describe('live canonical resolver integration', () => {
  it('uses the shared resolver instead of duplicating live status selection', () => {
    expect(source).toContain("from '@/lib/home/contextual'")
    expect(source).toContain('resolveLiveState(data as any[])')
    expect(source).not.toContain("data.find((d: any) => d.status === 'live' || d.is_live)")
  })
})

describe('live automatic canonical refresh', () => {
  it('polls the canonical live state every 15 seconds while /live stays open', () => {
    expect(source).toContain('const LIVE_POLL_INTERVAL_MS = 15_000')
    expect(source).toContain('const refreshCanonicalLive = async () =>')
    expect(source).toContain(
      'window.setInterval(refreshCanonicalLive, LIVE_POLL_INTERVAL_MS)'
    )
  })

  it('rechecks immediately when the visitor returns to the live page', () => {
    expect(source).toContain(
      "window.addEventListener('focus', refreshCanonicalLive)"
    )
    expect(source).toContain(
      "document.addEventListener('visibilitychange', onVisibilityChange)"
    )
    expect(source).toContain(
      "if (document.visibilityState === 'visible') refreshCanonicalLive()"
    )
  })

  it('cleans up automatic live watchers when the page is left', () => {
    expect(source).toContain('window.clearInterval(pollId)')
    expect(source).toContain(
      "window.removeEventListener('focus', refreshCanonicalLive)"
    )
    expect(source).toContain(
      "document.removeEventListener('visibilitychange', onVisibilityChange)"
    )
  })
})
