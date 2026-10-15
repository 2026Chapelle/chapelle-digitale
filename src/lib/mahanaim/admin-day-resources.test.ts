import { describe, expect, it } from 'vitest'

import { buildMahanaimPdfPath, isValidMahanaimVideoUrl, isValidMahanaimPdfPath } from './admin-day-resources'

describe('Mahanaïm media administration validation', () => {
  it('accepts only safe HTTPS video URLs', () => {
    expect(isValidMahanaimVideoUrl('https://www.youtube.com/watch?v=abc')).toBe(true)
    expect(isValidMahanaimVideoUrl('http://video.example/replay')).toBe(false)
    expect(isValidMahanaimVideoUrl('https://user:pass@video.example/replay')).toBe(false)
    expect(isValidMahanaimVideoUrl('https://localhost/replay')).toBe(false)
    expect(isValidMahanaimVideoUrl('https://127.0.0.1/replay')).toBe(false)
  })

  it('creates the private PDF path from server-owned identifiers only', () => {
    expect(buildMahanaimPdfPath('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')).toBe('mahanaim/chambre-haute-2026/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf')
  })

  it('rejects arbitrary private storage paths', () => {
    expect(isValidMahanaimPdfPath('mahanaim/chambre-haute-2026/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf', '11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(isValidMahanaimPdfPath('documents/other-member/secret.pdf', '11111111-1111-4111-8111-111111111111')).toBe(false)
  })
})
