import { describe, expect, it } from 'vitest'
import { buildEditorialCalendarReadModel } from '../calendar-read-model'

describe('calendar read model', () => {
  it('projects only accepted scheduled and completed recommendations into the calendar', () => {
    const calendar = buildEditorialCalendarReadModel([
      {
        id: 'rec_01',
        status: 'PROPOSED',
        contentKind: 'article',
        targetChannel: 'facebook',
        scheduledFor: '2026-08-28',
        windowStart: '2026-08-25',
        windowEnd: '2026-08-31',
        title: 'Draft only',
        notes: 'ignore',
      },
      {
        id: 'rec_02',
        status: 'ACCEPTED',
        contentKind: 'podcast',
        targetChannel: 'whatsapp',
        scheduledFor: '2026-08-29',
        windowStart: '2026-08-25',
        windowEnd: '2026-08-31',
        title: 'Podcast',
      },
      {
        id: 'rec_03',
        status: 'SCHEDULED',
        contentKind: 'live',
        targetChannel: 'youtube',
        scheduledFor: '2026-08-30',
        windowStart: '2026-08-25',
        windowEnd: '2026-08-31',
        title: 'Live',
      },
      {
        id: 'rec_04',
        status: 'COMPLETED',
        contentKind: 'article',
        targetChannel: 'instagram',
        scheduledFor: '2026-07-01',
        windowStart: '2026-07-01',
        windowEnd: '2026-07-02',
        title: 'Old',
      },
    ])

    expect(calendar.items).toHaveLength(3)
    expect(calendar.items.map((item) => item.recommendationId)).toEqual(['rec_02', 'rec_03', 'rec_04'])
  })
})
