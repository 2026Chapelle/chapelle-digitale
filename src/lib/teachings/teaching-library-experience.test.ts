import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

describe('teaching library hierarchy experience', () => {
  it('makes series the primary public library level', () => {
    const source = read('src/app/(public)/enseignements/page.tsx')
    expect(source).toContain('Séries d’enseignement')
    expect(source).toContain('/enseignements/series/')
  })

  it('provides a public series route', () => {
    const source = read('src/app/(public)/enseignements/series/[seriesSlug]/page.tsx')
    expect(source).toContain('Saisons')
    expect(source).toContain('saison-${season.season_number}')
  })

  it('provides a public season route', () => {
    const source = read('src/app/(public)/enseignements/series/[seriesSlug]/[seasonKey]/page.tsx')
    expect(source).toContain('TeachingCatalogCard')
  })

  it('keeps standalone teachings visible', () => {
    const source = read('src/app/(public)/enseignements/page.tsx')
    expect(source).toContain('Enseignements indépendants')
    expect(source).toContain('library.standalone')
  })

  it('uses published-only teaching library data', () => {
    const source = read('src/lib/teachings/teaching-library-server.ts')
    expect(source).toContain(".eq('status', 'published')")
    expect(source).toContain('listPublishedTeachingCatalog')
  })

  it('keeps admin comments content below the global header', () => {
    const source = read('src/app/(admin)/admin/teaching-comments/page.tsx')
    expect(source).toContain('pt-28')
  })
})
