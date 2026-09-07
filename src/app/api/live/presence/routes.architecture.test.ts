import {
  existsSync,
  readFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import {
  describe,
  expect,
  it,
} from 'vitest'

function source(path: string) {
  const absolute = resolve(
    process.cwd(),
    path,
  )

  return existsSync(absolute)
    ? readFileSync(absolute, 'utf8')
    : ''
}

describe('LIVE 4A.3 public presence API architecture', () => {
  it('creates the three expected public route handlers', () => {
    const presence = source(
      'src/app/api/live/presence/route.ts',
    )

    const join = source(
      'src/app/api/live/presence/join/route.ts',
    )

    const heartbeat = source(
      'src/app/api/live/presence/heartbeat/route.ts',
    )

    expect(presence).toContain(
      'export async function GET',
    )

    expect(join).toContain(
      'export async function POST',
    )

    expect(heartbeat).toContain(
      'export async function POST',
    )
  })

  it('keeps every presence API dynamic and no-store oriented', () => {
    for (const path of [
      'src/app/api/live/presence/route.ts',
      'src/app/api/live/presence/join/route.ts',
      'src/app/api/live/presence/heartbeat/route.ts',
    ]) {
      const text = source(path)

      expect(text).toContain(
        "export const dynamic = 'force-dynamic'",
      )

      expect(text).toContain(
        'no-store',
      )
    }
  })
})