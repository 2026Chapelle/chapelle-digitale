import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const refreshEditorialIntelligence = vi.hoisted(() => vi.fn())

vi.mock('@/lib/intelligence/editorial/refresh', () => ({
  refreshEditorialIntelligence: (...args: unknown[]) => refreshEditorialIntelligence(...args),
}))

import { POST } from '../route'

function req(body: unknown, secret?: string) {
  return new NextRequest('http://localhost/api/internal/editorial/refresh', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret ? { 'x-editorial-refresh-secret': secret } : {}),
    },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.EDITORIAL_REFRESH_SECRET = 'cron-secret'
  refreshEditorialIntelligence.mockResolvedValue({ mode: 'scheduled', organizationId: 'org_01' })
})

describe('POST /api/internal/editorial/refresh', () => {
  it('rejects missing machine authentication without consulting a human session', async () => {
    const res = await POST(req({ organizationId: 'org_01' }))

    expect(res.status).toBe(401)
    expect(refreshEditorialIntelligence).not.toHaveBeenCalled()
  })

  it('delegates an authenticated server-only refresh with organization scope', async () => {
    const res = await POST(req({ organizationId: 'org_01', nowIso: '2026-08-25T10:00:00.000Z' }, 'cron-secret'))

    expect(res.status).toBe(200)
    expect(refreshEditorialIntelligence).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org_01',
      mode: 'scheduled',
      requestedBy: null,
      actor: null,
      machineAuth: { kind: 'server', authenticated: true },
    }))
  })
})
