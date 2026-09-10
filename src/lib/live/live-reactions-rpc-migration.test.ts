import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
const path = resolve(process.cwd(), 'supabase/migrations/20260908123000_live_shared_reactions_runtime_functions.sql')
const sql = existsSync(path) ? readFileSync(path, 'utf8').replace(/\s+/g, ' ').toLowerCase() : ''
const adminBody = sql.match(/function public\.live_reaction_admin_counts[\s\S]*?as \$\$(.*?)\$\$/)?.[1] ?? ''
describe('LIVE 4B.2 transactional reaction RPC migration', () => {
  it('installs only the five invoker runtime functions with lock-first database-time admission', () => {
    for (const name of ['live_reaction_window', 'live_reaction_record', 'live_reaction_snapshot', 'live_reaction_admin_counts', 'live_reaction_finalize']) expect(sql).toContain(`function public.${name}`)
    expect(sql).toContain('security invoker')
    expect(sql).toContain("set local lock_timeout = '1s'")
    expect(sql).toMatch(/for share.*for update.*clock_timestamp/i)
    expect(sql).toContain("s > p_time - interval '10 seconds' and s <= p_time")
    expect(sql).toContain('rate_limited')
    expect(sql).toContain('on conflict (live_key, actor_key, reaction) do update')
    expect(sql).toMatch(/insert into public\.live_reaction_events\s*\(\s*live_key\s*,\s*reaction\s*,\s*accepted_at\s*\)/)
    expect(sql).toContain('revoke all on function public.live_reaction_record')
    expect(sql).toContain('grant execute on function public.live_reaction_record')
  })

  it('returns identity-free aggregates and freezes them under an idempotent closed run', () => {
    expect(sql).toMatch(/function public\.live_reaction_snapshot\(p_live_key text\) returns jsonb language plpgsql security invoker/)
    expect(sql).toMatch(/function public\.live_reaction_admin_counts\(p_live_key text\) returns jsonb language sql security invoker/)
    expect(sql).toMatch(/function public\.live_reaction_finalize\(p_live_key text\) returns jsonb language plpgsql security invoker/)
    expect(sql).toContain("'uniqueactors'")
    expect(sql).toContain("'totalactions'")
    expect(sql).toContain("'uniquebytype'")
    expect(sql).toContain("'actionsbytype'")
    expect(sql).toContain('update public.live_reaction_runs set closed_at')
    expect(sql).toContain('final_stats')
    expect(sql).toContain('for update')
    expect(sql).toContain("'state', 'closed'")
    for (const name of ['live_reaction_window(timestamptz[], timestamptz)', 'live_reaction_snapshot(text)', 'live_reaction_admin_counts(text)', 'live_reaction_finalize(text)']) {
      expect(sql).toContain(`revoke all on function public.${name}`)
      expect(sql).toContain(`grant execute on function public.${name}`)
    }
    expect(sql).not.toMatch(/live_reaction_events\s*\([^)]*(actor_key|guest_hash|member_id|profile)/)
  })

  it('derives the identity-free admin aggregate from persisted actor totals', () => {
    expect(adminBody).toContain('from public.live_reaction_actor_totals')
    expect(adminBody).toContain('count(distinct actor_key)')
    expect(adminBody).toContain('sum(actions)')
    expect(adminBody).toContain("'uniqueactors'")
    expect(adminBody).toContain("'totalactions'")
    expect(adminBody).toContain("'uniquebytype'")
    expect(adminBody).toContain("'actionsbytype'")
    expect(adminBody).not.toContain("select '{}'::jsonb")
  })
})
