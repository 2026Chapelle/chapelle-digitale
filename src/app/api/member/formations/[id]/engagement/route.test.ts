import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getSessionProfile: vi.fn(),
  from: vi.fn(),
  schema: vi.fn(),
  chapelleFrom: vi.fn(),
  memberAuthUserEq: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/member-auth', () => ({ getSessionProfile: mocks.getSessionProfile }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from, schema: mocks.schema } }))

import { POST } from './route'

const user = {
  uid: '11111111-1111-4111-8111-111111111111',
  role: 'membre',
  email: 'sentinelle@example.test',
  profile: { prenom: 'Anne', nom: 'Veilleuse', email: 'sentinelle@example.test' },
}

function request(body: Record<string, unknown>) {
  return new NextRequest('https://citadelle.test/api/member/formations/formation-1/engagement', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

function params() { return { params: Promise.resolve({ id: 'formation-1' }) } }
async function bodyOf(response: Response) { return response.clone().json() }

describe('POST /api/member/formations/[id]/engagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionProfile.mockResolvedValue(user)
    mocks.memberAuthUserEq.mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'chapelle-member-1' }, error: null }) })
    mocks.from.mockImplementation((table: string) => queryFor(table, { complete: true }))
    mocks.chapelleFrom.mockImplementation((table: string) => queryFor(table, { complete: true }))
    mocks.schema.mockReturnValue({ from: mocks.chapelleFrom })
  })

  it('rejects an unauthenticated request before reading or writing data', async () => {
    mocks.getSessionProfile.mockResolvedValue(null)
    const response = await POST(request({ declaration: 'I watch.', consent: true }), params())
    const body = await bodyOf(response)

    expect(response.status, JSON.stringify(body)).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.schema).not.toHaveBeenCalled()
  })

  it('records six completed modules using the server member identity', async () => {
    const insert = successfulInsert('I watch.')
    mocks.chapelleFrom.mockImplementation((table: string) => table === 'form_submissions' ? { insert } : queryFor(table, { complete: true }))

    const response = await POST(request({ declaration: 'I watch.', consent: true, member_id: 'attacker-selected-member' }), params())
    const body = await bodyOf(response)

    expect(response.status, JSON.stringify(body)).toBe(200)
    expect(body).toMatchObject({ ok: true, data: { declaration: 'I watch.' } })
    expect(mocks.schema).toHaveBeenCalledWith('chapelle')
    expect(mocks.chapelleFrom).toHaveBeenCalledWith('members')
    expect(mocks.memberAuthUserEq).toHaveBeenCalledWith('auth_user_id', user.uid)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ member_id: 'chapelle-member-1' }))
  })

  it('refuses before six modules without writing an engagement', async () => {
    mocks.from.mockImplementation((table: string) => queryFor(table, { complete: false }))
    mocks.chapelleFrom.mockImplementation((table: string) => queryFor(table, { complete: false }))

    const response = await POST(request({ declaration: 'I watch.', consent: true }), params())
    const body = await bodyOf(response)

    expect(response.status, JSON.stringify(body)).toBe(403)
    expect(body).toEqual({ ok: false, message: 'Terminez les six modules avant de confirmer votre engagement.' })
    expect(mocks.schema).toHaveBeenCalledWith('chapelle')
    expect(mocks.chapelleFrom).toHaveBeenCalledWith('members')
    expect(mocks.chapelleFrom).not.toHaveBeenCalledWith('form_submissions')
  })

  it('refuses an engagement from a member who is not enrolled', async () => {
    mocks.from.mockImplementation((table: string) => queryFor(table, { complete: true, enrolled: false }))
    mocks.chapelleFrom.mockImplementation((table: string) => queryFor(table, { complete: true, enrolled: false }))

    const response = await POST(request({ declaration: 'I watch.', consent: true }), params())
    const body = await bodyOf(response)

    expect(response.status, JSON.stringify(body)).toBe(403)
    expect(body).toEqual({ ok: false, message: 'Inscrivez-vous à cette formation avant de confirmer votre engagement.' })
    expect(mocks.chapelleFrom).not.toHaveBeenCalledWith('form_submissions')
  })

  it('returns the actual insertion error after reaching insert exactly once', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
      }),
    })
    mocks.chapelleFrom.mockImplementation((table: string) => table === 'form_submissions' ? { insert } : queryFor(table, { complete: true }))

    const response = await POST(request({ declaration: 'I watch.', consent: true }), params())
    const body = await bodyOf(response)

    expect(insert).toHaveBeenCalledTimes(1)
    expect(response.status, JSON.stringify(body)).toBe(400)
    expect(body).toEqual({ ok: false, message: 'insert failed' })
  })
})

function successfulInsert(declaration: string) {
  return vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'submission-1', created_at: '2026-10-19T10:00:00.000Z', payload: { declaration } }, error: null }),
    }),
  })
}

function queryFor(table: string, options: { complete: boolean, enrolled?: boolean }) {
  const one = (data: unknown) => ({ maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) })
  const publishedIds = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']
  const completedIds = options.complete ? publishedIds : publishedIds.slice(0, 5)
  if (table === 'formations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(one({ id: 'formation-1', slug: 'ecole-des-sentinelles', titre: 'Sentinelles' })) }) }
  if (table === 'inscriptions_formation') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(one(options.enrolled === false ? null : { id: 'enrollment-1' })) }) }) }
  if (table === 'formation_modules') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: publishedIds.map((id) => ({ id })), error: null }) }) }) }
  if (table === 'module_completions') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: completedIds.map((module_id) => ({ module_id })), error: null }) }) }) }
  if (table === 'members') return { select: vi.fn().mockReturnValue({ eq: mocks.memberAuthUserEq }) }
  if (table === 'platforms') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(one({ id: 'mahanaim-1' })) }) }
  throw new Error(`Unexpected table: ${table}`)
}
