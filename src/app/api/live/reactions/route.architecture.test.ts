import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const route = readFileSync(resolve(process.cwd(), 'src/app/api/live/reactions/route.ts'), 'utf8')

describe('LIVE reaction route architecture', () => {
  it('uses the Node dynamic runtime and consumes only the Task 4 reaction engine', () => {
    expect(route).toMatch(/export const runtime = 'nodejs'/)
    expect(route).toMatch(/export const dynamic = 'force-dynamic'/)
    expect(route).toMatch(/from ['"]@\/lib\/live\/live-reactions-server['"]|from ['"].*live-reactions-server['"]/)
  })

  it('does not bypass the server engine or couple reactions to presence and share', () => {
    expect(route).not.toMatch(/supabase|\.rpc\(|\.from\(/i)
    expect(route).not.toMatch(/presence|share/i)
    expect(route).not.toMatch(/rateLimit|clientIp|request\.json\(/)
  })

  it('does not derive an origin allowlist from the untrusted Host header', () => {
    expect(route).toMatch(/SITE_URL/)
    expect(route).not.toMatch(/headers\.get\(['"]host['"]\)/i)
  })
})
