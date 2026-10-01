import {
  existsSync,
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

const root = process.cwd()

const paths = {
  hub:
    'src/app/(member)/member/plateformes/mahanaim/page.tsx',

  retreats:
    'src/app/(member)/member/plateformes/mahanaim/retraites/page.tsx',

  retreat:
    'src/app/(member)/member/plateformes/mahanaim/retraites/[slug]/page.tsx',

  enrollApi:
    'src/app/api/member/mahanaim/retreats/[slug]/enroll/route.ts',

  server:
    'src/lib/mahanaim/member-retreats-server.ts',
} as const

function source(path: string): string {
  const absolute =
    resolve(root, path)

  return existsSync(absolute)
    ? readFileSync(
        absolute,
        'utf8',
      )
    : ''
}

describe(
  'Mahanaim member retreats architecture',
  () => {
    it(
      'defines the canonical member route tree',
      () => {
        expect(
          existsSync(
            resolve(root, paths.hub),
          ),
        ).toBe(true)

        expect(
          existsSync(
            resolve(root, paths.retreats),
          ),
        ).toBe(true)

        expect(
          existsSync(
            resolve(root, paths.retreat),
          ),
        ).toBe(true)
      },
    )

    it(
      'defines one member-only enrollment endpoint',
      () => {
        expect(
          existsSync(
            resolve(
              root,
              paths.enrollApi,
            ),
          ),
        ).toBe(true)
      },
    )

    it(
      'keeps Mahanaim persistence in one server-only service',
      () => {
        const code =
          source(paths.server)

        expect(code).toContain(
          "import 'server-only'",
        )

        expect(code).toContain(
          'getVerifiedRouteProfile',
        )

        expect(code).toContain(
          "schema('chapelle')",
        )

        expect(code).toContain(
          "'mahanaim_retreats'",
        )

        expect(code).toContain(
          "'mahanaim_retreat_days'",
        )

        expect(code).toContain(
          "'mahanaim_retreat_enrollments'",
        )
      },
    )

    it(
      'never accepts member identity from the enrollment request body',
      () => {
        const code =
          source(paths.enrollApi)

        expect(code).not.toMatch(
          /\bmember_id\b/,
        )

        expect(code).not.toMatch(
          /\buser_id\b/,
        )

        expect(code).not.toMatch(
          /\bretreat_id\b/,
        )

        expect(code).toContain(
          'enrollMemberInRetreat',
        )
      },
    )

    it(
      'binds the first retreat UI to its canonical slug',
      () => {
        const code =
          source(paths.retreat)

        expect(code).toContain(
          'chambre-haute-2026',
        )

        expect(code).toContain(
          'JE PARTICIPE AUX 10 JOURS',
        )
      },
    )
  },
)