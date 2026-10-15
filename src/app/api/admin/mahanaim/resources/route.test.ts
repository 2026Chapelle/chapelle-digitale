import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { isAdminRequest, from, resourcesQuery, daysQuery, retreatQuery, storageFrom, storageBucket } = vi.hoisted(() => {
  const isAdminRequest = vi.fn()
  const resourcesQuery = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), maybeSingle: vi.fn() }
  const daysQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }
  const retreatQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() }
  const storageBucket = { upload: vi.fn(), remove: vi.fn() }
  const storageFrom = vi.fn(() => storageBucket)
  const from = vi.fn((table: string) => table === 'mahanaim_retreat_days' ? daysQuery : table === 'mahanaim_retreats' ? retreatQuery : resourcesQuery)
  return { isAdminRequest, from, resourcesQuery, daysQuery, retreatQuery, storageFrom, storageBucket }
})

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin-auth', () => ({ isAdminRequest }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { schema: () => ({ from }), storage: { from: storageFrom } } }))

import { DELETE, GET, PATCH, POST } from './route'

const dayId = '11111111-1111-4111-8111-111111111111'
const resource = { id: '33333333-3333-4333-8333-333333333333', day_id: dayId, resource_type: 'video', session_type: 'morning', title: 'Matinale', resource_url: 'https://video.example/morning', storage_path: null, scheduled_time: null, position: 1 }

function request(url = `http://localhost/api/admin/mahanaim/resources?dayId=${dayId}`) { return new NextRequest(url) }
function jsonRequest(body: unknown) { return new NextRequest('http://localhost/api/admin/mahanaim/resources', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }
function patchRequest(body: unknown) { return new NextRequest('http://localhost/api/admin/mahanaim/resources', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }
function deleteRequest(body: unknown) { return new NextRequest('http://localhost/api/admin/mahanaim/resources', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }
function pdfRequest(blob: Blob) { const form = new FormData(); form.set('dayId', dayId); form.set('file', blob, 'carnet.pdf'); return new NextRequest('http://localhost/api/admin/mahanaim/resources', { method: 'POST', body: form }) }

beforeEach(() => {
  vi.clearAllMocks()
  retreatQuery.maybeSingle.mockReset()
  daysQuery.maybeSingle.mockReset()
  resourcesQuery.order.mockReset()
  resourcesQuery.maybeSingle.mockReset()
  storageBucket.upload.mockReset()
  storageBucket.remove.mockReset()
  isAdminRequest.mockReturnValue(true)
  retreatQuery.select.mockReturnValue(retreatQuery); retreatQuery.eq.mockReturnValue(retreatQuery); retreatQuery.maybeSingle.mockResolvedValue({ data: { id: '22222222-2222-4222-8222-222222222222' }, error: null })
  daysQuery.select.mockReturnValue(daysQuery); daysQuery.eq.mockReturnValue(daysQuery); daysQuery.maybeSingle.mockResolvedValue({ data: { id: dayId }, error: null })
  resourcesQuery.select.mockReturnValue(resourcesQuery); resourcesQuery.eq.mockReturnValue(resourcesQuery); resourcesQuery.order.mockResolvedValue({ data: [], error: null })
  resourcesQuery.insert.mockReturnValue(resourcesQuery); resourcesQuery.update.mockReturnValue(resourcesQuery); resourcesQuery.delete.mockReturnValue(resourcesQuery); resourcesQuery.maybeSingle.mockResolvedValue({ data: resource, error: null })
  storageBucket.upload.mockResolvedValue({ error: null }); storageBucket.remove.mockResolvedValue({ error: null })
})

describe('Mahanaïm media admin API', () => {
  it('requires admin access before reading media', async () => {
    isAdminRequest.mockReturnValue(false)
    expect((await GET(request())).status).toBe(401)
    expect(from).not.toHaveBeenCalled()
  })

  it('refuses a valid-looking day outside the Mahanaïm retreat before listing resources', async () => {
    daysQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const response = await GET(request())
    expect(response.status).toBe(404)
    expect(resourcesQuery.select).not.toHaveBeenCalled()
  })

  it('rejects an unsafe video URL before database writes', async () => {
    const response = await POST(jsonRequest({ dayId, sessionType: 'morning', videoUrl: 'http://unsafe.example/replay' }))
    expect(response.status).toBe(400)
    expect(resourcesQuery.insert).not.toHaveBeenCalled()
  })

  it('creates a morning video resource scoped to the submitted day', async () => {
    const response = await POST(jsonRequest({ dayId, sessionType: 'morning', videoUrl: 'https://video.example/replay', title: 'Matinale' }))
    expect(response.status).toBe(201)
    expect(resourcesQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ day_id: dayId, resource_type: 'video', session_type: 'morning', resource_url: 'https://video.example/replay' }))
  })

  it('replaces the existing evening video instead of creating a second slot', async () => {
    resourcesQuery.order.mockResolvedValueOnce({ data: [{ ...resource, session_type: 'evening' }], error: null })
    const response = await PATCH(patchRequest({ dayId, sessionType: 'evening', videoUrl: 'https://video.example/new-replay' }))
    expect(response.status).toBe(201)
    expect(resourcesQuery.update).toHaveBeenCalledWith(expect.objectContaining({ resource_url: 'https://video.example/new-replay', session_type: 'evening' }))
    expect(resourcesQuery.insert).not.toHaveBeenCalled()
  })

  it('depublishes only the requested resource scoped to its day', async () => {
    resourcesQuery.order.mockResolvedValueOnce({ data: [resource], error: null })
    const response = await DELETE(deleteRequest({ dayId, resourceId: resource.id }))
    expect(response.status).toBe(200)
    expect(resourcesQuery.delete).toHaveBeenCalled()
    expect(resourcesQuery.eq).toHaveBeenCalledWith('id', resource.id)
    expect(resourcesQuery.eq).toHaveBeenCalledWith('day_id', dayId)
  })

  it('refuses to depublish from a day outside the Mahanaïm retreat', async () => {
    daysQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const response = await DELETE(deleteRequest({ dayId, resourceId: resource.id }))
    expect(response.status).toBe(404)
    expect(resourcesQuery.delete).not.toHaveBeenCalled()
  })

  it('rejects a non-PDF upload before private storage is called', async () => {
    const response = await POST(pdfRequest(new Blob(['not a PDF'], { type: 'text/plain' })))
    expect(response.status).toBe(415)
    expect(storageFrom).not.toHaveBeenCalled()
  })

  it('uploads a valid PDF to a server-generated private path', async () => {
    const response = await POST(pdfRequest(new Blob(['%PDF-1.7 fixture'], { type: 'application/pdf' })))
    expect(response.status).toBe(201)
    expect(storageFrom).toHaveBeenCalledWith('documents')
    expect(storageBucket.upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^mahanaim/chambre-haute-2026/${dayId}/[0-9a-f-]{36}\\.pdf$`)), expect.any(Uint8Array), expect.objectContaining({ contentType: 'application/pdf', upsert: false }))
  })
})
