import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TodayView } from '../TodayView'

describe('today view', () => {
  it('renders at most five priorities and exposes the evidence drawer trigger', () => {
    const html = renderToStaticMarkup(
      <TodayView
        priorities={[
          { id: '1', title: 'Article du jour', band: 'FORTE' },
          { id: '2', title: 'Podcast à republier', band: 'FORTE' },
          { id: '3', title: 'Short YouTube', band: 'NORMALE' },
          { id: '4', title: 'WhatsApp rappel', band: 'NORMALE' },
          { id: '5', title: 'Facebook promotion', band: 'A_SURVEILLER' },
          { id: '6', title: 'Over-capacity item', band: 'A_SURVEILLER' },
        ]}
        watchlist={[]}
        onPrepareWeek={() => undefined}
      />,
    )

    expect(html.match(/priority-row/g)?.length).toBe(5)
    expect(html).toContain('Pourquoi ?')
    expect(html).toContain('Accepter')
    expect(html).toContain('Modifier')
    expect(html).toContain('Planifier')
    expect(html).toContain('Rejeter')
  })

  it('labels a proposed planning date as suggested and keeps committed dates planned', () => {
    const proposed = renderToStaticMarkup(
      <TodayView
        priorities={[{ id: 'proposed', title: 'Article suggéré', status: 'PROPOSED', suggestedFor: '2026-08-27' }]}
        watchlist={[]}
        onPrepareWeek={() => undefined}
      />,
    )
    const committed = renderToStaticMarkup(
      <TodayView
        priorities={[{ id: 'scheduled', title: 'Article accepté', status: 'SCHEDULED', scheduledFor: '2026-08-28' }]}
        watchlist={[]}
        onPrepareWeek={() => undefined}
      />,
    )

    expect(proposed).toContain('Suggéré le 2026-08-27')
    expect(proposed).not.toContain('Prévu le 2026-08-27')
    expect(committed).toContain('Prévu le 2026-08-28')
  })
})
