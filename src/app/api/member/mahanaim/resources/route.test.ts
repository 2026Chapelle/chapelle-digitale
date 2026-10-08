import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getRetreat: vi.fn(),
  schema: vi.fn(),
}))

vi.mock('@/lib/mahanaim/member-retreats-server', () => ({
  getMemberRetreatBySlug: mocks.getRetreat,
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    schema: mocks.schema,
  },
}))

import { GET } from './route'

const dayId = '123e4567-e89b-42d3-a456-426614174000'

function request(resourceId?: string) {
  const url = new URL('https://example.test/api/member/mahanaim/resources')
  url.searchParams.set('dayId', dayId)
  if (resourceId) url.searchParams.set('resourceId', resourceId)
  return new NextRequest(url)
}

describe('Mahanaïm — sécurité des ressources membres', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refuse un visiteur non connecté avant toute requête service role', async () => {
    mocks.getRetreat.mockResolvedValue({ status: 'identity_required' })

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(mocks.schema).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('refuse un membre non inscrit', async () => {
    mocks.getRetreat.mockResolvedValue({
      status: 'ok',
      retreat: { enrolled: false, days: [] },
    })

    const response = await GET(request())

    expect(response.status).toBe(403)
    expect(mocks.schema).not.toHaveBeenCalled()
  })

  it('refuse une journée verrouillée avant tout accès aux documents', async () => {
    mocks.getRetreat.mockResolvedValue({
      status: 'ok',
      retreat: {
        enrolled: true,
        days: [{ id: dayId, isUnlocked: false }],
      },
    })

    const response = await GET(request())

    expect(response.status).toBe(403)
    expect(mocks.schema).not.toHaveBeenCalled()
  })

  it('refuse aussi le téléchargement direct pour une journée verrouillée', async () => {
    mocks.getRetreat.mockResolvedValue({
      status: 'ok',
      retreat: {
        enrolled: true,
        days: [{ id: dayId, isUnlocked: false }],
      },
    })

    const resourceId = '123e4567-e89b-42d3-a456-426614174001'
    const response = await GET(request(resourceId))

    expect(response.status).toBe(403)
    expect(mocks.schema).not.toHaveBeenCalled()
  })
})