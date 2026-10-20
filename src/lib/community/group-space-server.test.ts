import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  resolveMyPays: vi.fn(),
  resolveGroupScope: vi.fn(),
  canScopeManageGroup: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mocks.from },
}))
vi.mock('./groups-server', () => ({
  resolveMyPays: mocks.resolveMyPays,
}))
vi.mock('@/lib/group-scope', () => ({
  resolveGroupScope: mocks.resolveGroupScope,
}))
vi.mock('./groups-access', () => ({
  canScopeManageGroup: mocks.canScopeManageGroup,
}))

import {
  getGroupSpaceAccess,
  listGroupPosts,
  createGroupPost,
  moderateGroupPost,
  withdrawGroupPost,
} from './group-space-server'

const groupId = '11111111-1111-4111-8111-111111111111'
const otherGroupId = '22222222-2222-4222-8222-222222222222'
const session = { uid: 'member-1', role: 'membre' }
const published = {
  id: 'post-1', groupe_id: groupId, author_id: 'other',
  kind: 'priere', title: 'Familles', body: 'Prions ensemble.',
  state: 'publie', visibility: 'groupe', consent: false,
}

function query(data: unknown, error: unknown = null) {
  const result = { data, error }
  const q: any = {}
  for (const method of ['select', 'eq', 'in', 'or', 'order', 'limit', 'insert', 'update']) {
    q[method] = vi.fn(() => q)
  }
  q.maybeSingle = vi.fn(async () => result)
  q.single = vi.fn(async () => result)
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
  return q
}

function access(member: unknown = { statut: 'actif', role: 'membre' }) {
  mocks.from.mockReturnValueOnce(query({ id: groupId, statut: 'actif' }))
  mocks.from.mockReturnValueOnce(query(member))
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.resolveMyPays.mockResolvedValue([])
  mocks.resolveGroupScope.mockReturnValue('denied')
  mocks.canScopeManageGroup.mockReturnValue(false)
})

describe('group space server access', () => {
  it('resolves active membership for the requested group', async () => {
    access()
    const actor = await getGroupSpaceAccess(session, groupId)
    expect(actor.activeMember).toBe(true)
    expect(actor.manager).toBe(false)
    expect(actor.groupId).toBe(groupId)
  })

  it('refuses a non-member', async () => {
    access(null)
    await expect(getGroupSpaceAccess(session, groupId)).rejects.toMatchObject({ status: 403 })
  })

  it('refuses an inactive group', async () => {
    mocks.from.mockReturnValueOnce(query({ id: groupId, statut: 'inactif' }))
    await expect(getGroupSpaceAccess(session, groupId)).rejects.toMatchObject({ status: 403 })
  })

  it('recognizes an active co-leader', async () => {
    access({ statut: 'actif', role: 'co-leader' })
    expect((await getGroupSpaceAccess(session, groupId)).manager).toBe(true)
  })

  it('does not grant leadership to an inactive membership', async () => {
    access({ statut: 'inactif', role: 'leader' })
    await expect(getGroupSpaceAccess(session, groupId)).rejects.toMatchObject({ status: 403 })
  })

  it('fails closed on a database error', async () => {
    mocks.from.mockReturnValueOnce(query(null, { message: 'private database detail' }))
    await expect(getGroupSpaceAccess(session, groupId)).rejects.toMatchObject({ status: 500 })
  })
})

describe('group space server content', () => {
  it('filters confidential and pending content of other members', async () => {
    access()
    mocks.from.mockReturnValueOnce(query([
      published,
      { ...published, id: 'secret', visibility: 'responsables' },
      { ...published, id: 'pending', state: 'en_attente' },
    ]))
    const posts = await listGroupPosts(session, groupId)
    expect(posts.map((p: any) => p.id)).toEqual(['post-1'])
  })

  it('rejects a member trying to publish an announcement', async () => {
    access()
    await expect(createGroupPost(session, groupId, {
      kind: 'annonce', title: 'Annonce', body: 'Texte', visibility: 'groupe',
    })).rejects.toMatchObject({ status: 403 })
  })

  it('derives author and pending status from the session and permissions', async () => {
    access()
    const write = query({ ...published, author_id: session.uid, state: 'en_attente' })
    mocks.from.mockReturnValueOnce(write)
    await createGroupPost(session, groupId, {
      kind: 'priere', title: 'Familles', body: 'Prions ensemble.',
      visibility: 'groupe', author_id: 'forged', state: 'publie',
    })
    expect(write.insert).toHaveBeenCalledWith(expect.objectContaining({
      groupe_id: groupId, author_id: session.uid, state: 'en_attente',
    }))
  })

  it('rechecks membership before each operation', async () => {
    access(null)
    await expect(listGroupPosts(session, groupId)).rejects.toMatchObject({ status: 403 })
    expect(mocks.from).not.toHaveBeenCalledWith('group_space_posts')
  })

  it('denies moderation to an ordinary member', async () => {
    access()
    await expect(moderateGroupPost(session, groupId, 'post-1', 'publie'))
      .rejects.toMatchObject({ status: 403 })
  })

  it('refuses withdrawal of another members post', async () => {
    access()
    mocks.from.mockReturnValueOnce(query(published))
    await expect(withdrawGroupPost(session, groupId, 'post-1'))
      .rejects.toMatchObject({ status: 403 })
  })

  it('refuses a post belonging to another group', async () => {
    access()
    mocks.from.mockReturnValueOnce(query({
      ...published, groupe_id: otherGroupId, author_id: session.uid,
    }))
    await expect(withdrawGroupPost(session, groupId, 'post-1'))
      .rejects.toMatchObject({ status: 403 })
  })
})