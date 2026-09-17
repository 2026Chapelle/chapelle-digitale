import { beforeEach, describe, expect, it, vi } from 'vitest'

const CMS_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'
const MEMBER_KEY = `member:${USER_ID}`
const GUEST_KEY = `guest:${'a'.repeat(64)}`

const guest = {
  kind: 'guest' as const,
  actorKey: GUEST_KEY,
  userId: null,
  guestActorKey: GUEST_KEY,
}

const member = {
  kind: 'member' as const,
  actorKey: MEMBER_KEY,
  userId: USER_ID,
  guestActorKey: GUEST_KEY,
}

const state = vi.hoisted(() => ({
  replay: {
    data: {
      status: 'ended',
      youtube_url: 'https://www.youtube.com/watch?v=ABCDEFGHIJK',
      video_url: null,
    } as any,
    error: null as any,
  },
  settings: { data: null as any, error: null as any },
  reactions: { data: [] as any[], error: null as any },
  upsertError: null as any,
  deleteError: null as any,
  rpcError: null as any,
}))

const calls = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  upsert: vi.fn(),
  deleteEqCms: vi.fn(),
  deleteEqActor: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: calls.from,
    rpc: calls.rpc,
  },
}))

import {
  deleteReplayReaction,
  getReplayReactionSnapshot,
  putReplayReaction,
} from './live-replay-reactions-server'

function installDbMock() {
  calls.from.mockImplementation((table: string) => {
    if (table === 'cms_lives') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => state.replay),
          })),
        })),
      }
    }

    if (table === 'live_replay_reaction_settings') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => state.settings),
          })),
        })),
      }
    }

    if (table === 'live_replay_reactions') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(async () => state.reactions),
        })),
        upsert: calls.upsert,
        delete: vi.fn(() => ({
          eq: calls.deleteEqCms,
        })),
      }
    }

    throw new Error(`unexpected table ${table}`)
  })

  calls.rpc.mockImplementation(async () => ({ data: null, error: state.rpcError }))
  calls.upsert.mockImplementation(async () => ({ error: state.upsertError }))
  calls.deleteEqCms.mockImplementation((field: string, value: string) => {
    expect(field).toBe('cms_live_id')
    expect(value).toBe(CMS_ID)
    return { eq: calls.deleteEqActor }
  })
  calls.deleteEqActor.mockImplementation(async () => ({ error: state.deleteError }))
}

describe('LIVE 4C replay reaction server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.replay = {
      data: {
        status: 'ended',
        youtube_url: 'https://www.youtube.com/watch?v=ABCDEFGHIJK',
        video_url: null,
      },
      error: null,
    }
    state.settings = { data: null, error: null }
    state.reactions = { data: [], error: null }
    state.upsertError = null
    state.deleteError = null
    state.rpcError = null
    installDbMock()
  })

  it('returns four zero counts when no row exists', async () => {
    await expect(getReplayReactionSnapshot(CMS_ID, guest)).resolves.toEqual({
      ok: true,
      snapshot: {
        enabled: true,
        selectedReaction: null,
        counts: { amen: 0, receive: 0, glory: 0, thanks: 0 },
      },
    })
  })

  it('aggregates counts and returns only the current actor selection', async () => {
    state.reactions.data = [
      { actor_key: GUEST_KEY, reaction: 'amen' },
      { actor_key: 'guest:' + 'b'.repeat(64), reaction: 'amen' },
      { actor_key: 'guest:' + 'c'.repeat(64), reaction: 'receive' },
      { actor_key: 'guest:' + 'd'.repeat(64), reaction: 'glory' },
      { actor_key: 'guest:' + 'e'.repeat(64), reaction: 'thanks' },
    ]

    await expect(getReplayReactionSnapshot(CMS_ID, guest)).resolves.toEqual({
      ok: true,
      snapshot: {
        enabled: true,
        selectedReaction: 'amen',
        counts: { amen: 2, receive: 1, glory: 1, thanks: 1 },
      },
    })
  })

  it('rejects malformed, unpublished or URL-less rows as not_replay', async () => {
    await expect(getReplayReactionSnapshot('bad-id', guest)).resolves.toEqual({ ok: false, reason: 'not_replay' })

    state.replay.data = { status: 'draft', youtube_url: 'https://youtu.be/ABCDEFGHIJK', video_url: null }
    await expect(getReplayReactionSnapshot(CMS_ID, guest)).resolves.toEqual({ ok: false, reason: 'not_replay' })

    state.replay.data = { status: 'ended', youtube_url: '', video_url: null }
    await expect(getReplayReactionSnapshot(CMS_ID, guest)).resolves.toEqual({ ok: false, reason: 'not_replay' })
  })

  it('treats a missing settings row as enabled and a false row as disabled', async () => {
    state.settings.data = { enabled: false }
    await expect(getReplayReactionSnapshot(CMS_ID, guest)).resolves.toEqual({
      ok: true,
      snapshot: {
        enabled: false,
        selectedReaction: null,
        counts: { amen: 0, receive: 0, glory: 0, thanks: 0 },
      },
    })

    await expect(putReplayReaction(CMS_ID, 'amen', guest)).resolves.toEqual({ ok: false, reason: 'disabled' })
    expect(calls.upsert).not.toHaveBeenCalled()
  })

  it('upserts on cms_live_id,actor_key and injects member user_id', async () => {
    await expect(putReplayReaction(CMS_ID, 'amen', member)).resolves.toMatchObject({ ok: true })

    expect(calls.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        cms_live_id: CMS_ID,
        actor_key: MEMBER_KEY,
        user_id: USER_ID,
        reaction: 'amen',
      }),
      { onConflict: 'cms_live_id,actor_key' },
    )
  })

  it('requests atomic guest-to-member transfer before member access', async () => {
    await expect(getReplayReactionSnapshot(CMS_ID, member)).resolves.toMatchObject({ ok: true })
    expect(calls.rpc).toHaveBeenCalledWith('live_replay_reaction_transfer', {
      p_cms_live_id: CMS_ID,
      p_guest_actor_key: GUEST_KEY,
      p_user_id: USER_ID,
    })
  })

  it('does not request transfer for a guest identity', async () => {
    await getReplayReactionSnapshot(CMS_ID, guest)
    expect(calls.rpc).not.toHaveBeenCalled()
  })

  it('deletes only the current actor row', async () => {
    await expect(deleteReplayReaction(CMS_ID, guest)).resolves.toMatchObject({ ok: true })
    expect(calls.deleteEqActor).toHaveBeenCalledWith('actor_key', GUEST_KEY)
  })

  it('maps replay, settings, reaction and transfer DB failures to unavailable', async () => {
    state.replay.error = { message: 'cms failed' }
    await expect(getReplayReactionSnapshot(CMS_ID, guest)).resolves.toEqual({ ok: false, reason: 'unavailable' })

    state.replay.error = null
    state.settings.error = { message: 'settings failed' }
    await expect(getReplayReactionSnapshot(CMS_ID, guest)).resolves.toEqual({ ok: false, reason: 'unavailable' })

    state.settings.error = null
    state.reactions.error = { message: 'reactions failed' }
    await expect(getReplayReactionSnapshot(CMS_ID, guest)).resolves.toEqual({ ok: false, reason: 'unavailable' })

    state.reactions.error = null
    state.rpcError = { message: 'rpc failed' }
    await expect(getReplayReactionSnapshot(CMS_ID, member)).resolves.toEqual({ ok: false, reason: 'unavailable' })
  })
})

