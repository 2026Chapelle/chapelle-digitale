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

const serverPath =
  resolve(
    process.cwd(),
    'src/lib/mahanaim/member-retreats-server.ts',
  )

const source =
  readFileSync(
    serverPath,
    'utf8',
  )

const catalogMigrationPath =
  resolve(
    process.cwd(),
    'supabase/migrations/20261005110000_mahanaim_retreat_day_catalog.sql',
  )

function catalogMigrationSource(): string {
  return readFileSync(
    catalogMigrationPath,
    'utf8',
  )
}

function functionSource(
  name: string,
  nextName: string,
): string {
  const start =
    source.indexOf(
      `export async function ${name}`,
    )

  const end =
    source.indexOf(
      `export async function ${nextName}`,
      start + 1,
    )

  if (start < 0) {
    return ''
  }

  if (end < 0) {
    return source.slice(start)
  }

  return source.slice(
    start,
    end,
  )
}

describe(
  'Mahanaim member retreat RLS security',
  () => {
    it(
      'uses the authenticated Server Component client for member-visible reads',
      () => {
        expect(source).toContain(
          "createServerClient",
        )

        expect(source).toContain(
          "from '@/lib/supabase-server'",
        )
      },
    )

    it(
      'lists retreats through the authenticated session so RLS remains active',
      () => {
        const code =
          functionSource(
            'listMemberRetreats',
            'getMemberRetreatBySlug',
          )

        expect(code).toContain(
          'createServerClient()',
        )

        expect(code).toContain(
          "schema('chapelle')",
        )

        expect(code).not.toContain(
          "supabaseAdmin.schema('chapelle')",
        )
      },
    )

    it(
      'loads the metadata-only day catalog through the authenticated session',
      () => {
        const code =
          functionSource(
            'getMemberRetreatBySlug',
            'enrollMemberInRetreat',
          )

        expect(code).toContain(
          "'member_mahanaim_retreat_day_catalog'",
        )

        expect(code).toContain(
          'createServerClient()',
        )

        expect(code).not.toContain(
          "supabaseAdmin.schema('chapelle')",
        )
      },
    )

    it(
      'defines a least-privilege catalog without changing full-content RLS',
      () => {
        const migration =
          catalogMigrationSource()

        expect(migration).toContain(
          'security definer',
        )

        expect(migration).toContain(
          "set search_path = chapelle, public, pg_temp",
        )

        expect(migration).toContain(
          'auth.uid()',
        )

        expect(migration).toContain(
          "en.status in ('registered', 'active', 'completed')",
        )

        expect(migration).toMatch(
          /revoke all on function chapelle\.member_mahanaim_retreat_day_catalog\(text\)\s+from public/,
        )

        expect(migration).toMatch(
          /grant execute on function chapelle\.member_mahanaim_retreat_day_catalog\(text\)\s+to authenticated/,
        )

        expect(migration).not.toMatch(
          /(?:create|alter|drop)\s+policy/i,
        )

        expect(migration).not.toContain(
          'scripture_text',
        )

        expect(migration).not.toContain(
          'meditation',
        )

        expect(migration).not.toContain(
          'objective',
        )

        expect(migration).not.toContain(
          'member_id uuid',
        )
      },
    )

    it(
      'keeps service-role access limited to the controlled enrollment path',
      () => {
        const listCode =
          functionSource(
            'listMemberRetreats',
            'getMemberRetreatBySlug',
          )

        const detailCode =
          functionSource(
            'getMemberRetreatBySlug',
            'enrollMemberInRetreat',
          )

        const enrollCode =
          functionSource(
            'enrollMemberInRetreat',
            '__end__',
          )

        expect(
          listCode,
        ).not.toContain(
          'supabaseAdmin',
        )

        expect(
          detailCode,
        ).not.toContain(
          'supabaseAdmin',
        )

        expect(
          enrollCode,
        ).toContain(
          'verifiedMemberId',
        )
      },
    )
  },
)
