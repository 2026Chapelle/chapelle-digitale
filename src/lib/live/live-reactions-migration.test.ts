import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260908120000_live_shared_reactions_foundation.sql',
)

const sql = existsSync(migrationPath)
  ? readFileSync(migrationPath, 'utf8')
  : ''

const normalized = sql.replace(/\s+/g, ' ').toLowerCase()

const tableNames = Array.from(sql.matchAll(/create table(?: if not exists)? public\.(\w+)/gi))
  .map((match) => match[1])

describe('LIVE 4B.1 shared reactions foundation migration', () => {
  it('creates only the four reaction tables', () => {
    expect(tableNames).toEqual([
      'live_reaction_runs',
      'live_reaction_actor_limits',
      'live_reaction_actor_totals',
      'live_reaction_events',
    ])
  })

  it('stores canonical runs, private actor state and anonymous events', () => {
    expect(normalized).toContain('live_key text primary key')
    expect(normalized).toContain("live_key ~ '^youtube:[a-za-z0-9_-]{11}$'")
    expect(normalized).toContain('opened_at timestamptz not null default clock_timestamp()')
    expect(normalized).toContain('closed_at timestamptz')
    expect(normalized).toContain('final_stats jsonb')
    expect(normalized).toContain('actor_key text primary key')
    expect(normalized).toContain("accepted_at timestamptz[] not null default '{}'::timestamptz[]")
    expect(normalized).toContain('primary key (live_key, actor_key, reaction)')
    expect(normalized).toContain('event_id uuid primary key default gen_random_uuid()')
    expect(normalized).toContain('create index idx_live_reaction_totals_type')
    expect(normalized).toContain('create index idx_live_reaction_events_time')
    expect(normalized).not.toMatch(/create table[^;]*live_reaction_events[^;]*(actor_key|member_id|guest_hash|ip_address|profile)/i)
  })

  it('enforces the exact live key, actor key and five-reaction domains', () => {
    expect(normalized).toContain("^(member:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|guest:[0-9a-f]{64})$")
    expect(normalized).toContain("reaction in ('prayer', 'fire', 'heart', 'praise', 'kingdom')")
    expect(normalized).not.toContain('sparkle')
  })

  it('installs only validation primitives and closes their execution ACLs', () => {
    expect(normalized).toContain('create or replace function public.live_reaction_stats_valid(value jsonb)')
    expect(normalized).toContain('create or replace function public.live_reaction_times_valid(value timestamptz[])')
    expect(normalized).toContain('security invoker')
    expect(normalized).toContain('set search_path = pg_catalog, public, pg_temp')
    expect(normalized).toContain('revoke all on function public.live_reaction_stats_valid(jsonb) from public, anon, authenticated')
    expect(normalized).toContain('revoke all on function public.live_reaction_times_valid(timestamptz[]) from public, anon, authenticated')
    expect(normalized).toContain('grant execute on function public.live_reaction_stats_valid(jsonb) to service_role')
    expect(normalized).toContain('grant execute on function public.live_reaction_times_valid(timestamptz[]) to service_role')
    expect(normalized).not.toMatch(/create (?:or replace )?function public\.live_reaction_(?:record|snapshot|finalize)/)
  })

  it('denies browser writes, keeps private tables policy-free, and exposes only recent anonymous events', () => {
    for (const table of [
      'live_reaction_runs',
      'live_reaction_actor_limits',
      'live_reaction_actor_totals',
      'live_reaction_events',
    ]) {
      expect(normalized).toContain(`alter table public.${table} enable row level security`)
      expect(normalized).toContain(`revoke all on table public.${table} from public, anon, authenticated, service_role`)
    }

    expect(normalized).toContain('grant select, insert, update on table public.live_reaction_runs to service_role')
    expect(normalized).toContain('grant select, insert, update on table public.live_reaction_actor_limits to service_role')
    expect(normalized).toContain('grant select, insert, update on table public.live_reaction_actor_totals to service_role')
    expect(normalized).toContain('grant select, insert on table public.live_reaction_events to service_role')
    expect(normalized).toContain('grant select on table public.live_reaction_events to anon, authenticated')
    expect(normalized).toContain('create policy live_reaction_events_recent_read')
    expect(normalized).toContain("accepted_at > statement_timestamp() - interval '60 seconds'")
    expect(normalized).toContain('accepted_at <= statement_timestamp()')
    expect(normalized).not.toMatch(/create policy[^;]*(live_reaction_runs|live_reaction_actor_limits|live_reaction_actor_totals)/i)
  })

  it('uses an existing realtime publication without changing LIVE 4A', () => {
    expect(normalized).toContain('live_reactions_publication_missing')
    expect(normalized).toContain('alter publication supabase_realtime add table public.live_reaction_events')
    expect(normalized).not.toMatch(/alter table public\.live_(presence_sessions|share_actions|streams)/)
    expect(normalized).toContain('begin;')
    expect(normalized).toMatch(/commit;\s*$/)
  })
})

