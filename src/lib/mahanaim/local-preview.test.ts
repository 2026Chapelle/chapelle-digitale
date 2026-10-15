import { describe, expect, it } from 'vitest'

import { isMahanaimLocalPreviewEnabled } from './local-preview'

describe('Mahanaïm local preview guard', () => {
  it('requires both explicit opt-in and a development runtime', () => {
    expect(isMahanaimLocalPreviewEnabled({ NODE_ENV: 'development', MAHANAIM_LOCAL_PREVIEW: '1' })).toBe(true)
    expect(isMahanaimLocalPreviewEnabled({ NODE_ENV: 'production', MAHANAIM_LOCAL_PREVIEW: '1' })).toBe(false)
    expect(isMahanaimLocalPreviewEnabled({ NODE_ENV: 'development' })).toBe(false)
  })
})
