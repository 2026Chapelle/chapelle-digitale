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

const p03SecurityMigrationPath =
  resolve(
    process.cwd(),
    'supabase/migrations/20261015113000_mahanaim_p03_security_hardening.sql',
  )

function catalogMigrationSource(): string {
  return readFileSync(
    catalogMigrationPath,
    'utf8',
  )
}

function p03SecurityMigrationSource(): string {
  return readFileSync(
    p03SecurityMigrationPath,
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
      'loads the metadata-only day catalog through the authenticated session before privileged content reads',
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

        expect(code).toContain('const isEnrolled')
        expect(code).toContain('if (isEnrolled)')
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
      'requires individual enrollment regardless of the retreat access type',
      () => {
        const migration = p03SecurityMigrationSource().toLowerCase()
        const policyStart = migration.indexOf('alter policy mah_retreat_days_read')
        const policy = migration.slice(policyStart).replace(/\s+/g, ' ')

        expect(policyStart).toBeGreaterThanOrEqual(0)
        expect(policy).toContain('en.member_id = chapelle.current_member_id()')
        expect(policy).toMatch(/en\.status in \(\s*'registered',\s*'active',\s*'completed'\s*\)/)
        expect(policy).not.toMatch(/access_type\s*=\s*'members'/)
        expect(migration).toContain('auth.uid() is not null')
        expect(migration).toContain('m.auth_user_id = auth.uid()')
      },
    )

    it(
      'keeps catalog execution restricted to authenticated and removes enrollment UPDATE from public client roles',
      () => {
        const migration = p03SecurityMigrationSource().toLowerCase()

        expect(migration).toMatch(
          /revoke\s+all\s+on\s+function\s+chapelle\.member_mahanaim_retreat_day_catalog\(text\)\s+from\s+public\s*,\s*anon/,
        )
        expect(migration).toMatch(
          /grant\s+execute\s+on\s+function\s+chapelle\.member_mahanaim_retreat_day_catalog\(text\)\s+to\s+authenticated/,
        )
        expect(migration).toMatch(
          /revoke\s+update\s+on\s+table\s+chapelle\.mahanaim_retreat_enrollments\s+from\s+public\s*,\s*anon\s*,\s*authenticated/,
        )
        expect(migration).not.toMatch(
          /grant\s+update\s+on\s+table\s+chapelle\.mahanaim_retreat_enrollments\s+to\s+(?:public|anon|authenticated)/,
        )
      },
    )

    it(
      'applies catalog ACLs after replacing the function and before the direct-day policy',
      () => {
        const migration = p03SecurityMigrationSource().toLowerCase()
        const functionEnd = migration.indexOf('$function$;')
        const revokeFunction = migration.search(
          /revoke\s+all\s+on\s+function\s+chapelle\.member_mahanaim_retreat_day_catalog\(text\)/,
        )
        const grantFunction = migration.search(
          /grant\s+execute\s+on\s+function\s+chapelle\.member_mahanaim_retreat_day_catalog\(text\)/,
        )
        const policy = migration.indexOf('alter policy mah_retreat_days_read')

        expect(functionEnd).toBeGreaterThanOrEqual(0)
        expect(revokeFunction).toBeGreaterThan(functionEnd)
        expect(grantFunction).toBeGreaterThan(revokeFunction)
        expect(policy).toBeGreaterThan(grantFunction)
      },
    )

    it(
      'keeps the serviteur exception and the Abidjan 18:00 unlock cutoff in direct day RLS',
      () => {
        const migration = p03SecurityMigrationSource().toLowerCase()
        const policyStart = migration.indexOf('alter policy mah_retreat_days_read')
        const policy = migration.slice(policyStart).replace(/\s+/g, ' ')

        expect(policy).toContain("'serviteur'::chapelle.role_key")
        expect(policy).toContain("time '18:00'")
        expect(policy).toContain('at time zone r.timezone')
        expect(policy).toContain('en.member_id = chapelle.current_member_id()')
      },
    )

    it(
      'keeps privileged content and optional CMS imagery behind the controlled enrollment path',
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

        expect(detailCode).toContain(".from('mahanaim_retreat_days')")
        expect(detailCode).toContain('retreatDayImages')
        expect(detailCode.indexOf('const isEnrolled')).toBeLessThan(detailCode.indexOf(".from('mahanaim_retreat_days')"))

        expect(
          enrollCode,
        ).toContain(
          'verifiedMemberId',
        )
      },
    )
  },
)
