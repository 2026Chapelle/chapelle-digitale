import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  schema: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
  insertResult: vi.fn(),
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

import { POST } from './route'

const dayId = '123e4567-e89b-42d3-a456-426614174000'

function request() {
  const form = new FormData()
  form.set(
    'file',
    new File(['%PDF-1.7\nexample content'], 'guide.pdf', {
      type: 'application/pdf',
    }),
  )
  form.set('dayId', dayId)
  form.set('title', 'Guide de prière')

  return new NextRequest(
    'https://example.test/api/admin/mahanaim/resources/upload',
    { method: 'POST', body: form },
  )
}

function readableRow(row: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

describe('Mahanaïm - intégrité du téléversement PDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAdmin.mockReturnValue(true)

    const retreat = readableRow({ id: 'retreat-test' })
    const day = readableRow({ id: dayId })

    mocks.insertResult.mockResolvedValue({
      data: { id: 'pdf-test', title: 'Guide de prière' },
      error: null,
    })

    const insertQuery = {
      select: vi.fn(),
      single: mocks.insertResult,
    }
    insertQuery.select.mockReturnValue(insertQuery)
    mocks.insert.mockReturnValue(insertQuery)

    mocks.schema.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'mahanaim_retreats') return retreat
        if (table === 'mahanaim_retreat_days') return day
        if (table === 'mahanaim_day_resources') {
          return { insert: mocks.insert }
        }
        throw new Error(`Table inattendue : ${table}`)
      }),
    })

    mocks.upload.mockResolvedValue({ error: null })
    mocks.remove.mockResolvedValue({ data: [], error: null })

    mocks.storageFrom.mockReturnValue({
      upload: mocks.upload,
      remove: mocks.remove,
    })
  })

  it('enregistre un PDF valide dans le stockage privé et la base', async () => {
    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.ok).toBe(true)
    expect(mocks.upload).toHaveBeenCalledOnce()

    const [path, buffer, options] = mocks.upload.mock.calls[0]

    expect(path).toMatch(
      new RegExp(`^mahanaim/chambre-haute-2026/${dayId}/[a-f0-9-]+\\.pdf$`),
    )
    expect(Buffer.from(buffer).subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(options).toMatchObject({
      contentType: 'application/pdf',
      upsert: false,
    })
    expect(mocks.storageFrom).toHaveBeenCalledWith('documents')
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        day_id: dayId,
        resource_type: 'pdf',
        storage_path: path,
        resource_url: null,
      }),
    )
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('supprime le fichier téléversé si la base refuse son enregistrement', async () => {
    mocks.insertResult.mockResolvedValueOnce({
      data: null,
      error: { message: 'database insert failed' },
    })

    const response = await POST(request())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.ok).toBe(false)
    expect(mocks.upload).toHaveBeenCalledOnce()

    const path = mocks.upload.mock.calls[0][0]
    expect(mocks.remove).toHaveBeenCalledWith([path])
  })
})