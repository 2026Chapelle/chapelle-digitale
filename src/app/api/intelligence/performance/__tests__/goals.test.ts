import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const isAdminRequest = vi.fn(() => true)
vi.mock('@/lib/admin-auth', () => ({
  isAdminRequest: () => isAdminRequest(),
}))

vi.mock('@/lib/erp/admin-profiles-scope', () => ({
  resolveAdminOrganizationForRequest: vi.fn(async () => 'org-1'),
}))

const from = vi.fn()
vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
  supabaseAdmin: { from: (...args: unknown[]) => from(...args) },
}))

vi.mock('@/lib/cache', () => ({
  cached: async (_key: string, _ttl: number, producer: () => Promise<unknown>) => producer(),
}))

vi.mock('@/lib/intelligence/connectors/youtube', () => ({
  getYouTubeData: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/intelligence/connectors/google-search-console', () => ({
  getSearchConsoleSeo: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/intelligence/connectors/google-analytics', () => ({
  getGa4OrganicSeo: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/intelligence/connectors/meta', () => ({
  getMetaFacebookStatus: vi.fn().mockResolvedValue(null),
  getMetaInstagramStatus: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/intelligence/connectors/whatsapp', () => ({
  getWhatsAppStatus: vi.fn().mockResolvedValue(null),
}))

import { GET } from '@/app/api/intelligence/performance/route'

function chain(result: unknown): any {
  const p = Promise.resolve(result)
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return p.then.bind(p)
        if (prop === 'maybeSingle') return () => p
        return () => chain(result)
      },
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequest.mockReturnValue(true)
  from.mockImplementation((table: string) => {
    if (table === 'intelligence_goals') {
      return {
        select: () => chain({
          data: [
            {
              id: 'goal-1',
              organization_id: 'org-1',
              metric_key: 'visits',
              target_value: 100,
              period_start: '2026-08-01',
              period_end: '2026-08-31',
              status: 'ACTIVE',
              created_at: '2026-08-01T00:00:00.000Z',
              updated_at: '2026-08-01T00:00:00.000Z',
              created_by: 'author-1',
              updated_by: 'author-1',
            },
          ],
          error: null,
        }),
      }
    }
    return {
      select: () => chain({ data: null, error: null }),
    }
  })
})

describe('GET /api/intelligence/performance goal surface', () => {
  it('serializes goal trajectories without audit fields', async () => {
    const res = await GET(new NextRequest('http://localhost/api/intelligence/performance'))
    expect(res.status).toBe(200)
    const payload = await res.json()
    expect(JSON.stringify(payload)).not.toContain('created_by')
    expect(JSON.stringify(payload)).not.toContain('updated_by')
    expect(JSON.stringify(payload)).not.toContain('AT_RISK')
    expect(payload.goalTrajectories).toBeDefined()
    expect(payload.goalTrajectories.some((g: { goalId: string | null; metricKey: string }) => g.goalId === 'goal-1' && g.metricKey === 'visits')).toBe(true)
  })
})
