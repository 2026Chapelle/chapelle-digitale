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
