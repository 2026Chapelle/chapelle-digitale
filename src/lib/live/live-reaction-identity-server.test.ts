import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), cookies: vi.fn(), headers: vi.fn(), demo: false }))
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: mocks.cookies, headers: mocks.headers }))
vi.mock('@/lib/supabase-server', () => ({ createRouteClient: () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock('@/lib/member-auth', () => ({ getVerifiedRouteProfile: mocks.profile }))
vi.mock('@/lib/supabase', () => ({ get IS_DEMO_MODE() { return mocks.demo } }))
import { resolveLiveReactionActor } from './live-reaction-identity-server'
const GUEST = '11111111-1111-4111-8111-111111111111'
describe('LIVE 4B.2 reaction server identity', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.demo = false; mocks.cookies.mockReturnValue({ getAll: () => [] }); mocks.headers.mockReturnValue({ get: () => null }); mocks.getUser.mockResolvedValue({ data: { user: null }, error: null }); mocks.profile.mockResolvedValue(null) })
  it('uses verified matching members, otherwise only valid guests, without leaking raw actor input', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'member-1' } }, error: null }); mocks.profile.mockResolvedValue({ uid: 'member-1' })
    await expect(resolveLiveReactionActor()).resolves.toEqual({ ok: true, actorKey: 'member:member-1' })
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null }); mocks.profile.mockResolvedValue(null)
    await expect(resolveLiveReactionActor(GUEST.toUpperCase())).resolves.toEqual({ ok: true, actorKey: expect.stringMatching(/^guest:[0-9a-f]{64}$/) })
    await expect(resolveLiveReactionActor('invalid')).resolves.toEqual({ ok: false, reason: 'identity_required' })
  })
  it('fails closed for presented invalid sessions, auth failures, profile mismatch and demo mode', async () => {
    mocks.cookies.mockReturnValue({ getAll: () => [{ name: 'sb-nvyuyffywnuollaxguen-auth-token' }] })
    await expect(resolveLiveReactionActor(GUEST)).resolves.toEqual({ ok: false, reason: 'identity_required' })
    mocks.cookies.mockReturnValue({ getAll: () => [] }); mocks.headers.mockReturnValue({ get: (name: string) => name === 'authorization' ? 'Bearer unverified' : null })
    await expect(resolveLiveReactionActor(GUEST)).resolves.toEqual({ ok: false, reason: 'identity_required' })
    mocks.getUser.mockRejectedValue(new Error('network')); await expect(resolveLiveReactionActor(GUEST)).resolves.toEqual({ ok: false, reason: 'unavailable' })
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'a' } }, error: null }); mocks.profile.mockResolvedValue({ uid: 'b' }); await expect(resolveLiveReactionActor()).resolves.toEqual({ ok: false, reason: 'unavailable' })
    mocks.demo = true; await expect(resolveLiveReactionActor(GUEST)).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })
})
