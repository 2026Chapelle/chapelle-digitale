import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('LIVE 4A.1 canonical architecture', () => {
  it('delegates the route to a reusable server canonical resolver', () => {
    const routePath = resolve(process.cwd(), 'src/app/api/live/canonical/route.ts')
    const helperPath = resolve(process.cwd(), 'src/lib/live/canonical-server.ts')

    const route = readFileSync(routePath, 'utf8')
    const helper = existsSync(helperPath) ? readFileSync(helperPath, 'utf8') : ''

    expect(route).toContain(
      "import { getCanonicalLiveState } from '@/lib/live/canonical-server'",
    )

    expect(route).not.toContain("import { cmsList }")
    expect(route).not.toContain("import { detectYouTubeLive }")

    expect(helper).toContain(
      'export async function getCanonicalLiveState',
    )

    expect(helper).toContain(
      'export function liveKeyFromState',
    )
  })
})