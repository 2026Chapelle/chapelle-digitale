import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

const route = read('src/app/api/admin/cms/[resource]/route.ts')

describe('cms_media empty document_type normalization', () => {
  it('POST converts an empty document_type to null before insert', () => {
    expect(route).toContain(
      "if (table === 'cms_media' && body.document_type === '') body.document_type = null",
    )
  })

  it('PATCH converts an empty document_type to null before update', () => {
    expect(route).toContain(
      "if (table === 'cms_media' && patch.document_type === '') patch.document_type = null",
    )
  })
})