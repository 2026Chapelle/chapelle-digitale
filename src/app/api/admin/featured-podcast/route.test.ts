import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  isAdminRequest: mocks.isAdmin,
}))

vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}))

import { GET, POST } from './route'

const validId = '11111111-1111-4111-8111-111111111111'

function request(body?: unknown): NextRequest {
  return new Request('http://localhost/api/admin/featured-podcast', {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }) as NextRequest
}

function database(podcastStatus: string | null = 'published') {
  mocks.from.mockImplementation((table: string) => {
    if (table === 'cms_podcasts') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: podcastStatus ? { id: validId, status: podcastStatus } : null,
              error: null,
            }),
          }),
        }),
      }
    }

    if (table === 'cms_homepage_blocks') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: 'block-1', data: {} },
              error: null,
            }),
          }),
        }),
      }
    }

    throw new Error('Table inattendue')
  })
}

describe('Featured Podcast API - sécurité', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAdmin.mockReturnValue(true)
    mocks.rpc.mockResolvedValue({ error: null })
    database()
  })

  it('refuse un GET non autorisé', async () => {
    mocks.isAdmin.mockReturnValue(false)
    const response = await GET(request())
    expect(response.status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('refuse un POST non autorisé', async () => {
    mocks.isAdmin.mockReturnValue(false)
    const response = await POST(request({ id: validId }))
    expect(response.status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('refuse un identifiant invalide', async () => {
    const response = await POST(request({ id: 'invalide' }))
    expect(response.status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('refuse un podcast non publié', async () => {
    database('draft')
    const response = await POST(request({ id: validId }))
    expect(response.status).toBe(409)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('enregistre un podcast publié par la fonction RPC', async () => {
    const response = await POST(request({ id: validId }))
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith(
      'set_homepage_today_podcast',
      { p_podcast_id: validId },
    )
  })

  it('autorise le retour au choix automatique', async () => {
    const response = await POST(request({ id: null }))
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith(
      'set_homepage_today_podcast',
      { p_podcast_id: null },
    )
  })

  it('signale un échec RPC', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'RPC failed' } })
    const response = await POST(request({ id: validId }))
    expect(response.status).toBe(500)
  })
})