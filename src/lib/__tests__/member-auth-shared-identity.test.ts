import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createRouteClient: vi.fn(),
  createServerClient: vi.fn(),
  adminFrom: vi.fn(),
  serverFrom: vi.fn(),
}))

vi.mock('@/lib/supabase-server', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  createRouteClient: mocks.createRouteClient,
  createServerClient: mocks.createServerClient,
}))

vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
}))
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mocks.adminFrom },
}))
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => ({ auth: { getUser: mocks.getUser } })),
  createServerComponentClient: vi.fn(() => ({
    auth: { getUser: mocks.getUser },
    from: mocks.serverFrom,
  })),
}))

import { getSessionProfile } from '@/lib/member-auth'
import { getServerProfile } from '@/lib/supabase-server'

describe('shared verified server identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'unverified-user', role: 'membre' }, error: null }),
    }
    mocks.serverFrom.mockReturnValue(profileQuery)
    mocks.adminFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'unverified-user', role: 'membre' }, error: null }),
        }),
      }),
    })
    mocks.createRouteClient.mockReturnValue({ auth: { getUser: mocks.getUser } })
    mocks.createServerClient.mockReturnValue({
      auth: { getUser: mocks.getUser },
      from: mocks.serverFrom,
    })
  })

  it('rejects a Route Handler identity when getUser returns an error, even with a user object', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'unverified-user', email: 'member@example.test' } },
      error: new Error('verification failed'),
    })

    await expect(getSessionProfile()).resolves.toBeNull()
    expect(mocks.adminFrom).not.toHaveBeenCalled()
  })

  it('rejects a Server Component identity when getUser returns an error, even with a user object', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'unverified-user', email: 'member@example.test' } },
      error: new Error('verification failed'),
    })

    await expect(getServerProfile()).resolves.toBeNull()
    expect(mocks.serverFrom).not.toHaveBeenCalled()
  })
})
