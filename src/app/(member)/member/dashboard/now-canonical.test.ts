import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/app/(member)/member/dashboard/page.tsx'),
  'utf8',
)

describe('member dashboard MAINTENANT canonical live contract', () => {
  it('consumes the canonical live endpoint without duplicating live detection', () => {
    expect(source).toContain("fetch('/api/live/canonical'")
    expect(source).not.toContain(".from('cms_lives')")
    expect(source).not.toContain('detectYouTubeLive')
  })
})