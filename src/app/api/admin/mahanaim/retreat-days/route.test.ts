import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { isAdminRequest, from, retreatQuery, daysQuery, update } = vi.hoisted(() => {
  const isAdminRequest = vi.fn()
  const update = vi.fn()
  const retreatQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }
  const daysQuery = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), update, maybeSingle: vi.fn(), single: vi.fn() }
  const from = vi.fn((table: string) => {
    if (table === 'mahanaim_retreats') return retreatQuery
    if (table === 'mahanaim_retreat_days') return daysQuery
    throw new Error(`Unexpected table ${table}`)
  })
  return { isAdminRequest, from, retreatQuery, daysQuery, update }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { schema: () => ({ from }) } }))

import { GET, PATCH } from './route'

const day = {
  id: '11111111-1111-4111-8111-111111111111',
  retreat_id: '22222222-2222-4222-8222-222222222222',
  day_number: 1,
  day_date: '2026-10-10',
  title: 'Jour 1',
  scripture_reference: null,
  scripture_text: null,
  meditation: null,
  objective: null,
  prayers: [],
  declarations: [],
  action: null,
  status: 'scheduled',
}

function request() { return new NextRequest('http://localhost/api/admin/mahanaim/retreat-days') }
function patchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/mahanaim/retreat-days', {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequest.mockReturnValue(true)
  retreatQuery.select.mockReturnValue(retreatQuery)
  retreatQuery.eq.mockReturnValue(retreatQuery)
  retreatQuery.maybeSingle.mockResolvedValue({ data: { id: day.retreat_id }, error: null })
  daysQuery.select.mockReturnValue(daysQuery)
  daysQuery.eq.mockReturnValue(daysQuery)
  daysQuery.order.mockResolvedValue({ data: [day], error: null })
  daysQuery.maybeSingle.mockResolvedValue({ data: day, error: null })
  daysQuery.single.mockResolvedValue({ data: day, error: null })
  update.mockReturnValue(daysQuery)
})

describe('Mahanaïm retreat day admin API', () => {
  it('requires administrator access for reads', async () => {
    isAdminRequest.mockReturnValue(false)
    const response = await GET(request())
    expect(response.status).toBe(401)
    expect(from).not.toHaveBeenCalled()
  })

  it('loads only existing days for the fixed retreat', async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, data: [day] })
    expect(retreatQuery.eq).toHaveBeenCalledWith('slug', 'chambre-haute-2026')
    expect(daysQuery.eq).toHaveBeenCalledWith('retreat_id', day.retreat_id)
  })

  it('requires administrator access for writes', async () => {
    isAdminRequest.mockReturnValue(false)
    const response = await PATCH(patchRequest({ id: day.id, title: 'Nouveau titre' }))
    expect(response.status).toBe(401)
    expect(update).not.toHaveBeenCalled()
  })

  it('saves only submitted fields and returns the persisted row', async () => {
    const response = await PATCH(patchRequest({ id: day.id, title: 'Brouillon du jour 1' }))
    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith({ title: 'Brouillon du jour 1' })
    expect(daysQuery.eq).toHaveBeenCalledWith('id', day.id)
    expect(await response.json()).toMatchObject({ ok: true, data: day })
  })

  it('validates prayer and declaration JSONB lists', async () => {
    const response = await PATCH(patchRequest({ id: day.id, prayers: ['Prière valide', 7] }))
    expect(response.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('allows an empty title draft without writing null to the required column', async () => {
    const response = await PATCH(patchRequest({ id: day.id, title: '   ' }))
    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith({ title: '' })
  })

  it('rejects status and identity fields', async () => {
    const response = await PATCH(patchRequest({ id: day.id, status: 'available' }))
    expect(response.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('reports database write failures', async () => {
    daysQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'database unavailable' } })
    const response = await PATCH(patchRequest({ id: day.id, action: 'Prier' }))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ ok: false })
  })
})
