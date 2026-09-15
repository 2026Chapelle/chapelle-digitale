import {
  readFileSync,
} from 'node:fs'

import {
  resolve,
} from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

const migration =
  readFileSync(
    resolve(
      process.cwd(),
      'supabase/migrations/20260913160000_live4c_replay_vivant_foundation.sql',
    ),
    'utf8',
  )

describe('LIVE 4C cult notebook migration contract', () => {
  it('uses the validated V1 kinds and removes bookmark', () => {
    expect(migration).toContain(
      "check (kind in ('note', 'received_word', 'scripture', 'decision', 'meditation'))",
    )

    expect(migration).not.toContain(
      "check (kind in ('note', 'bookmark', 'scripture'))",
    )
  })

  it('keeps private service-role-only persistence', () => {
    expect(migration).toContain(
      'alter table public.live_cult_notes enable row level security;',
    )

    expect(migration).toContain(
      'revoke all on table public.live_cult_notes',
    )

    expect(migration).toContain(
      'grant all on table public.live_cult_notes',
    )
  })
})
