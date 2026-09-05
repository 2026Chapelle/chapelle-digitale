import { describe, expect, it } from 'vitest'
import { detectYouTubeLive } from './youtube-live'

describe('youtube live detection', () => {
  it('is fail-safe when server credentials are not configured', async () => {
    const previousKey = process.env.YOUTUBE_API_KEY
    const previousChannel = process.env.YOUTUBE_CHANNEL_ID
    delete process.env.YOUTUBE_API_KEY
    delete process.env.YOUTUBE_CHANNEL_ID
    await expect(detectYouTubeLive()).resolves.toBeNull()
    if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY
    else process.env.YOUTUBE_API_KEY = previousKey
    if (previousChannel === undefined) delete process.env.YOUTUBE_CHANNEL_ID
    else process.env.YOUTUBE_CHANNEL_ID = previousChannel
  })
})
