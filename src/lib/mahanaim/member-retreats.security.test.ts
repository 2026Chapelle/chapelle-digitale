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
      'loads retreat days through the authenticated session so daily unlock RLS cannot be bypassed',
      () => {
        const code =
          functionSource(
            'getMemberRetreatBySlug',
            'enrollMemberInRetreat',
          )

        expect(code).toContain(
          "'mahanaim_retreat_days'",
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