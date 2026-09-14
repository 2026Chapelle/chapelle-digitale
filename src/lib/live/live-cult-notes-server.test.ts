import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile: mocks.profile,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: mocks.from },
}))

const CMS_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'
const NOTE_ID = '33333333-3333-4333-8333-333333333333'

const ROW = {
  id: NOTE_ID,
  cms_live_id: CMS_ID,
  user_id: USER_ID,
  kind: 'note',
  body: 'Ma note',
  position_seconds: 42,
  scripture_reference: 'Jean 3:16',
  created_at: '2026-09-14T12:00:00.000Z',
  updated_at: '2026-09-14T12:00:00.000Z',
}

function query(data: unknown, error: unknown = null) {
  const state = {
    eq: [] as Array<[string, unknown]>,
    insert: [] as unknown[],
    update: [] as unknown[],
    deletes: 0,
  }
  const q: any = {}
  q.select = vi.fn(() => q)
  q.eq = vi.fn((key: string, value: unknown) => {
    state.eq.push([key, value])
    return q
  })
  q.insert = vi.fn((payload: unknown) => {
    state.insert.push(payload)
    return q
  })
  q.update = vi.fn((payload: unknown) => {
    state.update.push(payload)
    return q
  })
  q.delete = vi.fn(() => {
    state.deletes += 1
    return q
  })
  q.maybeSingle = vi.fn(async () => ({ data, error }))
  q.single = vi.fn(async () => ({ data, error }))
  q.then = (resolve: any, reject: any) =>
    Promise.resolve({ data, error }).then(resolve, reject)
  return { q, state }
}

let subject: Record<string, any> = {}

beforeAll(async () => {
  const path = './live-cult-notes-server'
  try {
    subject = await import(/* @vite-ignore */ path)
  } catch {
    subject = {}
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.profile.mockResolvedValue({ uid: USER_ID })
})

function fn(name: string) {
  const value = subject[name]
  if (typeof value !== 'function') {
    expect(typeof value, `${name} must exist`).toBe('function')
    return null
  }
  return value as (...args: any[]) => Promise<any>
}

describe('LIVE 4C private cult notes server', () => {
  it('requires a verified member identity', async () => {
    const list = fn('listMemberCultNotes')
    if (!list) return
    mocks.profile.mockResolvedValue(null)
    await expect(list(CMS_ID)).resolves.toEqual({
      ok: false,
      reason: 'identity_required',
    })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('lists only by current user_id and cms_live_id', async () => {
    const list = fn('listMemberCultNotes')
    if (!list) return
    const x = query([ROW])
    mocks.from.mockReturnValue(x.q)

    const result = await list(CMS_ID)

    expect(mocks.from).toHaveBeenCalledWith('live_cult_notes')
    expect(x.state.eq).toEqual(expect.arrayContaining([
      ['user_id', USER_ID],
      ['cms_live_id', CMS_ID],
    ]))
    expect(result).toEqual({
      ok: true,
      notes: [{
        id: NOTE_ID,
        cmsLiveId: CMS_ID,
        kind: 'note',
        body: 'Ma note',
        positionSeconds: 42,
        scriptureReference: 'Jean 3:16',
        createdAt: '2026-09-14T12:00:00.000Z',
        updatedAt: '2026-09-14T12:00:00.000Z',
      }],
    })
  })

  it('creates with server uid and retry-safe client UUID', async () => {
    const create = fn('createMemberCultNote')
    if (!create) return

    const lookup = query(null)
    const insert = query(ROW)
    mocks.from
      .mockReturnValueOnce(lookup.q)
      .mockReturnValueOnce(insert.q)

    const result = await create({
      id: NOTE_ID,
      cmsLiveId: CMS_ID,
      kind: 'note',
      body: 'Ma note',
      positionSeconds: 42,
      scriptureReference: 'Jean 3:16',
    })

    expect(lookup.state.eq).toEqual(expect.arrayContaining([
      ['id', NOTE_ID],
      ['user_id', USER_ID],
    ]))
    expect(insert.state.insert[0]).toMatchObject({
      id: NOTE_ID,
      cms_live_id: CMS_ID,
      user_id: USER_ID,
      kind: 'note',
      body: 'Ma note',
      position_seconds: 42,
      scripture_reference: 'Jean 3:16',
    })
    expect(result).toMatchObject({
      ok: true,
      note: { id: NOTE_ID, cmsLiveId: CMS_ID },
    })
  })

  it('returns existing owned retry-safe note without another insert', async () => {
    const create = fn('createMemberCultNote')
    if (!create) return
    const lookup = query(ROW)
    mocks.from.mockReturnValue(lookup.q)

    const result = await create({
      id: NOTE_ID,
      cmsLiveId: CMS_ID,
      kind: 'note',
      body: 'Ma note',
      positionSeconds: 42,
      scriptureReference: 'Jean 3:16',
    })

    expect(mocks.from).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      ok: true,
      note: { id: NOTE_ID, cmsLiveId: CMS_ID },
    })
  })

  it('updates only by id replay and current user', async () => {
    const update = fn('updateMemberCultNote')
    if (!update) return
    const x = query({
      ...ROW,
      kind: 'decision',
      body: 'Décision',
      scripture_reference: null,
    })
    mocks.from.mockReturnValue(x.q)

    const result = await update({
      id: NOTE_ID,
      cmsLiveId: CMS_ID,
      kind: 'decision',
      body: 'Décision',
      scriptureReference: null,
    })

    expect(x.state.eq).toEqual(expect.arrayContaining([
      ['id', NOTE_ID],
      ['cms_live_id', CMS_ID],
      ['user_id', USER_ID],
    ]))
    expect(x.state.update[0]).toEqual({
      kind: 'decision',
      body: 'Décision',
      scripture_reference: null,
    })
    expect(result).toMatchObject({
      ok: true,
      note: { id: NOTE_ID, kind: 'decision' },
    })
  })

  it('deletes only by id replay and current user', async () => {
    const remove = fn('deleteMemberCultNote')
    if (!remove) return
    const x = query({ id: NOTE_ID })
    mocks.from.mockReturnValue(x.q)

    const result = await remove(CMS_ID, NOTE_ID)

    expect(x.state.deletes).toBe(1)
    expect(x.state.eq).toEqual(expect.arrayContaining([
      ['id', NOTE_ID],
      ['cms_live_id', CMS_ID],
      ['user_id', USER_ID],
    ]))
    expect(result).toEqual({ ok: true })
  })

  it('returns not_found when own row is missing', async () => {
    const update = fn('updateMemberCultNote')
    if (!update) return
    const x = query(null)
    mocks.from.mockReturnValue(x.q)

    await expect(update({
      id: NOTE_ID,
      cmsLiveId: CMS_ID,
      body: 'Absente',
    })).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    })
  })

  it('maps Supabase error to unavailable', async () => {
    const list = fn('listMemberCultNotes')
    if (!list) return
    const x = query(null, { message: 'db down' })
    mocks.from.mockReturnValue(x.q)

    await expect(list(CMS_ID)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })
})
