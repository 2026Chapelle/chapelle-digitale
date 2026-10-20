import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  access: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  moderate: vi.fn(),
  withdraw: vi.fn(),
}))

vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile: mocks.auth,
}))
vi.mock('@/lib/community/group-space-server', () => ({
  getGroupSpaceAccess: mocks.access,
  listGroupPosts: mocks.list,
  createGroupPost: mocks.create,
  moderateGroupPost: mocks.moderate,
  withdrawGroupPost: mocks.withdraw,
}))

import { GET, POST } from './route'

const id = '11111111-1111-4111-8111-111111111111'
const postId = '22222222-2222-4222-8222-222222222222'
const session = { uid: 'member-1', role: 'membre' }
const context = () => ({ params: Promise.resolve({ id }) })
const request = (body: unknown) => new NextRequest(
  `https://citadelle.example/api/member/groupes/${id}/espace`,
  {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://citadelle.example',
    },
    body: JSON.stringify(body),
  },
)
const getRequest = () => new NextRequest(
  `https://citadelle.example/api/member/groupes/${id}/espace`,
)

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'test')
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue(session)
  mocks.access.mockResolvedValue({
    group: { id, nom: 'Batisseurs' },
    uid: session.uid,
    manager: false,
    activeMember: true,
    activeGroup: true,
  })
  mocks.list.mockResolvedValue([])
})

describe('private group space API', () => {
  it('requires authentication for GET', async () => {
    mocks.auth.mockResolvedValue(null)
    const response = await GET(getRequest(), context())
    expect(response.status).toBe(401)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('requires authentication for POST', async () => {
    mocks.auth.mockResolvedValue(null)
    expect((await POST(request({ action: 'create' }), context())).status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns authorized contents with no-store caching', async () => {
    const response = await GET(getRequest(), context())
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    const json = await response.json()
    expect(json.data.posts).toEqual([])
    expect(json.data.group.id).toBe(id)
    expect(json.data.permissions.manage).toBe(false)
  })

  it('denies access without exposing contents', async () => {
    mocks.access.mockRejectedValue({ status: 403, message: 'Acces refuse.' })
    expect((await GET(getRequest(), context())).status).toBe(403)
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('uses the verified session and URL group for creation', async () => {
    mocks.create.mockResolvedValue({ id: postId })
    const response = await POST(request({
      action: 'create',
      groupe_id: 'forged-group',
      author_id: 'forged-author',
      kind: 'priere',
      title: 'Priere',
      body: 'Texte',
      visibility: 'groupe',
    }), context())
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith(session, id, expect.objectContaining({
      kind: 'priere', title: 'Priere',
    }))
  })

  it('rejects unknown actions', async () => {
    expect((await POST(request({ action: 'delete_all' }), context())).status).toBe(400)
  })

  it('requires a valid post UUID for moderation', async () => {
    expect((await POST(request({
      action: 'moderate', post_id: 'invalid', decision: 'publie',
    }), context())).status).toBe(400)
    expect(mocks.moderate).not.toHaveBeenCalled()
  })

  it('delegates moderation to the scoped service', async () => {
    mocks.moderate.mockResolvedValue({ id: postId })
    expect((await POST(request({
      action: 'moderate', post_id: postId, decision: 'publie',
    }), context())).status).toBe(200)
    expect(mocks.moderate).toHaveBeenCalledWith(session, id, postId, 'publie')
  })

  it('delegates author withdrawal to the scoped service', async () => {
    mocks.withdraw.mockResolvedValue(undefined)
    expect((await POST(request({
      action: 'withdraw', post_id: postId,
    }), context())).status).toBe(200)
    expect(mocks.withdraw).toHaveBeenCalledWith(session, id, postId)
  })

  it('does not expose unexpected server error details', async () => {
    mocks.list.mockRejectedValue(new Error('private database details'))
    const response = await GET(getRequest(), context())
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('private database details')
  })

  it('rejects cross-origin submissions', async () => {
    const req = request({ action: 'create' })
    req.headers.set('origin', 'https://another.example')
    expect((await POST(req, context())).status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
describe('Passenger production origin', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    mocks.create.mockResolvedValue({ id: postId })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  function proxyRequest(origin: string | null, fetchSite = 'same-origin') {
    const req = new NextRequest(
      `http://127.0.0.1:3000/api/member/groupes/${id}/espace`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'sec-fetch-site': fetchSite,
          'x-forwarded-host': 'citadelle.chapelleduroyaume.org',
          'x-forwarded-proto': 'https',
        },
        body: JSON.stringify({
          action: 'create',
          kind: 'priere',
          title: 'Priere',
          body: 'Texte',
          visibility: 'responsables',
        }),
      },
    )
    if (origin !== null) req.headers.set('origin', origin)
    return req
  }

  it('accepts the exact public origin behind an internal proxy URL', async () => {
    const response = await POST(proxyRequest(
      'https://citadelle.chapelleduroyaume.org',
    ), context())
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledOnce()
  })

  it.each([
    null,
    'null',
    'https://another.example',
    'http://citadelle.chapelleduroyaume.org',
    'https://citadelle.chapelleduroyaume.org.evil.example',
    'https://citadelle.chapelleduroyaume.org:444',
    'http://127.0.0.1:3000',
  ])('rejects an untrusted or missing origin: %s', async (origin) => {
    const response = await POST(proxyRequest(origin), context())
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects cross-site fetch metadata even with the public origin', async () => {
    const response = await POST(proxyRequest(
      'https://citadelle.chapelleduroyaume.org', 'cross-site',
    ), context())
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('does not trust forged forwarded host headers', async () => {
    const req = proxyRequest('https://another.example')
    req.headers.set('x-forwarded-host', 'another.example')
    expect((await POST(req, context())).status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})