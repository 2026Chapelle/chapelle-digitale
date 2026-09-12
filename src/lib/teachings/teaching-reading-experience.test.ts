import fs from 'node:fs'
import path from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vitest'

const root =
  process.cwd()

const accessServer =
  fs.readFileSync(
    path.join(
      root,
      'src/lib/teachings/teaching-access-server.ts',
    ),
    'utf8',
  )

const detailPage =
  fs.readFileSync(
    path.join(
      root,
      'src/app/(public)/enseignements/[slug]/page.tsx',
    ),
    'utf8',
  )

describe(
  'teaching reading experience',
  () => {
    it(
      'resolves a teaching by slug',
      () => {
        expect(
          accessServer,
        ).toContain(
          'getTeachingReadingBySlug',
        )
      },
    )

    it(
      'loads teaching series and season',
      () => {
        expect(
          accessServer,
        ).toContain(
          'cms_teaching_series',
        )

        expect(
          accessServer,
        ).toContain(
          'cms_teaching_seasons',
        )
      },
    )

    it(
      'scopes previous and next to season',
      () => {
        expect(
          accessServer,
        ).toContain(
          ".eq('season_id', identity.season_id)",
        )
      },
    )

    it(
      'uses a Citadelle detail route',
      () => {
        expect(
          detailPage,
        ).toContain(
          'Bibliothèque du Royaume',
        )

        expect(
          detailPage,
        ).toContain(
          'youtube-nocookie.com/embed',
        )
      },
    )

    it(
      'does not expose a raw YouTube outbound link',
      () => {
        expect(
          detailPage,
        ).not.toContain(
          'target="_blank"',
        )
      },
    )
  },
)
describe(
  'premium catalogue',
  () => {
    const cataloguePage =
      fs.readFileSync(
        path.join(
          root,
          'src/app/(public)/enseignements/page.tsx',
        ),
        'utf8',
      )

    const catalogueCard =
      fs.readFileSync(
        path.join(
          root,
          'src/components/teachings/TeachingCatalogCard.tsx',
        ),
        'utf8',
      )

    const libraryServer =
      fs.readFileSync(
        path.join(
          root,
          'src/lib/teachings/teaching-library-server.ts',
        ),
        'utf8',
      )

    it(
      'uses internal detail links instead of inline player',
      () => {
        expect(
          catalogueCard,
        ).toContain(
          'href={`/enseignements/${slug}`}',
        )

        expect(
          cataloguePage,
        ).not.toContain(
          '<iframe',
        )
      },
    )

    it(
      'shows teaching series and season',
      () => {
        expect(
          cataloguePage,
        ).toContain(
          'library.series',
        )

        expect(
          libraryServer,
        ).toContain(
          'cms_teaching_series',
        )

        expect(
          libraryServer,
        ).toContain(
          'cms_teaching_seasons',
        )
      },
    )

    it(
      'keeps the catalogue compact',
      () => {
        expect(
          cataloguePage,
        ).not.toContain(
          'Lire l&apos;enseignement',
        )

        expect(
          cataloguePage,
        ).not.toContain(
          '<details',
        )
      },
    )

    it(
      'catalogue server loads teaching taxonomy',
      () => {
        expect(
          accessServer,
        ).toContain(
          'cms_teaching_series',
        )

        expect(
          accessServer,
        ).toContain(
          'cms_teaching_seasons',
        )
      },
    )
  },
)
describe(
  'secure reading navigation',
  () => {
    it(
      'loads only published series and seasons',
      () => {
        expect(
          accessServer,
        ).toContain(
          ".eq('status', 'published')",
        )
      },
    )

    it(
      'loads sibling access levels',
      () => {
        expect(
          accessServer,
        ).toContain(
          "'slug, title, sort_order, access_level'",
        )
      },
    )

    it(
      'filters previous and next through canonical access rules',
      () => {
        expect(
          accessServer,
        ).toContain(
          'decideTeachingAccess(',
        )

        expect(
          accessServer,
        ).toContain(
          'item.access_level',
        )
      },
    )
  },
)