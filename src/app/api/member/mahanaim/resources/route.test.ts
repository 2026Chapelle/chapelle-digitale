import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { getMemberRetreatBySlug, from, query, storageFrom } = vi.hoisted(() => {
  const getMemberRetreatBySlug = vi.fn()
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn() }
  const from = vi.fn(() => query)
  const storageFrom = vi.fn(() => ({ createSignedUrl: vi.fn() }))
  return { getMemberRetreatBySlug, from, query, storageFrom }
})

vi.mock('@/lib/mahanaim/member-retreats-server', () => ({ getMemberRetreatBySlug }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { schema: () => ({ from }), storage: { from: storageFrom } } }))

import { GET } from './route'

const dayId = '11111111-1111-4111-8111-111111111111'
const resourceId = '33333333-3333-4333-8333-333333333333'
function request(extra = '') { return new NextRequest(`http://localhost/api/member/mahanaim/resources?dayId=${dayId}${extra}`) }

beforeEach(() => {
  vi.clearAllMocks()
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockResolvedValue({ data: [], error: null })
})

describe('Mahanaïm member media access', () => {
  it('refuses anonymous members before resource storage is queried', async () => {
    getMemberRetreatBySlug.mockResolvedValue({ status: 'identity_required' })
    expect((await GET(request())).status).toBe(401)
    expect(from).not.toHaveBeenCalled()
  })

  it('refuses a locked day before resource storage is queried', async () => {
    getMemberRetreatBySlug.mockResolvedValue({ status: 'ok', retreat: { enrolled: true, days: [{ id: dayId, isUnlocked: false }] } })
    expect((await GET(request())).status).toBe(403)
    expect(from).not.toHaveBeenCalled()
  })

  it('does not sign a depublished PDF that is absent from the resource list', async () => {
    getMemberRetreatBySlug.mockResolvedValue({ status: 'ok', retreat: { enrolled: true, days: [{ id: dayId, isUnlocked: true }] } })
    const response = await GET(request(`&resourceId=${resourceId}`))
    expect(response.status).toBe(404)
    expect(storageFrom).not.toHaveBeenCalled()
  })

  it('does not expose unrecognized resource types to an eligible member', async () => {
    getMemberRetreatBySlug.mockResolvedValue({ status: 'ok', retreat: { enrolled: true, days: [{ id: dayId, isUnlocked: true }] } })
    query.order.mockResolvedValueOnce({ data: [{ id: resourceId, resource_type: 'link', session_type: null, title: 'Unexpected', resource_url: 'https://example.test', storage_path: null, scheduled_time: null, position: 1 }], error: null })
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect((await response.json()).data).toEqual([])
  })
})
