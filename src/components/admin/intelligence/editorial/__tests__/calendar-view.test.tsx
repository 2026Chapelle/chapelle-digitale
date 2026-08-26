import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CalendarView } from '../CalendarView'

describe('calendar view', () => {
  it('renders only accepted scheduled and completed items inside the 30-day window', () => {
    const html = renderToStaticMarkup(
      <CalendarView
        window={{ start: '2026-08-25', end: '2026-09-24' }}
        items={[
          { id: 'rec_01', title: 'Article', status: 'ACCEPTED', channel: 'WEB', date: '2026-08-28' },
          { id: 'rec_02', title: 'Podcast', status: 'SCHEDULED', channel: 'PODCAST', date: '2026-08-29' },
          { id: 'rec_03', title: 'Live', status: 'COMPLETED', channel: 'YOUTUBE', date: '2026-08-30' },
          { id: 'rec_04', title: 'Draft only', status: 'PROPOSED', channel: 'WHATSAPP', date: '2026-08-31' },
        ]}
      />,
    )

    expect(html).toContain('ACCEPTED')
    expect(html).toContain('SCHEDULED')
    expect(html).toContain('COMPLETED')
    expect(html).not.toContain('PROPOSED')
    expect(html).toContain('date')
    expect(html).toContain('channel')
    expect(html).toContain('notes')
  })
})
