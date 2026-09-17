import { describe, expect, it, vi } from 'vitest'

import {
  LIVE_REPLAY_REACTION_POLL_MS,
  createReplayReactionIntentQueue,
  fetchReplayReactionSnapshot,
} from './live-replay-reactions-client'

describe('LIVE 4C replay reaction client', () => {
  it('polls every 15 seconds by contract', () => {
    expect(LIVE_REPLAY_REACTION_POLL_MS).toBe(15_000)
  })

  it('fetches the public snapshot without caching', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        enabled: true,
        selectedReaction: 'amen',
        counts: { amen: 2, receive: 0, glory: 1, thanks: 0 },
      }),
    })

    await expect(fetchReplayReactionSnapshot('11111111-1111-4111-8111-111111111111', fetcher as typeof fetch))
      .resolves.toEqual({
        enabled: true,
        selectedReaction: 'amen',
        counts: { amen: 2, receive: 0, glory: 1, thanks: 0 },
      })

    expect(fetcher).toHaveBeenCalledWith(
      '/api/live/replay/reactions?cmsLiveId=11111111-1111-4111-8111-111111111111',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('serializes rapid clicks and persists only the latest pending intent', async () => {
    let release!: () => void
    const first = new Promise<void>((resolve) => { release = resolve })
    const send = vi.fn()
      .mockImplementationOnce(async () => {
        await first
        return { version: 1 }
      })
      .mockResolvedValueOnce({ version: 3 })
    const confirm = vi.fn()
    const rollback = vi.fn()
    const queue = createReplayReactionIntentQueue(send, confirm, rollback)

    queue.push('amen')
    queue.push('glory')
    queue.push(null)

    expect(send).toHaveBeenCalledTimes(1)
    release()
    await queue.idle()

    expect(send.mock.calls.map(([value]) => value)).toEqual(['amen', null])
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(rollback).not.toHaveBeenCalled()
  })

  it('rolls back only when the failed intent is still latest', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('offline'))
    const confirm = vi.fn()
    const rollback = vi.fn()
    const queue = createReplayReactionIntentQueue(send, confirm, rollback)

    queue.push('thanks')
    await queue.idle()

    expect(rollback).toHaveBeenCalledOnce()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('does not roll back a failed stale intent when a newer intent exists', async () => {
    let rejectFirst!: (error: Error) => void
    const first = new Promise<never>((_, reject) => { rejectFirst = reject })
    const send = vi.fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce({ version: 2 })
    const confirm = vi.fn()
    const rollback = vi.fn()
    const queue = createReplayReactionIntentQueue(send, confirm, rollback)

    queue.push('amen')
    queue.push('glory')
    rejectFirst(new Error('offline'))
    await queue.idle()

    expect(send.mock.calls.map(([value]) => value)).toEqual(['amen', 'glory'])
    expect(rollback).not.toHaveBeenCalled()
    expect(confirm).toHaveBeenCalledOnce()
  })

  it('reports busy while an intent is in flight or pending and becomes idle afterwards', async () => {
    let release!: () => void
    const wait = new Promise<void>((resolve) => { release = resolve })
    const queue = createReplayReactionIntentQueue(
      vi.fn().mockImplementation(async () => { await wait; return {} }),
      vi.fn(),
      vi.fn(),
    )

    expect(queue.isBusy()).toBe(false)
    queue.push('amen')
    expect(queue.isBusy()).toBe(true)
    release()
    await queue.idle()
    expect(queue.isBusy()).toBe(false)
  })

  it('dispose prevents later confirm or rollback callbacks', async () => {
    let release!: () => void
    const wait = new Promise<void>((resolve) => { release = resolve })
    const confirm = vi.fn()
    const rollback = vi.fn()
    const queue = createReplayReactionIntentQueue(
      vi.fn().mockImplementation(async () => { await wait; return {} }),
      confirm,
      rollback,
    )

    queue.push('amen')
    queue.dispose()
    release()
    await queue.idle()

    expect(confirm).not.toHaveBeenCalled()
    expect(rollback).not.toHaveBeenCalled()
  })
})
