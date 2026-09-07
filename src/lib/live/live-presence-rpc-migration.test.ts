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

const path = resolve(
  process.cwd(),
  'supabase/migrations/20260907224000_live_presence_runtime_functions.sql',
)

const sql = existsSync(path)
  ? readFileSync(path, 'utf8')
  : ''

const normalized = sql
  .replace(/\s+/g, ' ')
  .toLowerCase()

describe('LIVE 4A.2 atomic presence RPC migration', () => {
  it('creates join heartbeat and counts server functions', () => {
    expect(normalized).toContain(
      'create or replace function public.live_presence_join',
    )

    expect(normalized).toContain(
      'create or replace function public.live_presence_heartbeat',
    )

    expect(normalized).toContain(
      'create or replace function public.live_presence_counts',
    )
  })

  it('atomically converts guest presence into member presence', () => {
    expect(normalized).toContain(
      'on conflict (live_key, user_id)',
    )

    expect(normalized).toContain(
      "where participant_kind = 'member'",
    )

    expect(normalized).toContain(
      'delete from public.live_presence_sessions',
    )

    expect(normalized).toContain(
      "participant_kind = 'guest'",
    )

    expect(normalized).toContain(
      'guest_session_hash = p_guest_session_hash',
    )
  })

  it('keeps heartbeat non-creating unless an existing guest is promoted to a verified member', () => {
    expect(normalized).toContain(
      'create or replace function public.live_presence_heartbeat',
    )

    expect(normalized).toContain(
      'update public.live_presence_sessions',
    )

    expect(normalized).toContain(
      'select joined_at',
    )

    expect(normalized).toContain(
      'if found then',
    )
  })

  it('calculates active totals from an explicit server cutoff and cumulative unique joins', () => {
    expect(normalized).toContain(
      'last_seen_at >= p_active_since',
    )

    expect(normalized).toContain(
      "participant_kind = 'member'",
    )

    expect(normalized).toContain(
      "participant_kind = 'guest'",
    )

    expect(normalized).toContain(
      'count(*)::bigint as joined_total',
    )
  })

  it('keeps all RPCs service-role-only', () => {
    expect(normalized).toContain(
      'security definer',
    )

    expect(normalized).toContain(
      'set search_path = public, pg_temp',
    )

    expect(normalized).toContain(
      'revoke all on function public.live_presence_join(text, uuid, text) from public, anon, authenticated',
    )

    expect(normalized).toContain(
      'revoke all on function public.live_presence_heartbeat(text, uuid, text) from public, anon, authenticated',
    )

    expect(normalized).toContain(
      'revoke all on function public.live_presence_counts(text, timestamptz) from public, anon, authenticated',
    )

    expect(normalized).toContain(
      'grant execute on function public.live_presence_join(text, uuid, text) to service_role',
    )
  })

  it('does not apply or mutate legacy attendance analytics tables', () => {
    expect(normalized).not.toContain(
      'alter table chapelle.cier_presences_culte',
    )

    expect(normalized).not.toContain(
      'alter table public.analytics_sessions',
    )

    expect(normalized).not.toContain(
      'alter table public.live_streams',
    )
  })
})