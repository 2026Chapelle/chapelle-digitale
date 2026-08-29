import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

const route = read('src/app/api/admin/cms/[resource]/route.ts')

describe('cms_media empty slug normalization', () => {
  it('POST converts an empty slug to null before insert', () => {
    expect(route).toContain(
      "if (table === 'cms_media' && body.slug === '') body.slug = null",
    )
  })

  it('PATCH converts an empty slug to null before update', () => {
    expect(route).toContain(
      "if (table === 'cms_media' && patch.slug === '') patch.slug = null",
    )
  })
})