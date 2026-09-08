import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260907220000_live_real_presence_foundation.sql',
)

const sql = existsSync(migrationPath)
  ? readFileSync(migrationPath, 'utf8')
  : ''

const normalized = sql
  .replace(/\s+/g, ' ')
  .toLowerCase()

describe('LIVE 4A.1 presence migration', () => {
  it('creates dedicated presence and share tables', () => {
    expect(normalized).toContain(
      'create table if not exists public.live_presence_sessions',
    )

    expect(normalized).toContain(
      'create table if not exists public.live_share_actions',
    )

    expect(normalized).toContain(
      "participant_kind in ('member','guest')",
    )

    expect(normalized).toContain(
      "action_kind in ('native_share','copy_link')",
    )

    expect(normalized).toContain(
      "guest_session_hash ~ '^[0-9a-f]{64}$'",
    )
  })

  it('deduplicates members and guests per live', () => {
    expect(normalized).toContain(
      'create unique index if not exists idx_live_presence_member_unique',
    )

    expect(normalized).toContain(
      'create unique index if not exists idx_live_presence_guest_unique',
    )

    expect(normalized).toContain(
      'on public.live_presence_sessions (live_key, user_id)',
    )

    expect(normalized).toContain(
      'on public.live_presence_sessions (live_key, guest_session_hash)',
    )
  })

  it('supports active presence with last_seen_at', () => {
    expect(normalized).toContain(
      'last_seen_at timestamptz not null default now()',
    )

    expect(normalized).toContain(
      'create index if not exists idx_live_presence_last_seen',
    )

    expect(normalized).toContain(
      'create index if not exists idx_live_presence_kind_last_seen',
    )
  })

  it('denies browser table access and grants service_role', () => {
    expect(normalized).toContain(
      'alter table public.live_presence_sessions enable row level security',
    )

    expect(normalized).toContain(
      'alter table public.live_share_actions enable row level security',
    )

    expect(normalized).toContain(
      'revoke all on table public.live_presence_sessions from anon, authenticated',
    )

    expect(normalized).toContain(
      'revoke all on table public.live_share_actions from anon, authenticated',
    )

    expect(normalized).toContain(
      'to service_role',
    )
  })

  it('does not alter legacy attendance analytics or live tables', () => {
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