describe('LIVE 4B.1 test database target guard', () => {
  async function validator() {
    const harness = await import('../../../scripts/live-reactions-db-harness.mjs')

    expect(harness.validateTestDatabaseUrl).toBeTypeOf('function')

    return harness.validateTestDatabaseUrl
  }

  it('allows only local loopback PostgreSQL targets', async () => {
    const validateTestDatabaseUrl = await validator()

    for (const value of [
      'postgresql://postgres:example@127.0.0.1:54322/postgres',
      'postgres://postgres:example@localhost:54322/postgres',
      'postgresql://postgres:example@[::1]:54322/postgres',
    ]) {
      expect(() => validateTestDatabaseUrl(value)).not.toThrow()
    }
  })

  it('rejects missing, malformed, non-PostgreSQL and remote targets without echoing secrets', async () => {
    const validateTestDatabaseUrl = await validator()
    const rejected = [
      undefined,
      '   ',
      'not a url',
      'https://127.0.0.1:54322/postgres',
      'postgresql://postgres:example@db.example.test:54322/postgres',
      'postgresql://postgres:example@db.nvyuyffywnuollaxguen.supabase.co:54322/postgres',
      'postgresql://postgres.nvyuyffywnuollaxguen:example@127.0.0.1:54322/postgres',
      'postgresql://postgres:example@db.example.test:54322/test',
    ]

    for (const value of rejected) {
      let message = ''

      try {
        validateTestDatabaseUrl(value)
      } catch (error) {
        message = error instanceof Error ? error.message : String(error)
      }

      expect(message).not.toBe('')
      expect(message).not.toContain('example')
      expect(message).not.toContain('nvyuyffywnuollaxguen')
      expect(message).not.toContain('postgresql://')
    }
  })
})

describe('LIVE 4B.1 SQL transaction framing', () => {
  async function frameSqlTransaction() {
    const harness = await import('../../../scripts/live-reactions-db-harness.mjs')

    expect(harness.frameSqlTransaction).toBeTypeOf('function')

    return harness.frameSqlTransaction
  }

  it('terminates caller SQL once before commit for both one-shot and session paths', async () => {
    const frame = await frameSqlTransaction()

    expect(frame('select 1', {})).toBe('begin;  select 1;\ncommit;\n')
    expect(frame('select 2;', {})).toBe('begin;  select 2;\ncommit;\n')
    expect(frame('select 3; \t\n', {})).toBe('begin;  select 3;\ncommit;\n')
    expect(frame('select 4', { role: 'anon', marker: '__test_marker__' }))
      .toBe('begin; set local role anon; select 4;\ncommit;\n\\echo __test_marker__\n')
  })
})

describe('LIVE 4B.1 harness CLI entrypoint', () => {
  it('rejects a missing test database target before starting psql', () => {
    const { LIVE_REACTIONS_TEST_DATABASE_URL: _databaseUrl, ...environment } = process.env
    const result = spawnSync(
      process.execPath,
      ['scripts/live-reactions-db-harness.mjs', 'apply-foundation'],
      { cwd: process.cwd(), encoding: 'utf8', env: environment },
    )

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('LIVE reactions test database target is required')
    expect(result.stderr).not.toContain('psql could not start')
  })
})
