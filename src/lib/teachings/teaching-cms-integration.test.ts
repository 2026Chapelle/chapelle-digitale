import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  readFileSync,
} from 'node:fs'

import {
  resolve,
} from 'node:path'

const read = (path: string) =>
  readFileSync(
    resolve(process.cwd(), path),
    'utf8',
  )

describe('LOT ENSEIGNEMENTS 1 — CMS integration', () => {
  it('registers teaching series and seasons as canonical CMS resources', () => {
    const source = read('src/lib/cms.ts')

    expect(source).toContain(
      "'cms_teaching_series'",
    )

    expect(source).toContain(
      "'cms_teaching_seasons'",
    )

    expect(source).toContain(
      'export interface CmsTeachingSeries',
    )

    expect(source).toContain(
      'export interface CmsTeachingSeason',
    )
  })

  it('connects Série → Saison in the teaching form', () => {
    const source = read(
      'src/app/(admin)/admin/enseignements/page.tsx',
    )

    expect(source).toContain(
      "refResource: 'teaching_series'",
    )

    expect(source).toContain(
      "clears: ['season_id']",
    )

    expect(source).toContain(
      "refResource: 'teaching_seasons'",
    )

    expect(source).toContain(
      "requires: 'series_id'",
    )

    expect(source).toContain(
      'r.series_id === ed.series_id',
    )
  })

  it('exposes canonical access and featured controls', () => {
    const source = read(
      'src/app/(admin)/admin/enseignements/page.tsx',
    )

    expect(source).toContain(
      "name: 'access_level'",
    )

    expect(source).toContain(
      "{ value: 'public',",
    )

    expect(source).toContain(
      "{ value: 'member',",
    )

    expect(source).toContain(
      "{ value: 'premium',",
    )

    expect(source).toContain(
      "name: 'is_featured'",
    )

    expect(source).toContain(
      "type: 'boolean'",
    )
  })

  it('creates dedicated teaching series and seasons admin pages', () => {
    const series = read(
      'src/app/(admin)/admin/teaching-series/page.tsx',
    )

    const seasons = read(
      'src/app/(admin)/admin/teaching-seasons/page.tsx',
    )

    expect(series).toContain(
      'resource="teaching_series"',
    )

    expect(seasons).toContain(
      'resource="teaching_seasons"',
    )

    expect(seasons).toContain(
      "refResource: 'teaching_series'",
    )
  })

  it('adds server-side hierarchy validation to generic CMS writes', () => {
    const source = read(
      'src/app/api/admin/cms/[resource]/route.ts',
    )

    expect(source).toContain(
      "table === 'cms_teachings'",
    )

    expect(source).toContain(
      "table === 'cms_teaching_seasons'",
    )

    expect(source).toContain(
      'assertTeachingSpine',
    )

    expect(source).toContain(
      'checkTeachingSpineConsistency',
    )
  })

  it('adds teaching series and seasons to admin navigation', () => {
    const source = read(
      'src/lib/navigation/admin-nav.ts',
    )

    expect(source).toContain(
      "href: '/admin/teaching-series'",
    )

    expect(source).toContain(
      "href: '/admin/teaching-seasons'",
    )
  })

  it('never reuses podcast series or seasons in the teaching admin form', () => {
    const source = read(
      'src/app/(admin)/admin/enseignements/page.tsx',
    )

    expect(source).not.toContain(
      "refResource: 'podcast_series'",
    )

    expect(source).not.toContain(
      "refResource: 'podcast_seasons'",
    )
  })
})