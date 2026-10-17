import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PDFDocument } from 'pdf-lib'

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }))
vi.mock('@/lib/mahanaim/member-retreats-server', () => ({ getMemberRetreatBySlug: lookup }))

import { GET } from './route'

const dayId = '11111111-1111-4111-8111-111111111111'
const url = `http://localhost/api/member/mahanaim/carnet?dayId=${dayId}`
const day = {
  id: dayId, dayNumber: 1, dayDate: '2026-10-10',
  title: 'Montez dans la Chambre Haute', scriptureReference: 'Actes 1:8',
  isUnlocked: true,
  content: {
    scriptureText: 'Vous recevrez une puissance',
    objective: 'Prier ensemble', meditation: 'Le Seigneur nous conduit.',
    prayers: ['Seigneur, fortifie-moi'],
    declarations: ['Je marche par la foi'], action: 'Lire Actes 1',
  },
}
const retreat = { enrolled: true, days: [day] }

beforeEach(() => {
  vi.clearAllMocks()
  lookup.mockResolvedValue({ status: 'ok', retreat })
})

describe('MAHANAIM generated carnet download', () => {
  it('rejects unauthenticated visitors', async () => {
    lookup.mockResolvedValue({ status: 'identity_required' })
    const res = await GET(new NextRequest(url))
    expect(res.status).toBe(401)
  })

  it('rejects members who are not enrolled', async () => {
    lookup.mockResolvedValue({ status: 'ok', retreat: { ...retreat, enrolled: false } })
    const res = await GET(new NextRequest(url))
    expect(res.status).toBe(403)
  })

  it('rejects locked days', async () => {
    lookup.mockResolvedValue({ status: 'ok', retreat: { ...retreat, days: [{ ...day, isUnlocked: false }] } })
    const res = await GET(new NextRequest(url))
    expect(res.status).toBe(404)
  })

  it('returns a readable downloadable PDF for an enrolled member', async () => {
    const res = await GET(new NextRequest(url))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toContain('attachment;')
    expect(res.headers.get('cache-control')).toContain('no-store')
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    const parsed = await PDFDocument.load(bytes)
    expect(parsed.getPageCount()).toBeGreaterThan(0)
  })
})
