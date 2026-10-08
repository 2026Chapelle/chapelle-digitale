import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getRetreat: vi.fn(),
  schema: vi.fn(),
  signedUrl: vi.fn(),
}))

vi.mock('@/lib/mahanaim/member-retreats-server', () => ({
  getMemberRetreatBySlug: mocks.getRetreat,
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    schema: mocks.schema,
    storage: {
      from: () => ({ createSignedUrl: mocks.signedUrl }),
    },
  },
}))

import { GET } from './route'

const dayId = '123e4567-e89b-42d3-a456-426614174000'
const resourceId = '123e4567-e89b-42d3-a456-426614174001'

function request(id?: string) {
  const url = new URL('https://example.test/api/member/mahanaim/resources')
  url.searchParams.set('dayId', dayId)
  if (id) url.searchParams.set('resourceId', id)
  return new NextRequest(url)
}

function setRows(rows: unknown[]) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  const from = vi.fn().mockReturnValue(query)
  mocks.schema.mockReturnValue({ from })
  return { query, from }
}

describe('Mahanaïm — accès autorisés aux ressources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRetreat.mockResolvedValue({
      status: 'ok',
      retreat: {
        enrolled: true,
        days: [{ id: dayId, isUnlocked: true }],
      },
    })
  })

  it('lit les ressources sans révéler les chemins privés', async () => {
    const { query } = setRows([{
      id: resourceId,
      resource_type: 'pdf',
      session_type: null,
      title: 'Guide de prière',
      resource_url: null,
      storage_path: `mahanaim/chambre-haute-2026/${dayId}/guide.pdf`,
      scheduled_time: null,
    }])

    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data[0].isPrivate).toBe(true)
    expect(body.data[0].url).toBeNull()
    expect(JSON.stringify(body)).not.toContain('storage_path')
    expect(query.eq).toHaveBeenCalledWith('day_id', dayId)
  })

  it('limite la recherche de téléchargement à la journée et à la ressource', async () => {
    const { query } = setRows([])

    const response = await GET(request(resourceId))

    expect(response.status).toBe(404)
    expect(query.eq).toHaveBeenCalledWith('day_id', dayId)
    expect(query.eq).toHaveBeenCalledWith('id', resourceId)
    expect(mocks.signedUrl).not.toHaveBeenCalled()
  })

  it('délivre un lien signé de 60 secondes pour un PDF privé autorisé', async () => {
    const storagePath = `mahanaim/chambre-haute-2026/${dayId}/guide.pdf`
    setRows([{
      id: resourceId,
      resource_type: 'pdf',
      session_type: null,
      title: 'Guide de prière',
      resource_url: null,
      storage_path: storagePath,
      scheduled_time: null,
    }])

    mocks.signedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.test/signed-document' },
      error: null,
    })

    const response = await GET(request(resourceId))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.expiresIn).toBe(60)
    expect(mocks.signedUrl).toHaveBeenCalledWith(storagePath, 60)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
})