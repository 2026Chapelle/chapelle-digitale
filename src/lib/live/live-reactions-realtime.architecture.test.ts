import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/lib/live/live-reactions-realtime.ts'), 'utf8')

describe('reaction Realtime architecture', () => {
  it('uses only INSERT Postgres Changes for the public event table', () => {
    expect(source).toMatch(/postgres_changes/)
    expect(source).toMatch(/event:\s*'INSERT'/)
    expect(source).toMatch(/schema:\s*'public'/)
    expect(source).toMatch(/table:\s*'live_reaction_events'/)
  })

  it('has no server/admin, database write, presence, or Broadcast coupling', () => {
    expect(source).not.toMatch(/supabaseAdmin|service.?role|\.from\(|\.rpc\(/i)
    expect(source).not.toMatch(/presence|broadcast|\.send\(|\.track\(/i)
    expect(source).not.toMatch(/live_reaction_runs|live_reaction_actor_limits|live_reaction_actor_totals/)
  })
})
