import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  isAdmin: vi.fn(),
  schema: vi.fn(),
  storageFrom: vi.fn(),
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
const endpoint = 'https://example.test/api/admin/mahanaim/resources/upload'

function uploadRequest(
  content: string,
  type = 'application/pdf',
  overrideDayId = dayId,
) {
  const form = new FormData()
  form.set('file', new File([content], 'document.pdf', { type }))
  form.set('dayId', overrideDayId)
  form.set('title', 'Guide de priere')

  return new NextRequest(endpoint, { method: 'POST', body: form })
}

describe('Mahanaim - PDF upload security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isAdmin.mockReturnValue(true)
  })

  it('refuse les visiteurs non administrateurs sans acceder a Supabase', async () => {
    mocks.isAdmin.mockReturnValue(false)

    const response = await POST(uploadRequest('%PDF-1.7'))

    expect(response.status).toBe(401)
    expect(mocks.schema).not.toHaveBeenCalled()
    expect(mocks.storageFrom).not.toHaveBeenCalled()
  })

  it('refuse les identifiants de journee invalides', async () => {
    const response = await POST(uploadRequest('%PDF-1.7', 'application/pdf', 'invalid-day'))

    expect(response.status).toBe(400)
    expect(mocks.schema).not.toHaveBeenCalled()
    expect(mocks.storageFrom).not.toHaveBeenCalled()
  })

  it('refuse les fichiers dont le type MIME n est pas PDF', async () => {
    const response = await POST(uploadRequest('text document', 'text/plain'))

    expect(response.status).toBe(415)
    expect(mocks.schema).not.toHaveBeenCalled()
    expect(mocks.storageFrom).not.toHaveBeenCalled()
  })

  it('refuse un faux PDF malgre le type MIME annonce', async () => {
    const response = await POST(uploadRequest('This is not a PDF'))

    expect(response.status).toBe(422)
    expect(mocks.schema).not.toHaveBeenCalled()
    expect(mocks.storageFrom).not.toHaveBeenCalled()
  })
})