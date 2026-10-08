import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createRouteClient: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/supabase-server', () => ({ createRouteClient: mocks.createRouteClient }))
vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
}))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mocks.from },
}))

import { GET } from './route'

describe('GET /api/member/profile identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createRouteClient.mockReturnValue({ auth: { getUser: mocks.getUser } })
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'unverified-user' }, error: null }),
        }),
      }),
    })
  })

  it('returns 401 and does not query a client-supplied identity when getUser verification fails', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'unverified-user' } },
      error: new Error('verification failed'),
    })

    const response = await GET()

    expect(response.status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
