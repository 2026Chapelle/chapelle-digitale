import fs from 'node:fs'
import path from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

const root =
  process.cwd()

const detail =
  fs.readFileSync(
    path.join(
      root,
      'src/app/(public)/enseignements/[slug]/page.tsx',
    ),
    'utf8',
  )

const engagement =
  fs.readFileSync(
    path.join(
      root,
      'src/components/teachings/TeachingEngagementBar.tsx',
    ),
    'utf8',
  )

describe(
  'teaching engagement experience',
  () => {
    it(
      'mounts the engagement bar below the teaching player',
      () => {
        expect(detail).toContain(
          '<TeachingEngagementBar',
        )
      },
    )

    it(
      'reuses the canonical ShareButtons component',
      () => {
        expect(engagement).toContain(
          "from '@/components/ui/ShareButtons'",
        )

        expect(engagement).toContain(
          '<ShareButtons',
        )
      },
    )

    it(
      'supports native share and copy link',
      () => {
        expect(engagement).toContain(
          'navigator.share',
        )

        expect(engagement).toContain(
          'navigator.clipboard.writeText',
        )
      },
    )

    it(
      'submits prayer through the existing prayer API',
      () => {
        expect(engagement).toContain(
          "'/api/prieres'",
        )
      },
    )

    it(
      'forces teaching prayer requests to remain private',
      () => {
        expect(engagement).toContain(
          'is_public: false',
        )
      },
    )

    it(
      'does not create a second prayer endpoint',
      () => {
        expect(engagement).not.toContain(
          '/api/enseignements/prayer',
        )
      },
    )

    it(
      'uses an accessible prayer dialog',
      () => {
        expect(engagement).toContain(
          'role="dialog"',
        )

        expect(engagement).toContain(
          'aria-modal="true"',
        )
      },
    )
  },
)