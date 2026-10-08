import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  schema: vi.fn(),
  storageFrom: vi.fn(),
  remove: vi.fn(),
  deleteResource: vi.fn(),
  deleteResult: vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  isAdminRequest: mocks.isAdmin,
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    schema: mocks.schema,
    storage: { from: mocks.storageFrom },
  },
}))

import { DELETE } from './route'

const dayId = '123e4567-e89b-42d3-a456-426614174000'
const resourceId = '123e4567-e89b-42d3-a456-426614174001'
const path = `mahanaim/chambre-haute-2026/${dayId}/example.pdf`

function request() {
  return new NextRequest(
    'https://example.test/api/admin/mahanaim/resources',
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayId, resourceId }),
    },
  )
}

function singleRow(data: unknown) {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  }
  q.select.mockReturnValue(q)
  q.eq.mockReturnValue(q)
  return q
}

describe('Mahanaïm - suppression PDF privé', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAdmin.mockReturnValue(true)

    const retreat = singleRow({ id: 'retreat-test' })
    const day = singleRow({ id: dayId })
    const resource = singleRow({
      id: resourceId,
      day_id: dayId,
      resource_type: 'pdf',
      storage_path: path,
    })

    mocks.deleteResult.mockResolvedValue({
      data: { id: resourceId },
      error: null,
    })

    const del = {
      eq: vi.fn(),
      select: vi.fn(),
      maybeSingle: mocks.deleteResult,
    }
    del.eq.mockReturnValue(del)
    del.select.mockReturnValue(del)
    mocks.deleteResource.mockReturnValue(del)

    mocks.schema.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'mahanaim_retreats') return retreat
        if (table === 'mahanaim_retreat_days') return day
        if (table === 'mahanaim_day_resources') {
          return {
            select: resource.select,
            delete: mocks.deleteResource,
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    mocks.remove.mockResolvedValue({ error: null })
    mocks.storageFrom.mockReturnValue({ remove: mocks.remove })
  })

  it('supprime la référence puis le fichier privé', async () => {
    const response = await DELETE(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      ok: true,
      cleanupRequired: false,
    })
    expect(mocks.deleteResource).toHaveBeenCalledOnce()
    expect(mocks.remove).toHaveBeenCalledWith([path])

    const deleteOrder = mocks.deleteResult.mock.invocationCallOrder[0]
    const storageOrder = mocks.remove.mock.invocationCallOrder[0]
    expect(deleteOrder).toBeLessThan(storageOrder)
  })

  it('signale un nettoyage nécessaire si Storage échoue', async () => {
    mocks.remove.mockResolvedValueOnce({
      error: { message: 'Storage unavailable' },
    })

    const response = await DELETE(request())
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(body).toMatchObject({
      ok: true,
      cleanupRequired: true,
    })
    expect(mocks.deleteResource).toHaveBeenCalledOnce()
    expect(mocks.remove).toHaveBeenCalledWith([path])
  })

  it('refuse un visiteur non administrateur', async () => {
    mocks.isAdmin.mockReturnValue(false)

    const response = await DELETE(request())

    expect(response.status).toBe(401)
    expect(mocks.schema).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})