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
vi.mock('@/lib/formations/parcours-gate-server', () => ({ parcoursGate: vi.fn() }))
vi.mock('@/lib/formations/statut-progression', () => ({ computeCommunityIntegration: vi.fn() }))
vi.mock('@/lib/formations/integration-progress-server', () => ({ ensureIntegrationCertificate: vi.fn() }))
vi.mock('@/lib/formations/video-validation', () => ({ WATCH_THRESHOLD: 90, hasPlayableVideo: vi.fn() }))
vi.mock('@/lib/formations/module-daily-unlock', () => ({ evaluateDailyLock: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ can: vi.fn() }))
vi.mock('@/lib/notifications/events', () => ({
  notifyModuleCompleted: vi.fn(),
  notifyParcoursCompleted: vi.fn(),
  notifyCertificate: vi.fn(),
  notifyAcademieUnlocked: vi.fn(),
}))

import { NextRequest } from 'next/server'
import { POST } from './route'

describe('POST /api/member/formations/progress identity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createRouteClient.mockReturnValue({ auth: { getUser: mocks.getUser } })
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'unverified-user', role: 'membre' },
            error: null,
          }),
        }),
      }),
    })
  })

  it('returns 401 before mutation when getUser verification fails, regardless of body user_id', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'unverified-user' } },
      error: new Error('verification failed'),
    })
    const request = new NextRequest('https://citadelle.test/api/member/formations/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: 'attacker-selected-user', module_id: 'module-1', formation_id: 'formation-1' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
